// server/models/TeamChallenge.js

const mongoose = require('mongoose');

const TeamChallengeSchema = new mongoose.Schema({
    creator: {                                  // The manager/admin who created this battle
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    teamA: {                                    // Name of the first team
        type: String,
        required: true,
    },
    teamB: {                                    // Name of the second team
        type: String,
        required: true,
    },
    metric: {                                  // Must match the same enum as 1v1
        type: String,
        enum: ['askPercent', 'ncsPercent', 'blrCount', 'tsrCount'],
        required: true,
    },
    window: {                                  // Number of days for this battle
        type: Number,
        default: 7,
        required: true,
    },
    startDate: {                               // When the battle begins (midnight)
        type: Date,
        required: true,
    },
    endDate: {                                 // Automatically computed as startDate + window - 1
        type: Date,
        required: true,
    },
    status: {                                  // Pending → Active → Completed
        type: String,
        enum: ['Pending', 'Active', 'Completed'],
        default: 'Pending',
    },
    result: {                                  // Once completed, store totals & winnerTeam
        winnerTeam: { type: String, default: null },
        teamAValue: { type: Number, default: 0 },
        teamBValue: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TeamChallenge', TeamChallengeSchema);