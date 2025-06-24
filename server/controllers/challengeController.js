// server/controllers/challengeController.js

const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const DailyAsk = require('../models/DailyAsk'); // adjust path if needed
const TeamChallenge = require('../models/TeamChallenge');

/**
 * 1. sendChallenge
 *
 * POST /api/challenges
 * Creates a new 1v1 Challenge (invitation) in the database.
 */
async function sendChallenge(req, res) {
    try {
        const { challengerId, challengeeId, metric, window, startDate } = req.body;
        if (!challengerId || !challengeeId || !metric || !window) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        if (challengerId === challengeeId) {
            return res.status(400).json({ error: 'Cannot challenge yourself.' });
        }

        // Verify both users exist
        const [challenger, challengee] = await Promise.all([
            User.findById(challengerId),
            User.findById(challengeeId),
        ]);
        if (!challenger || !challengee) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Compute startDate and endDate
        const start = startDate ? new Date(startDate) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + Number(window) - 1);

        // Create Challenge document
        const newChallenge = new Challenge({
            challenger: challengerId,
            challengee: challengeeId,
            metric,
            window,
            startDate: start,
            endDate: end,
            status: 'Pending',
            result: { winner: null, challengerValue: 0, challengeeValue: 0 },
        });
        await newChallenge.save();

        // Add to each user's activeChallenges
        challenger.activeChallenges.push(newChallenge._id);
        challengee.activeChallenges.push(newChallenge._id);
        await Promise.all([challenger.save(), challengee.save()]);

        return res.status(201).json(newChallenge);
    } catch (err) {
        console.error('Error in sendChallenge:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 2. respondToChallenge
 *
 * PUT /api/challenges/:challengeId/respond
 * Accepts or declines an invitation. Only the challengee may respond.
 */
async function respondToChallenge(req, res) {
    try {
        const { challengeId } = req.params;
        const { action, userId } = req.body; // userId = the one making this request

        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found.' });
        }

        // Only the challengee can respond
        if (String(challenge.challengee) !== String(userId)) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        if (action === 'Accept') {
            challenge.status = 'Active';
            await challenge.save();
            return res.json({ message: 'Challenge accepted.' });
        } else if (action === 'Decline') {
            challenge.status = 'Declined';
            await challenge.save();

            // Move from activeChallenges -> pastChallenges for both users
            const [challenger, challengee] = await Promise.all([
                User.findById(challenge.challenger),
                User.findById(challenge.challengee),
            ]);
            [challenger, challengee].forEach((u) => {
                u.activeChallenges = u.activeChallenges.filter(
                    (cId) => !cId.equals(challenge._id)
                );
                u.pastChallenges.push(challenge._id);
            });
            await Promise.all([challenger.save(), challengee.save()]);

            return res.json({ message: 'Challenge declined.' });
        } else {
            return res.status(400).json({ error: 'Invalid action.' });
        }
    } catch (err) {
        console.error('Error in respondToChallenge:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 3. getUserChallenges
 *
 * GET /api/challenges?userId=...
 * Returns all challenge documents where the user is either challenger or challengee.
 */
async function getUserChallenges(req, res) {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter is required.' });
        }

        const challenges = await Challenge.find({
            $or: [{ challenger: userId }, { challengee: userId }],
        })
            .populate('challenger', 'firstName lastInitial')
            .populate('challengee', 'firstName lastInitial');

        return res.json(challenges);
    } catch (err) {
        console.error('Error in getUserChallenges:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * 4. getChallengeProgress
 *
 * GET /api/challenges/:id/progress
 * Returns the current metric values for both users over [startDate…today].
 */
async function getChallengeProgress(req, res) {
    try {
        const { id } = req.params;
        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found.' });
        }

        // Calculate today at midnight
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Helper to aggregate a user’s metric over [startDate…min(endDate, today)]
        async function aggregateMetric(userId, metric, startDate, endDateCutoff) {
            const toYMD = (d) => {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

            const windowEnd = endDateCutoff < challenge.endDate ? endDateCutoff : challenge.endDate;
            const startStr = toYMD(challenge.startDate);
            const endStr = toYMD(windowEnd);

            const matchStage = {
                userId: String(userId),
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

        const [challengerValue, challengeeValue] = await Promise.all([
            aggregateMetric(challenge.challenger, challenge.metric, challenge.startDate, now),
            aggregateMetric(challenge.challengee, challenge.metric, challenge.startDate, now),
        ]);

        return res.json({ challengerValue, challengeeValue });
    } catch (err) {
        console.error('Error in getChallengeProgress:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

async function getActiveChallenges(req, res) {
    try {
        const challenges = await Challenge.find({ status: 'Active' })
            .populate('challenger', 'firstName lastInitial')
            .populate('challengee', 'firstName lastInitial');
        res.json(challenges);
    } catch (err) {
        console.error('Error in getActiveChallenges:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

async function getGlobalActive(req, res) {
    const now = new Date();
    const active = await Challenge.find({
        status: 'Active',
        startDate: { $lte: now },
        endDate: { $gte: now },
    }).populate('challenger', 'firstName lastName').populate('challengee', 'firstName lastName');
    res.json(active);
}

// ────────────────────────────────────────────────────
// Make sure to export **all** four functions below:
//  • sendChallenge
//  • respondToChallenge
//  • getUserChallenges
//  • getChallengeProgress
// If any of these names is missing, you’ll get a "ReferenceError: <name> is not defined".
// ────────────────────────────────────────────────────
module.exports = {
    sendChallenge,
    respondToChallenge,
    getUserChallenges,
    getChallengeProgress,
    getActiveChallenges,
    getGlobalActive,
};