// client/src/components/TeamBattleManager.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    MenuItem,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    CircularProgress,
    Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

/**
 * TeamBattleManager
 *
 * Props:
 *   • currentUser: the logged‐in manager/admin { id, email, role, … }
 */
export default function TeamBattleManager({ currentUser }) {
    // ─── Guard against missing currentUser ─────────────────
    if (!currentUser?.id) {
        return (
            <Box textAlign="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }

    // ─── Local state ───────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [battles, setBattles] = useState([]);       // all manager’s battles
    const [teamOptions, setTeamOptions] = useState([]); // distinct team names

    // Form state
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [metric, setMetric] = useState('askPercent');
    const [windowDays, setWindowDays] = useState(7);
    const [startDate, setStartDate] = useState(new Date());
    const [formError, setFormError] = useState('');

    // Active battle accordion + live progress
    const [expandedId, setExpandedId] = useState(null);
    const [liveProgress, setLiveProgress] = useState({}); // { [battleId]: { teamAValue, teamBValue } }

    // Always include auth token
    axios.defaults.headers.common['x-auth-token'] = localStorage.getItem('auth-token');

    // ─── Fetch manager’s battles & the list of all teams ─────────
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // A) Get battles created by this manager:
                const battlesRes = await axios.get(
                    'http://localhost:5000/api/team-challenges',
                    {
                        params: { creatorId: currentUser.id },
                    }
                );

                // B) Get all teams (so we can build dropdowns):
                const teamsRes = await axios.get('http://localhost:5000/api/manager/teams');

                // Extract unique team names (e.g. “Smith”, “Johnson”, etc.)
                const names = Array.from(
                    new Set(teamsRes.data.map((t) => t.team).filter((t) => t))
                ).sort();

                setBattles(battlesRes.data);
                setTeamOptions(names);
            } catch (err) {
                console.error('Error loading team battles or teams:', err.response || err);
                setError('Failed to load team battles or team list.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser.id]);

    // ─── Handler: Create a new team battle ───────────────────
    const handleCreateBattle = async () => {
        setFormError('');
        if (!teamA || !teamB) {
            setFormError('Please select both Team A and Team B.');
            return;
        }
        if (teamA === teamB) {
            setFormError('Team A and Team B must be different.');
            return;
        }
        if (!windowDays || windowDays < 1) {
            setFormError('Window must be at least 1 day.');
            return;
        }

        try {
            const payload = {
                creatorId: currentUser.id,
                teamA,
                teamB,
                metric,
                window: windowDays,
                startDate: startDate.toISOString(),
            };

            await axios.post('http://localhost:5000/api/team-challenges', payload);

            // Clear the form & re‐fetch all battles:
            setTeamA('');
            setTeamB('');
            setMetric('askPercent');
            setWindowDays(7);
            setStartDate(new Date());
            setFormError('');

            const res = await axios.get('http://localhost:5000/api/team-challenges', {
                params: { creatorId: currentUser.id },
            });
            setBattles(res.data);
        } catch (err) {
            console.error('Failed to create team battle:', err.response || err);
            setFormError(err.response?.data?.error || 'Error creating battle.');
        }
    };

    // ─── Handler: Activate a pending battle ──────────────────
    const handleActivate = async (battleId) => {
        try {
            await axios.put(
                `http://localhost:5000/api/team-challenges/${battleId}/activate`,
                { userId: currentUser.id }
            );
            // Re-fetch updated battles:
            const res = await axios.get('http://localhost:5000/api/team-challenges', {
                params: { creatorId: currentUser.id },
            });
            setBattles(res.data);
        } catch (err) {
            console.error('Failed to activate battle:', err.response || err);
            alert(err.response?.data?.error || 'Could not activate battle.');
        }
    };

    // ─── Handler: Fetch live progress for an active battle ──
    const fetchLiveProgress = async (battleId) => {
        try {
            const res = await axios.get(
                `http://localhost:5000/api/team-challenges/${battleId}/progress`
            );
            setLiveProgress((prev) => ({
                ...prev,
                [battleId]: res.data,
            }));
        } catch (err) {
            console.error('Error fetching live progress:', err.response || err);
        }
    };

    // Split battles into Pending / Active / Completed:
    const pendingBattles = battles.filter((b) => b.status === 'Pending');
    const activeBattles = battles.filter((b) => b.status === 'Active');
    const completedBattles = battles.filter((b) => b.status === 'Completed');

    // ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box textAlign="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }
    if (error) {
        return (
            <Box mt={4}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box>
            {/* ─────────────── Create New Team Battle ─────────────── */}
            <Typography variant="h6" gutterBottom>
                Create New Team Battle
            </Typography>
            <Card variant="outlined" sx={{ mb: 4 }}>
                <CardContent>
                    {formError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {formError}
                        </Alert>
                    )}

                    <Grid container spacing={2}>
                        {/* ── Team A ─────────────────────────────────────── */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <TextField
                                select
                                fullWidth
                                label="Team A"
                                value={teamA}
                                onChange={(e) => setTeamA(e.target.value)}
                                sx={{
                                    minWidth: 200,    // ensure it never shrinks below 200px
                                }}
                            >
                                {teamOptions.map((name) => (
                                    <MenuItem key={name} value={name}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* ── Team B ─────────────────────────────────────── */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <TextField
                                select
                                fullWidth
                                label="Team B"
                                value={teamB}
                                onChange={(e) => setTeamB(e.target.value)}
                                sx={{
                                    minWidth: 200,    // same minimum so both boxes are uniform
                                }}
                            >
                                {teamOptions
                                    .filter((name) => name !== teamA)
                                    .map((name) => (
                                        <MenuItem key={name} value={name}>
                                            {name}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        </Grid>

                        {/* ── Metric ──────────────────────────────────────── */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <TextField
                                select
                                fullWidth
                                label="Metric"
                                value={metric}
                                onChange={(e) => setMetric(e.target.value)}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="askPercent">Ask %</MenuItem>
                                <MenuItem value="ncsPercent">NCS %</MenuItem>
                                <MenuItem value="blrCount">BLR Count</MenuItem>
                                <MenuItem value="tsrCount">TSR Count</MenuItem>
                            </TextField>
                        </Grid>

                        {/* ── Window (days) ───────────────────────────────── */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <TextField
                                type="number"
                                fullWidth
                                label="Window (days)"
                                value={windowDays}
                                onChange={(e) => setWindowDays(Number(e.target.value))}
                                inputProps={{ min: 1 }}
                                sx={{ minWidth: 200 }}
                            />
                        </Grid>

                        {/* ── Start Date ──────────────────────────────────── */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DatePicker
                                    label="Start Date"
                                    value={startDate}
                                    onChange={(newDate) => {
                                        if (newDate) {
                                            const d = new Date(newDate);
                                            d.setHours(0, 0, 0, 0);
                                            setStartDate(d);
                                        }
                                    }}
                                    disablePast
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            sx={{ minWidth: 200 }}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>

                    <Box textAlign="right" mt={3}>
                        <Button variant="contained" onClick={handleCreateBattle}>
                            Create Battle
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* ─────────────── Pending Battles ─────────────── */}
            <Typography variant="h6" gutterBottom>
                Pending Battles
            </Typography>
            {pendingBattles.length ? (
                <Grid container spacing={2}>
                    {pendingBattles.map((b) => (
                        <Grid item xs={12} md={6} key={b._id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography>
                                        <strong>{b.teamA}</strong> vs <strong>{b.teamB}</strong> on{' '}
                                        <em>"{b.metric}"</em> for {b.window} days
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {new Date(b.startDate).toLocaleDateString()} –{' '}
                                        {new Date(b.endDate).toLocaleDateString()}
                                    </Typography>
                                    <Box mt={2} textAlign="right">
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleActivate(b._id)}
                                        >
                                            Activate
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography color="text.secondary" gutterBottom>
                    No pending battles.
                </Typography>
            )}

            <Divider sx={{ my: 4 }} />

            {/* ─────────────── Active Battles ─────────────── */}
            <Typography variant="h6" gutterBottom>
                Active Battles
            </Typography>
            {activeBattles.length ? (
                <Box>
                    {activeBattles.map((b) => {
                        const today = new Date();
                        const end = new Date(b.endDate);
                        const diffInMs =
                            end.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
                        const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)) + 1;

                        const progress = liveProgress[b._id] || null;

                        return (
                            <Accordion
                                key={b._id}
                                expanded={expandedId === b._id}
                                onChange={(_, isExpanded) => {
                                    setExpandedId(isExpanded ? b._id : null);
                                    if (isExpanded && !progress) {
                                        fetchLiveProgress(b._id);
                                    }
                                }}
                                sx={{ mb: 2 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>
                                        {b.teamA} vs {b.teamB} on “{b.metric}”
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography>
                                        Window: {new Date(b.startDate).toLocaleDateString()} –{' '}
                                        {new Date(b.endDate).toLocaleDateString()}
                                    </Typography>
                                    <Typography>
                                        Days Remaining: {daysLeft > 0 ? daysLeft : 0}
                                    </Typography>

                                    {progress ? (
                                        <Box mt={2}>
                                            <Typography>
                                                <strong>Current Standings:</strong> {b.teamA}:{' '}
                                                {progress.teamAValue.toFixed(1)} {b.metric} vs{' '}
                                                {b.teamB}:{' '}
                                                {progress.teamBValue.toFixed(1)} {b.metric}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        expandedId === b._id && (
                                            <Box textAlign="center" mt={2}>
                                                <CircularProgress size={20} />
                                            </Box>
                                        )
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Box>
            ) : (
                <Typography color="text.secondary" gutterBottom>
                    No active battles at the moment.
                </Typography>
            )}

            <Divider sx={{ my: 4 }} />

            {/* ─────────────── Completed Battles ─────────────── */}
            <Typography variant="h6" gutterBottom>
                Completed Battles
            </Typography>
            {completedBattles.length ? (
                <Grid container spacing={2}>
                    {completedBattles.map((b) => (
                        <Grid item xs={12} md={6} key={b._id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography>
                                        <strong>{b.teamA}</strong> vs <strong>{b.teamB}</strong> on{' '}
                                        <em>"{b.metric}"</em>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Window: {new Date(b.startDate).toLocaleDateString()} –{' '}
                                        {new Date(b.endDate).toLocaleDateString()}
                                    </Typography>
                                    <Typography mt={1}>
                                        Status: <strong>{b.status}</strong>
                                    </Typography>
                                    {b.result?.winnerTeam ? (
                                        <Typography>
                                            Winner: <strong>{b.result.winnerTeam}</strong> <br />
                                            {b.teamA}: {b.result.teamAValue.toFixed(1)} {b.metric} vs{' '}
                                            {b.teamB}: {b.result.teamBValue.toFixed(1)} {b.metric}
                                        </Typography>
                                    ) : (
                                        <Typography>
                                            Tie: Both had {b.result.teamAValue.toFixed(1)} {b.metric}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography color="text.secondary">
                    No completed battles yet.
                </Typography>
            )}
        </Box>
    );
}

// Helper to format “first.last@…” ➞ “First Last”
const formatManagerName = (email) => {
    const [user] = email.split('@');
    const [first, last] = user.split('.');
    return `${capitalize(first)} ${capitalize(last)}`;
};
const capitalize = (s) => s?.charAt(0).toUpperCase() + s?.slice(1);