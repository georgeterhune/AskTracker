// client/src/components/DailyTracker.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Button,
    IconButton,
    Alert,
    Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export default function DailyTracker({ onSubmit }) {
    const todayKey = `ask-tracker-${new Date().toISOString().split('T')[0]}`;
    const defaultData = {
        asks: 0,
        totalCalls: 0,
        ncsOpenUsed: 0,
        thankYouCount: 0,
        assuranceUsed: 0,
        blrCount: 0,
        tsrCount: 0,
    };

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(todayKey);
        return saved ? JSON.parse(saved) : defaultData;
    });
    const [showReminder, setShowReminder] = useState(false);

    useEffect(() => {
        localStorage.setItem(todayKey, JSON.stringify(data));
    }, [data]);

    useEffect(() => {
        const checkIfSubmitted = async () => {
            const token = localStorage.getItem('auth-token');
            const localSaved = localStorage.getItem(todayKey);
            if (!localSaved) return;

            try {
                const today = new Date().toISOString().split('T')[0];
                await axios.get(`http://localhost:5000/api/daily/${today}`, {
                    headers: { 'x-auth-token': token },
                });
                // If record exists, no reminder
            } catch (err) {
                if (err.response?.status === 404) {
                    setShowReminder(true);
                }
            }
        };

        checkIfSubmitted();
    }, []);

    const handleAsk = (asked) => {
        setData((prev) => ({
            ...prev,
            asks: asked ? prev.asks + 1 : prev.asks,
            totalCalls: prev.totalCalls + 1,
        }));
    };

    const increment = (field) => {
        setData((prev) => ({ ...prev, [field]: prev[field] + 1 }));
    };

    const decrement = (field) => {
        setData((prev) => ({
            ...prev,
            [field]: prev[field] > 0 ? prev[field] - 1 : 0,
        }));
    };

    const handleSubmit = async () => {
        try {
            await axios.post('http://localhost:5000/api/daily', data, {
                headers: { 'x-auth-token': localStorage.getItem('auth-token') },
            });
            alert('Daily record submitted!');
            localStorage.removeItem(todayKey);
            onSubmit();
        } catch (err) {
            console.error('Error submitting daily record:', err);
            alert('Failed to submit. Please try again.');
        }
    };

    const askPercent = data.totalCalls
        ? Math.round((data.asks / data.totalCalls) * 100)
        : 0;
    const ncsPercent = data.totalCalls
        ? Math.round((data.ncsOpenUsed / data.totalCalls) * 100)
        : 0;

    return (
        <Box sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4 } }}>
            {showReminder && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    ⚠️ You haven’t submitted today’s progress yet. Don’t forget to save before
                    the day ends!
                </Alert>
            )}

            <Typography variant="h4" gutterBottom>
                Daily Tracker
            </Typography>

            <Grid container spacing={2}>
                {/* Row 1: Asks / Calls occupies full width */}
                <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            Asks / Calls
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {data.asks} / {data.totalCalls} ({askPercent}%)
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                color="success"
                                fullWidth
                                onClick={() => handleAsk(true)}
                            >
                                ✅ Ask
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                fullWidth
                                onClick={() => handleAsk(false)}
                            >
                                ❌ No Ask
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Row 2: NCS Opens */}
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            NCS Opens
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {data.ncsOpenUsed} ({ncsPercent}%)
                        </Typography>
                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
                            <IconButton color="primary" onClick={() => increment('ncsOpenUsed')}>
                                <AddIcon />
                            </IconButton>
                            <IconButton color="primary" onClick={() => decrement('ncsOpenUsed')}>
                                <RemoveIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Row 2: Thank Yous */}
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            Thank Yous
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {data.thankYouCount}
                        </Typography>
                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
                            <IconButton color="primary" onClick={() => increment('thankYouCount')}>
                                <AddIcon />
                            </IconButton>
                            <IconButton color="primary" onClick={() => decrement('thankYouCount')}>
                                <RemoveIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Row 2: Assurance Statements */}
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            Assurance Statements
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {data.assuranceUsed}
                        </Typography>
                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
                            <IconButton color="primary" onClick={() => increment('assuranceUsed')}>
                                <AddIcon />
                            </IconButton>
                            <IconButton color="primary" onClick={() => decrement('assuranceUsed')}>
                                <RemoveIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Row 3: BLRs */}
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            BLRs
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {data.blrCount}
                        </Typography>
                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
                            <IconButton color="primary" onClick={() => increment('blrCount')}>
                                <AddIcon />
                            </IconButton>
                            <IconButton color="primary" onClick={() => decrement('blrCount')}>
                                <RemoveIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Row 3: TSRs */}
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            TSRs
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {data.tsrCount}
                        </Typography>
                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
                            <IconButton color="primary" onClick={() => increment('tsrCount')}>
                                <AddIcon />
                            </IconButton>
                            <IconButton color="primary" onClick={() => decrement('tsrCount')}>
                                <RemoveIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button variant="contained" color="primary" size="large" onClick={handleSubmit}>
                    📤 Submit Day
                </Button>
            </Box>
        </Box>
    );
}