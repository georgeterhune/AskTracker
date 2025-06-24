// server/jobs/finalizeChallenges.js

const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const DailyAsk = require('../models/DailyAsk');

/**
 * Convert a JavaScript Date object into a 'YYYY-MM-DD' string,
 * matching how dates are stored in DailyAsk.date.
 */
function formatDateToYMD(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0'); // months are zero-indexed
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Given a userId (as ObjectId or string) and a challenge's metric,
 * plus startDate/endDate (as JS Date objects), compute that user's
 * final metric value over the window by aggregating DailyAsk documents.
 *
 * - For 'askPercent': (sum(asks)/sum(totalCalls)) * 100
 * - For 'ncsPercent': (sum(ncsOpenUsed)/sum(totalCalls)) * 100
 * - For 'blrCount'  : sum(blrCount)
 * - For 'tsrCount'  : sum(tsrCount)
 */
async function aggregateMetricForUser(userId, metric, startDate, endDate) {
    // Convert ObjectId to string if needed
    const uidStr = String(userId);

    // Convert dates to 'YYYY-MM-DD' strings
    const startStr = formatDateToYMD(startDate);
    const endStr = formatDateToYMD(endDate);

    // Build the aggregation pipeline
    const matchStage = {
        userId: uidStr,
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

    const results = await DailyAsk.aggregate([
        { $match: matchStage },
        { $group: groupStage },
    ]);

    if (!results.length) {
        return 0;
    }
    const doc = results[0];

    switch (metric) {
        case 'askPercent':
            return doc.totalCalls > 0
                ? (doc.totalAsks / doc.totalCalls) * 100
                : 0;
        case 'ncsPercent':
            return doc.totalCalls > 0
                ? (doc.totalNcs / doc.totalCalls) * 100
                : 0;
        case 'blrCount':
            return doc.totalBLR;
        case 'tsrCount':
            return doc.totalTSR;
        default:
            return 0;
    }
}

/**
 * Once a challenge is Completed (with winnerId), update both user documents:
 *  - Remove challenge._id from activeChallenges
 *  - Add challenge._id to pastChallenges
 *  - If user is winner => push a new badge into user.badges
 */
async function updateUsersAfterCompletion(challenge, winnerId) {
    const [challenger, challengee] = await Promise.all([
        User.findById(challenge.challenger),
        User.findById(challenge.challengee),
    ]);

    if (!challenger || !challengee) {
        console.warn(
            `[Finalize] Users missing for challenge ${challenge._id}`
        );
        return;
    }

    // Utility to move a single user
    const processUser = async (userDoc, isWinner) => {
        // Remove from activeChallenges
        userDoc.activeChallenges = userDoc.activeChallenges.filter(
            (cId) => !cId.equals(challenge._id)
        );
        // Add to pastChallenges
        userDoc.pastChallenges.push(challenge._id);

        // Award badge if winner
        if (isWinner) {
            userDoc.badges.push({
                name: `1v1 Winner: ${challenge.metric}`,
                earnedAt: new Date(),
                challengeId: challenge._id,
            });
        }
        await userDoc.save();
    };

    await Promise.all([
        processUser(
            challenger,
            String(winnerId) === String(challenger._id)
        ),
        processUser(
            challengee,
            String(winnerId) === String(challengee._id)
        ),
    ]);
}

/**
 * Main function: find all “Active” challenges whose endDate ≤ now,
 * compute final metrics for each user, mark status → 'Completed', store result,
 * and update both user documents accordingly.
 */
async function finalizeChallenges() {
    const now = new Date();

    // 1) Find every challenge that is still Active but whose endDate has passed
    const toFinalize = await Challenge.find({
        status: 'Active',
        endDate: { $lte: now },
    });

    if (!toFinalize.length) {
        console.log(
            `[Finalize] Nothing to finalize at ${now.toISOString()}`
        );
        return;
    }

    console.log(
        `[Finalize] Found ${toFinalize.length} challenge(s) to finalize.`
    );

    // 2) Loop through each and compute winner
    for (const ch of toFinalize) {
        try {
            // a) Aggregate each user’s metric over the challenge window
            const [valChallenger, valChallengee] = await Promise.all([
                aggregateMetricForUser(
                    ch.challenger,
                    ch.metric,
                    ch.startDate,
                    ch.endDate
                ),
                aggregateMetricForUser(
                    ch.challengee,
                    ch.metric,
                    ch.startDate,
                    ch.endDate
                ),
            ]);

            // b) Determine winner (or leave null for a tie)
            let winnerId = null;
            if (valChallenger > valChallengee) {
                winnerId = ch.challenger;
            } else if (valChallengee > valChallenger) {
                winnerId = ch.challengee;
            }

            // c) Update the Challenge document
            ch.status = 'Completed';
            ch.result = {
                winner: winnerId,
                challengerValue: valChallenger,
                challengeeValue: valChallengee,
            };
            await ch.save();

            // d) Update both users (move from active→past, award badge to winner)
            await updateUsersAfterCompletion(ch, winnerId);

            console.log(
                `[Finalize] Challenge ${ch._id} completed. Winner: ${winnerId || 'Tie'
                }`
            );
        } catch (err) {
            console.error(
                `[Finalize] Error finalizing challenge ${ch._id}:`,
                err
            );
        }
    }
}

// Export the function so it can be scheduled in index.js
module.exports = finalizeChallenges;