// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getUserProfile, getTeamMembers } = require('../controllers/userController');

// GET /api/users/team
router.get('/team', auth, getTeamMembers);

// GET /api/users/:id/profile
router.get('/:id/profile', auth, getUserProfile);

module.exports = router;