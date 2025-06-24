// server/controllers/userController.js

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const TeamChallenge = require('../models/TeamChallenge');
const DailyAsk = require('../models/DailyAsk');

/**
 * GET /api/users/:id/profile
 * Returns the user’s profile, daily stats, 1v1 and team-battle challenges.
 */
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;

        // 1) Fetch the user
        const user = await User.findById(userId)
            .select('email role team badges')
            .lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 2) Fetch daily stats for that user
        const dailyDocs = await DailyAsk.find({ userId })
            .sort({ date: 1 })
            .lean();
        const dailyStats = dailyDocs.map((d) => {
            const askPct = d.totalCalls > 0 ? (d.asks / d.totalCalls) * 100 : 0;
            const ncsPct = d.totalCalls > 0 ? (d.ncsOpenUsed / d.totalCalls) * 100 : 0;
            return {
                date: d.date,
                asks: d.asks,
                totalCalls: d.totalCalls,
                askPercent: parseFloat(askPct.toFixed(1)),
                ncsPercent: parseFloat(ncsPct.toFixed(1)),
                blrCount: d.blrCount,
                tsrCount: d.tsrCount,
            };
        });

        // 3) Fetch all 1:1 challenges for this user
        const allChallenges = await Challenge.find({
            $or: [{ challenger: userId }, { challengee: userId }],
        })
            .populate('challenger', 'email')
            .populate('challengee', 'email')
            .lean();
        const active1v1 = allChallenges.filter((c) => c.status === 'Active');
        const past1v1 = allChallenges.filter((c) =>
            ['Declined', 'Completed'].includes(c.status)
        );

        // 4) Fetch all team challenges for this user’s team
        const teamName = user.team;
        let teamChallenges = [];
        if (teamName) {
            teamChallenges = await TeamChallenge.find({
                $or: [{ teamA: teamName }, { teamB: teamName }],
            }).lean();
        }
        const activeTeamBattles = teamChallenges.filter((t) => t.status === 'Active');
        const completedTeamBattles = teamChallenges.filter((t) => t.status === 'Completed');

        // 5) Return everything
        return res.json({
            user,                    // { _id, email, role, team, badges }
            dailyStats,              // array of { date, asks, … }
            active1v1,               // your active 1:1s
            past1v1,                 // your past 1:1s
            activeTeamBattles,       // team battles in progress
            completedTeamBattles,    // finished team battles
        });
    } catch (err) {
        console.error('Error in getUserProfile:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// exports.getTeamMembers = async (req, res) => {
//     try {
//         const myId = req.user.id;
//         const me = await User.findById(myId).lean();
//         if (!me || !me.team) return res.status(400).json({ error: 'No team found.' });

//         // find everyone with the same team, but only roles 'user' or 'admin'
//         const members = await User.find({
//             team: me.team,
//             role: { $in: ['user', 'admin'] }
//         })
//             .select('_id firstName lastName role') // pick whichever fields you need
//             .lean();

//         return res.json(members);
//     } catch (err) {
//         console.error('Error in getTeamMembers:', err);
//         return res.status(500).json({ error: 'Internal server error.' });
//     }
// };

/**
 * GET /api/users/team
 * Returns everyone on your same team AND any admins.
 */
exports.getTeamMembers = async (req, res) => {
    try {
        // 1️⃣ Grab the full user document to get the up-to-date `team`
        const me = await User.findById(req.user.id).lean();
        if (!me || !me.team) {
            return res.status(400).json({ error: 'You are not assigned to a team.' });
        }

        // 2️⃣ Now find everyone on that team (role user OR admin)
        const members = await User.find({
            $or: [
                { team: me.team },
                { role: 'admin' }
            ]
        })
            .select('_id firstName lastName role team')
            .lean();

        return res.json(members);
    } catch (err) {
        console.error('Error in getTeamMembers:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};