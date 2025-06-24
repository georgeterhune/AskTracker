// server/controllers/teamChallengeController.js

const mongoose = require('mongoose');
const TeamChallenge = require('../models/TeamChallenge');
const User = require('../models/User');
const DailyAsk = require('../models/DailyAsk');

/**
 * 1. sendTeamChallenge
 *
 * POST /api/team-challenges
 * Only managers/admins should call this. Creates a new TeamChallenge.
 */
async function sendTeamChallenge(req, res) {
    try {
        const { creatorId, teamA, teamB, metric, window, startDate } = req.body;
        if (!creatorId || !teamA || !teamB || !metric || !window) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        if (teamA === teamB) {
            return res.status(400).json({ error: 'Cannot battle the same team.' });
        }

        // Verify creator exists and has manager/admin role
        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({ error: 'Creator not found.' });
        }
        if (!['manager', 'admin'].includes(creator.role)) {
            return res.status(403).json({ error: 'Not authorized to create team battles.' });
        }

        // Compute startDate & endDate
        const start = startDate ? new Date(startDate) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + Number(window) - 1);

        // Create TeamChallenge
        const newBattle = new TeamChallenge({
            creator: creatorId,
            teamA,
            teamB,
            metric,
            window,
            startDate: start,
            endDate: end,
            status: 'Pending',
            result: { winnerTeam: null, teamAValue: 0, teamBValue: 0 },
        });
        await newBattle.save();

        return res.status(201).json(newBattle);
    } catch (err) {
        console.error('Error in sendTeamChallenge:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 2. getAllTeamChallenges
 *
 * GET /api/team-challenges
 * Returns all team battles. Managers can filter by creatorId, or any user can
 * fetch battles involving their team by passing teamName as a query param.
 */
async function getAllTeamChallenges(req, res) {
    try {
        const { creatorId, teamName } = req.query;

        let filter = {};
        if (creatorId) {
            filter.creator = creatorId;
        }
        if (teamName) {
            // Battles where either teamA OR teamB matches
            filter.$or = [{ teamA: teamName }, { teamB: teamName }];
        }
        const battles = await TeamChallenge.find(filter).sort({ createdAt: -1 });
        return res.json(battles);
    } catch (err) {
        console.error('Error in getAllTeamChallenges:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 3. activateTeamBattle
 *
 * PUT /api/team-challenges/:id/activate
 * Moves a battle from Pending → Active. Only the creator should be allowed.
 */
async function activateTeamBattle(req, res) {
    try {
        const { id } = req.params;
        const { userId } = req.body; // the user trying to activate (must match creator)

        const battle = await TeamChallenge.findById(id);
        if (!battle) {
            return res.status(404).json({ error: 'TeamChallenge not found.' });
        }
        if (String(battle.creator) !== String(userId)) {
            return res.status(403).json({ error: 'Not authorized to activate.' });
        }
        if (battle.status !== 'Pending') {
            return res.status(400).json({ error: 'Only Pending battles can be activated.' });
        }

        battle.status = 'Active';
        await battle.save();
        return res.json({ message: 'Team battle activated.' });
    } catch (err) {
        console.error('Error in activateTeamBattle:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 4. getTeamBattleProgress
 *
 * GET /api/team-challenges/:id/progress
 * Similar to 1v1, but aggregates across all users in teamA vs. teamB between
 * [startDate … today] or [startDate … endDate] if completed.
 */
async function getTeamBattleProgress(req, res) {
    try {
        const { id } = req.params;
        const battle = await TeamChallenge.findById(id);
        if (!battle) {
            return res.status(404).json({ error: 'TeamChallenge not found.' });
        }

        // Compute “today at midnight”
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Helper: aggregate metric for a given team string
        async function aggregateTeamMetric(teamName, metric, startDate, endDateCutoff) {
            // Step 1: find all users whose `team` equals teamName
            const teamMembers = await User.find({ team: teamName }, '_id');
            const memberIds = teamMembers.map((u) => String(u._id));
            if (!memberIds.length) return 0;

            // Step 2: build date window
            const windowEnd = endDateCutoff < battle.endDate ? endDateCutoff : battle.endDate;
            const toYMD = (d) => {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };
            const startStr = toYMD(battle.startDate);
            const endStr = toYMD(windowEnd);

            // Step 3: aggregate over all DailyAsk entries where userId in memberIds
            const matchStage = {
                userId: { $in: memberIds },
                date: { $gte: startStr, $lte: endStr },
            };
            const groupStage = {
                _id: null,
                totalAsks: { $sum: '$asks' },
                totalCalls: { $sum: '$totalCalls' },
                totalNcs: { $sum: '$ncsOpenUsed' },
                totalBLR: { $sum: '$blrCount' },
                totalTSR: { $sum: '$tsrCount' },
            };

            const agg = await DailyAsk.aggregate([
                { $match: matchStage },
                { $group: groupStage },
            ]);
            if (!agg.length) return 0;
            const doc = agg[0];

            switch (metric) {
                case 'askPercent':
                    return doc.totalCalls > 0 ? (doc.totalAsks / doc.totalCalls) * 100 : 0;
                case 'ncsPercent':
                    return doc.totalCalls > 0 ? (doc.totalNcs / doc.totalCalls) * 100 : 0;
                case 'blrCount':
                    return doc.totalBLR;
                case 'tsrCount':
                    return doc.totalTSR;
                default:
                    return 0;
            }
        }

        // Compute teamAValue & teamBValue up to “now”
        const [teamAValue, teamBValue] = await Promise.all([
            aggregateTeamMetric(battle.teamA, battle.metric, battle.startDate, now),
            aggregateTeamMetric(battle.teamB, battle.metric, battle.startDate, now),
        ]);

        return res.json({ teamAValue, teamBValue });
    } catch (err) {
        console.error('Error in getTeamBattleProgress:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 5. finalizeTeamBattles
 *
 * Called by a cron job (e.g. every midnight) to find all “Active” battles
 * whose `endDate ≤ today` and mark them as Completed, compute final results,
 * and award badges to all members of the winning team.
 */
async function finalizeTeamBattles() {
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // 1) Find all active battles whose endDate ≤ now
        const toFinalize = await TeamChallenge.find({
            status: 'Active',
            endDate: { $lte: now },
        });

        if (!toFinalize.length) {
            console.log(`[TeamFinalize] Nothing to finalize at ${now.toISOString()}`);
            return;
        }
        console.log(`[TeamFinalize] Found ${toFinalize.length} battle(s) to finalize.`);

        // 2) Process each battle
        for (const battle of toFinalize) {
            try {
                // (a) Aggregate final metrics for both teams
                const [finalA, finalB] = await Promise.all([
                    (async () => {
                        // Re‐use the same helper as in getTeamBattleProgress, but cap endDate to battle.endDate
                        const toYMD = (d) => {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                        };

                        // Get all members of teamA
                        const membersA = await User.find({ team: battle.teamA }, '_id');
                        const idsA = membersA.map((u) => String(u._id));
                        if (!idsA.length) return 0;

                        const startStr = toYMD(battle.startDate);
                        const endStr = toYMD(battle.endDate);

                        const matchStage = {
                            userId: { $in: idsA },
                            date: { $gte: startStr, $lte: endStr },
                        };
                        const groupStage = {
                            _id: null,
                            totalAsks: { $sum: '$asks' },
                            totalCalls: { $sum: '$totalCalls' },
                            totalNcs: { $sum: '$ncsOpenUsed' },
                            totalBLR: { $sum: '$blrCount' },
                            totalTSR: { $sum: '$tsrCount' },
                        };
                        const aggA = await DailyAsk.aggregate([
                            { $match: matchStage },
                            { $group: groupStage },
                        ]);
                        if (!aggA.length) return 0;
                        const docA = aggA[0];
                        switch (battle.metric) {
                            case 'askPercent':
                                return docA.totalCalls > 0
                                    ? (docA.totalAsks / docA.totalCalls) * 100
                                    : 0;
                            case 'ncsPercent':
                                return docA.totalCalls > 0
                                    ? (docA.totalNcs / docA.totalCalls) * 100
                                    : 0;
                            case 'blrCount':
                                return docA.totalBLR;
                            case 'tsrCount':
                                return docA.totalTSR;
                            default:
                                return 0;
                        }
                    })(),
                    (async () => {
                        // Same for teamB
                        const toYMD = (d) => {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                        };
                        const membersB = await User.find({ team: battle.teamB }, '_id');
                        const idsB = membersB.map((u) => String(u._id));
                        if (!idsB.length) return 0;
                        const startStr = toYMD(battle.startDate);
                        const endStr = toYMD(battle.endDate);

                        const matchStage = {
                            userId: { $in: idsB },
                            date: { $gte: startStr, $lte: endStr },
                        };
                        const groupStage = {
                            _id: null,
                            totalAsks: { $sum: '$asks' },
                            totalCalls: { $sum: '$totalCalls' },
                            totalNcs: { $sum: '$ncsOpenUsed' },
                            totalBLR: { $sum: '$blrCount' },
                            totalTSR: { $sum: '$tsrCount' },
                        };
                        const aggB = await DailyAsk.aggregate([
                            { $match: matchStage },
                            { $group: groupStage },
                        ]);
                        if (!aggB.length) return 0;
                        const docB = aggB[0];
                        switch (battle.metric) {
                            case 'askPercent':
                                return docB.totalCalls > 0
                                    ? (docB.totalAsks / docB.totalCalls) * 100
                                    : 0;
                            case 'ncsPercent':
                                return docB.totalCalls > 0
                                    ? (docB.totalNcs / docB.totalCalls) * 100
                                    : 0;
                            case 'blrCount':
                                return docB.totalBLR;
                            case 'tsrCount':
                                return docB.totalTSR;
                            default:
                                return 0;
                        }
                    })(),
                ]);

                // (b) Decide winnerTeam (or null for tie)
                let winnerTeam = null;
                if (finalA > finalB) {
                    winnerTeam = battle.teamA;
                } else if (finalB > finalA) {
                    winnerTeam = battle.teamB;
                }

                // (c) Update battle document
                battle.status = 'Completed';
                battle.result = {
                    winnerTeam,
                    teamAValue: finalA,
                    teamBValue: finalB,
                };
                await battle.save();

                // (d) Award badges to every member of winning team (if not a tie)
                if (winnerTeam) {
                    const winners = await User.find({ team: winnerTeam });
                    for (const user of winners) {
                        user.badges.push({
                            name: `Team Battle Winner: ${battle.metric}`,
                            earnedAt: new Date(),
                            challengeId: battle._id, // reuse the field name
                        });
                        await user.save();
                    }
                }

                console.log(
                    `[TeamFinalize] Battle ${battle._id} completed. Winner: ${winnerTeam || 'Tie'}`
                );
            } catch (innerErr) {
                console.error(
                    `[TeamFinalize] Error finalizing battle ${battle._id}:`,
                    innerErr
                );
            }
        }
    } catch (err) {
        console.error('Error in finalizeTeamBattles:', err);
    }
}

module.exports = {
    sendTeamChallenge,
    getAllTeamChallenges,
    activateTeamBattle,
    getTeamBattleProgress,
    finalizeTeamBattles,
};