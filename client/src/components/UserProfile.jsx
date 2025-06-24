// client/src/components/UserProfile.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

import {
    Box,
    Typography,
    Paper,
    Grid,
    Divider,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Chip,
} from '@mui/material';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

export default function UserProfile({ currentUser }) {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // 1) If no currentUser, don’t try to fetch
        if (!currentUser || !currentUser.id) return;

        const fetchProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axios.get(
                    `http://localhost:5000/api/users/${currentUser.id}/profile`
                );
                setProfileData(res.data);
            } catch (err) {
                console.error('Error fetching profile:', err.response || err);
                setError('Failed to load profile data.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [currentUser]);

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
    if (!profileData) {
        return null;
    }

    const {
        user,
        dailyStats,
        active1v1,
        past1v1,
        activeTeamBattles,
        completedTeamBattles,
    } = profileData;

    // Format badges as MUI Chips
    const badgeChips = (user.badges || []).map((b) => (
        <Chip
            key={b._id || b.challengeId}
            label={`${b.name} (${new Date(b.earnedAt).toLocaleDateString()})`}
            sx={{ mr: 1, mb: 1 }}
            color="primary"
            size="small"
        />
    ));

    return (
        <Box sx={{ px: 2, py: 3 }}>
            {/* ─── User Info ─────────────────────────────────────────── */}
            <Typography variant="h4" gutterBottom>
                Profile: {user.email}
            </Typography>
            <Typography>
                <strong>Role:</strong> {user.role}
            </Typography>
            <Typography>
                <strong>Team:</strong> {user.team || '—'}
            </Typography>
            <Box mt={1}>
                <Typography variant="subtitle1">Badges Earned:</Typography>
                {badgeChips.length > 0 ? (
                    <Box>{badgeChips}</Box>
                ) : (
                    <Typography color="text.secondary">No badges earned yet.</Typography>
                )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* ─── Daily Stats Chart ──────────────────────────────────── */}
            <Typography variant="h6" gutterBottom>
                Daily “Ask %” Over Time
            </Typography>
            {dailyStats.length > 0 ? (
                <Paper sx={{ height: 300, p: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyStats}>
                            <XAxis dataKey="date" />
                            <YAxis
                                label={{
                                    value: 'Ask %',
                                    angle: -90,
                                    position: 'insideLeft',
                                    dy: -10,
                                }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                formatter={(value) => `${value.toFixed(1)}%`}
                                labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="askPercent"
                                stroke="#1976d2"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            ) : (
                <Typography color="text.secondary">
                    No daily stats available.
                </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* ─── 1:1 Challenges ─────────────────────────────────────── */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Active 1:1 Challenges
                    </Typography>
                    {active1v1.length > 0 ? (
                        active1v1.map((c) => (
                            <Card key={c._id} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent>
                                    <Typography>
                                        {c.challenger.email === user.email
                                            ? `You challenged ${c.challengee.email}`
                                            : `${c.challenger.email} challenged you`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Metric: {c.metric} | Window: {c.window} days
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {new Date(c.startDate).toLocaleDateString()} –{' '}
                                        {new Date(c.endDate).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography color="text.secondary">
                            No active 1:1 challenges.
                        </Typography>
                    )}
                </Grid>

                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Past 1:1 Challenges
                    </Typography>
                    {past1v1.length > 0 ? (
                        past1v1.map((c) => (
                            <Card key={c._id} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent>
                                    <Typography>
                                        {c.challenger.email === user.email
                                            ? `You challenged ${c.challengee.email}`
                                            : `${c.challenger.email} challenged you`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Status: {c.status}
                                    </Typography>
                                    {c.status === 'Completed' && c.result?.winner ? (
                                        <Typography variant="body2">
                                            Winner:{' '}
                                            {c.result.winner.toString() === user._id.toString()
                                                ? 'You'
                                                : c.result.winner.toString() === c.challenger._id.toString()
                                                    ? c.challenger.email
                                                    : c.challengee.email}{' '}
                                            ({c.metric} –{' '}
                                            {c.result.challengerValue},{' '}
                                            {c.result.challengeeValue})
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Declined on{' '}
                                            {new Date(c.updatedAt).toLocaleDateString()}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography color="text.secondary">
                            No past 1:1 challenges.
                        </Typography>
                    )}
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* ─── Team Battles ─────────────────────────────────────── */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Active Team Battles
                    </Typography>
                    {activeTeamBattles.length > 0 ? (
                        activeTeamBattles.map((b) => (
                            <Card key={b._id} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent>
                                    <Typography>
                                        {b.teamA} vs {b.teamB} (Metric: {b.metric})
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {new Date(b.startDate).toLocaleDateString()} –{' '}
                                        {new Date(b.endDate).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography color="text.secondary">
                            No active team battles.
                        </Typography>
                    )}
                </Grid>

                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Completed Team Battles
                    </Typography>
                    {completedTeamBattles.length > 0 ? (
                        completedTeamBattles.map((b) => (
                            <Card key={b._id} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent>
                                    <Typography>
                                        {b.teamA} vs {b.teamB} (Metric: {b.metric})
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Window: {new Date(b.startDate).toLocaleDateString()} –{' '}
                                        {new Date(b.endDate).toLocaleDateString()}
                                    </Typography>
                                    {b.result?.winnerTeam ? (
                                        <Typography mt={1}>
                                            Winner: <strong>{b.result.winnerTeam}</strong> <br />
                                            {b.teamA}: {b.result.teamAValue.toFixed(1)} {b.metric} vs{' '}
                                            {b.teamB}: {b.result.teamBValue.toFixed(1)} {b.metric}
                                        </Typography>
                                    ) : (
                                        <Typography mt={1} color="text.secondary">
                                            Was a tie: both had{' '}
                                            {b.result.teamAValue.toFixed(1)} {b.metric}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography color="text.secondary">
                            No completed team battles.
                        </Typography>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}