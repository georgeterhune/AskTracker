const mongoose = require('mongoose');

const PreferencesSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    targetAskPercent: { type: Number, default: 50 },
    minCallsPerDay: { type: Number, default: 10 },
});

module.exports = mongoose.model('UserPreferences', PreferencesSchema);