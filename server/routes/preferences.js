const express = require('express');
const router = express.Router();
const Preferences = require('../models/UserPreferences');
const auth = require('../middleware/auth');

// GET current preferences
router.get('/', auth, async (req, res) => {
    try {
        let prefs = await Preferences.findOne({ userId: req.user.id });
        if (!prefs) {
            prefs = await Preferences.create({ userId: req.user.id });
        }
        res.json(prefs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// UPDATE preferences
router.post('/', auth, async (req, res) => {
    try {
        const { targetAskPercent, minCallsPerDay } = req.body;

        const updated = await Preferences.findOneAndUpdate(
            { userId: req.user.id },
            { targetAskPercent, minCallsPerDay },
            { new: true, upsert: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

module.exports = router;