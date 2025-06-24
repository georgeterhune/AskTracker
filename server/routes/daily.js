// server/routes/daily.js

const express = require('express');
const router = express.Router();
const DailyAsk = require('../models/DailyAsk');
const auth = require('../middleware/auth');

// Helper: return YYYY-MM-DD for the local date (America/Chicago, etc.)
function getLocalDateYMD() {
    const now = new Date();
    // offset to UTC then back to local midnight
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localMidnight = new Date(now.getTime() - tzOffsetMs);
    return localMidnight.toISOString().split('T')[0];
}

// POST: submit or update today's record
router.post('/', auth, async (req, res) => {
    const userId = req.user.id;
    const date = getLocalDateYMD();

    const record = { ...req.body, userId, date };

    try {
        const existing = await DailyAsk.findOne({ userId, date });

        if (existing) {
            // Update the existing record
            const updated = await DailyAsk.findOneAndUpdate(
                { userId, date },
                record,
                { new: true }
            );
            return res.json({ message: 'Updated record for today', record: updated });
        } else {
            // Create a new one
            const created = await DailyAsk.create(record);
            return res.status(201).json({ message: 'Created new record', record: created });
        }
    } catch (err) {
        console.error('Error saving daily ask:', err);
        res.status(500).json({ error: 'Server error saving record' });
    }
});

// GET: return all records for current user
router.get('/', auth, async (req, res) => {
    try {
        const records = await DailyAsk.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(records);
    } catch (err) {
        console.error('Error getting history:', err);
        res.status(500).json({ error: 'Server error retrieving data' });
    }
});

// GET: /api/daily/summary → return stats over time
router.get('/summary', auth, async (req, res) => {
    try {
        const records = await DailyAsk.find({ userId: req.user.id });

        if (!records.length) return res.json({ message: 'No records yet', summary: null });

        let totalCalls = 0;
        let totalAsks = 0;
        let totalNcs = 0;
        let blrs = 0;
        let tsrs = 0;
        let thankYous = 0;
        let assurances = 0;

        records.forEach((r) => {
            totalCalls += r.totalCalls;
            totalAsks += r.asks;
            totalNcs += r.ncsOpenUsed;
            blrs += r.blrCount;
            tsrs += r.tsrCount;
            thankYous += r.thankYouCount;
            assurances += r.assuranceUsed;
        });

        const daysTracked = records.length;

        const summary = {
            daysTracked,
            totalCalls,
            totalAsks,
            askPercent: totalCalls ? Math.round((totalAsks / totalCalls) * 100) : 0,
            ncsPercent: totalCalls ? Math.round((totalNcs / totalCalls) * 100) : 0,
            totalBLRs: blrs,
            totalTSRs: tsrs,
            thankYous,
            assurances,
            avgCallsPerDay: Math.round(totalCalls / daysTracked),
        };

        res.json({ summary });
    } catch (err) {
        console.error('Summary error:', err);
        res.status(500).json({ error: 'Error generating summary' });
    }
});

// PUT: update a record for a specific date
router.put('/:date', auth, async (req, res) => {
    const { date } = req.params;
    try {
        const updated = await DailyAsk.findOneAndUpdate(
            { userId: req.user.id, date },
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Record not found' });
        res.json(updated);
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({ error: 'Server error updating record' });
    }
});

// GET: return specific date's record
router.get('/:date', auth, async (req, res) => {
    const { date } = req.params;
    try {
        const record = await DailyAsk.findOne({ userId: req.user.id, date });
        if (!record) return res.status(404).json({ message: 'No entry found for that date' });
        res.json(record);
    } catch (err) {
        console.error('Error getting record:', err);
        res.status(500).json({ error: 'Server error retrieving record' });
    }
});

// DELETE /api/daily/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const deleted = await DailyAsk.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!deleted) return res.status(404).json({ error: 'Record not found' });

        res.json({ message: 'Record deleted' });
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).json({ error: 'Server error deleting record' });
    }
});

console.log('✅ Daily route loaded');

module.exports = router;