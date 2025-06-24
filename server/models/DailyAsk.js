const mongoose = require('mongoose');

const DailyAskSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true }, // format: 'YYYY-MM-DD'

    asks: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    ncsOpenUsed: { type: Number, default: 0 },
    thankYouCount: { type: Number, default: 0 },
    assuranceUsed: { type: Number, default: 0 },
    blrCount: { type: Number, default: 0 },
    tsrCount: { type: Number, default: 0 },
});

DailyAskSchema.index({ userId: 1, date: 1 }, { unique: true }); // enforce one entry per user per day

module.exports = mongoose.model('DailyAsk', DailyAskSchema);