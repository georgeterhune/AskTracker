// AFTER (CommonJS-style)
const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
    challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    challengee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    metric: {
        type: String,
        enum: ['askPercent', 'ncsPercent', 'blrCount', 'tsrCount'],
        required: true,
    },
    window: { type: Number, default: 7 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Active', 'Declined', 'Completed'],
        default: 'Pending',
    },
    result: {
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        challengerValue: { type: Number, default: 0 },
        challengeeValue: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Challenge', ChallengeSchema);