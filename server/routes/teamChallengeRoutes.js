// server/routes/teamChallengeRoutes.js

const express = require('express');
const {
    sendTeamChallenge,
    getAllTeamChallenges,
    activateTeamBattle,
    getTeamBattleProgress,
    finalizeTeamBattles, // for manual triggering if needed
} = require('../controllers/teamChallengeController');

const router = express.Router();

// 1) Create a new team battle (manager/admin only)
router.post('/', sendTeamChallenge);

// 2) Get a list of battles (filter by creatorId or teamName)
router.get('/', getAllTeamChallenges);

// 3) Activate a battle (Pending → Active)
router.put('/:id/activate', activateTeamBattle);

// 4) Live progress (how are teams doing right now?)
router.get('/:id/progress', getTeamBattleProgress);

// 5) (Optional) Manual trigger to finalize all expired battles in dev/test
router.post('/run-finalizer', async (req, res) => {
    try {
        await finalizeTeamBattles();
        res.json({ message: 'Finalizer run complete.' });
    } catch (err) {
        console.error('Error running finalizer manually:', err);
        res.status(500).json({ error: 'Finalizer error.' });
    }
});

module.exports = router;