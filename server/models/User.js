// server/models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // New fields:
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: String, default: '' },

  activeChallenges: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  ],
  pastChallenges: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  ],

  badges: [
    {
      name: String,
      earnedAt: Date,
      challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    },
  ],
});

module.exports = mongoose.model('User', userSchema);