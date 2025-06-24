const mongoose = require('mongoose');

const AskSchema = new mongoose.Schema({
  asked: { type: Boolean, required: true },
  ncsOpenUsed: { type: Boolean, required: true },
  blrCount: { type: Number, default: 0 },
  tsrCount: { type: Number, default: 0 },
  thankYouUsed: { type: Boolean, default: false },
  assuranceUsed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  userId: { type: String, required: true },
});

module.exports = mongoose.model('Ask', AskSchema);