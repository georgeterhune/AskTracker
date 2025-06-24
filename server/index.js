// server/index.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const userRoutes = require('./routes/userRoutes');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Existing routes…
app.use('/api/ping', require('./routes/ping'));
app.use('/api/ask', require('./routes/ask'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/api/manager', require('./routes/manager'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/auth', require('./routes/auth'));

// New TeamChallenge routes
app.use('/api/team-challenges', require('./routes/teamChallengeRoutes'));

// Import the finalizer functions
const finalizeChallenges = require('./jobs/finalizeChallenges');
const { finalizeTeamBattles } = require('./controllers/teamChallengeController');

app.use('/api/users', userRoutes);

// Connect to MongoDB and start server + schedule jobs
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');

    (async () => {
      try {
        console.log('[Startup] Running finalizeChallenges…');
        await finalizeChallenges();

        console.log('[Startup] Running finalizeTeamBattles…');
        await finalizeTeamBattles();
      } catch (err) {
        console.error('[Startup] Error running initial finalizers:', err);
      }
    })();

    // 1️⃣ Schedule 1v1 challenge finalizer at midnight daily
    cron.schedule('0 0 * * *', async () => {
      console.log(`[Cron] Running finalizeChallenges at ${new Date().toISOString()}`);
      try {
        await finalizeChallenges();
      } catch (err) {
        console.error('[Cron] finalizeChallenges encountered an error:', err);
      }
    });

    // 2️⃣ Schedule TeamBattle finalizer at midnight daily
    cron.schedule('0 0 * * *', async () => {
      console.log(`[Cron] Running finalizeTeamBattles at ${new Date().toISOString()}`);
      try {
        await finalizeTeamBattles();
      } catch (err) {
        console.error('[Cron] finalizeTeamBattles encountered an error:', err);
      }
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });