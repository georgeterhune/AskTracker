const express = require('express');
const Challenge = require('../models/Challenge');
const {
    sendChallenge,
    respondToChallenge,
    getUserChallenges,
    getChallengeProgress,
    getActiveChallenges,
    getGlobalActive,
} = require('../controllers/challengeController.js');

const router = express.Router();

// Create a new challenge invitation
router.post('/', sendChallenge);

// Respond to Accept/Decline
router.put('/:challengeId/respond', respondToChallenge);

// Get all challenges for a user (e.g. GET /api/challenges?userId=…)
router.get('/', getUserChallenges);

// GET /api/challenges/active
router.get('/active', async (req, res) => {
    try {
        const actives = await Challenge.find({ status: 'Active' })
            .populate('challenger', 'firstName lastInitial')
            .populate('challengee', 'firstName lastInitial');
        res.json(actives);
    } catch (err) {
        console.error('Error fetching global active challenges:', err);
        res.status(500).json({ error: 'Could not load active challenges.' });
    }
});

// server/routes/challengeRoutes.js
router.get('/active', getGlobalActive);

module.exports = router;