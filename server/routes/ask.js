const express = require('express');
const router = express.Router();
const Ask = require('../models/Ask');
const auth = require('../middleware/auth');

// Create a new ask (protected)
router.post('/', auth, async (req, res) => {
  try {
    const newAsk = new Ask({
      ...req.body,
      userId: req.user.id,
    });
    const saved = await newAsk.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all asks by current user (protected)
router.get('/', auth, async (req, res) => {
  try {
    const asks = await Ask.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(asks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;