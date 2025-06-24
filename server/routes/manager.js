// server/routes/manager.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const DailyAsk = require('../models/DailyAsk');

/**
 * Helper: normalize an ISO timestamp or date string to 'YYYY-MM-DD'
 */
function toYMD(isoString) {
    return isoString.split('T')[0];
}

/**
 * GET /api/manager/teams
 * Returns aggregated daily stats for every team in the system.
 * Only includes users with role "user" or "admin".
 * Optional query params:
 *   • startDate=ISOString  (inclusive)
 *   • endDate=ISOString    (inclusive)
 */
router.get('/teams', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 1) Fetch every non-manager user
        const allUsers = await User.find({
            role: { $in: ['user', 'admin'] }
        });

        // 2) Build a map of teamName → { members: [], teamStats: {...} }
        const teamsMap = {};

        for (const user of allUsers) {
            // Build a filter on the string 'date' field (YYYY-MM-DD)
            const dateFilter = {};
            if (startDate) {
                dateFilter.date = { ...dateFilter.date, $gte: toYMD(startDate) };
            }
            if (endDate) {
                dateFilter.date = { ...dateFilter.date, $lte: toYMD(endDate) };
            }

            // Fetch all DailyAsk entries for this user in the date window
            const records = await DailyAsk.find({
                userId: user._id,
                ...dateFilter
            });

            // Sum up each metric
            let totalCalls = 0,
                totalAsks = 0,
                totalBLRs = 0,
                totalTSRs = 0;
            for (const r of records) {
                totalCalls += r.totalCalls;
                totalAsks += r.asks;
                totalBLRs += r.blrCount;
                totalTSRs += r.tsrCount;
            }

            // Build this user's summary
            const summary = {
                email: user.email,
                totalCalls,
                totalAsks,
                askPercent: totalCalls ? Math.round((totalAsks / totalCalls) * 100) : 0,
                totalBLRs,
                totalTSRs,
            };

            // Initialize the bucket for this team if missing
            const teamName = user.team || 'Unassigned';
            if (!teamsMap[teamName]) {
                teamsMap[teamName] = {
                    members: [],
                    teamStats: {
                        totalCalls: 0,
                        totalAsks: 0,
                        totalBLRs: 0,
                        totalTSRs: 0
                    }
                };
            }

            // Add this user into their team bucket
            teamsMap[teamName].members.push(summary);
            teamsMap[teamName].teamStats.totalCalls += totalCalls;
            teamsMap[teamName].teamStats.totalAsks += totalAsks;
            teamsMap[teamName].teamStats.totalBLRs += totalBLRs;
            teamsMap[teamName].teamStats.totalTSRs += totalTSRs;
        }

        // 3) Transform into an array and compute each team's askPercent
        const formatted = Object.entries(teamsMap).map(
            ([team, data]) => ({
                team,
                members: data.members,
                teamStats: {
                    ...data.teamStats,
                    askPercent: data.teamStats.totalCalls
                        ? Math.round((data.teamStats.totalAsks / data.teamStats.totalCalls) * 100)
                        : 0
                }
            })
        );

        // 4) Sort teams by descending askPercent
        formatted.sort(
            (a, b) => b.teamStats.askPercent - a.teamStats.askPercent
        );

        return res.json(formatted);
    } catch (err) {
        console.error('Error fetching all teams stats:', err);
        return res.status(500).json({ error: 'Failed to fetch team stats' });
    }
});

module.exports = router;