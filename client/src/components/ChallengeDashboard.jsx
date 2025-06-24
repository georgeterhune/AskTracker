// src/components/ChallengeDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Divider,
    CircularProgress,
    Alert,
    Grid,
    Card,
    CardContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';

/**
 * Props:
 *   currentUser: { id, firstName, lastInitial, role, … }
 */
export default function ChallengeDashboard({ currentUser }) {
    const navigate = useNavigate();
    const [personal, setPersonal] = useState([]);   // your 1-on-1 challenges
    const [community, setCommunity] = useState([]); // all active 1-on-1
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 1️⃣ Fetch your own challenges
    const fetchPersonal = useCallback(async () => {
        console.log('[ChallengeDashboard] fetchPersonal()', { userId: currentUser?.id });
        if (!currentUser?.id) {
            console.log('[ChallengeDashboard] no userId, skipping');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/challenges', {
                params: { userId: currentUser.id },
            });
            console.log('[ChallengeDashboard] personal response:', res.status, res.data);
            setPersonal(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching personal challenges:', err);
            setError(err.response?.data?.error || 'Could not load your challenges.');
            setPersonal([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    // 2️⃣ Fetch community (globally active 1-on-1)
    const fetchCommunity = useCallback(async () => {
        try {
            const res = await axios.get('/api/challenges/active');
            setCommunity(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching community challenges:', err);
        }
    }, []);

    // 3️⃣ On mount (and whenever currentUser changes), reload both lists
    useEffect(() => {
        fetchPersonal();
        fetchCommunity();
    }, [fetchPersonal, fetchCommunity]);

    // 4️⃣ Loading / error / guard
    if (!currentUser) {
        return (
            <Box textAlign="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }
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

    // 5️⃣ Split personal into buckets
    const pending = personal.filter(c => c.status === 'Pending');
    const active = personal.filter(c => c.status === 'Active');
    const past = personal.filter(c => ['Declined', 'Completed'].includes(c.status));

    return (
        <Box p={2}>
            {/* → NEW BUTTON */}
            <Box mb={2} display="flex" justifyContent="flex-end">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/challenge')}
                >
                    New 1-on-1 Challenge
                </Button>
            </Box>

            {/* Community Challenges */}
            <Typography variant="h6" gutterBottom>
                Community Challenges
            </Typography>
            {/* ─── Community Challenges ─── */}
            <Typography variant="h6" gutterBottom>
                Community Challenges
            </Typography>
            {community.length > 0 ? (
                community.map(ch => (
                    <Accordion key={ch._id} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>
                                {ch.challenger.firstName} {ch.challenger.lastInitial}. vs{' '}
                                {ch.challengee.firstName} {ch.challengee.lastInitial}. on “{ch.metric}”
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Window: {new Date(ch.startDate).toLocaleDateString()} –{' '}
                                {new Date(ch.endDate).toLocaleDateString()}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                ))
            ) : (
                <Typography color="text.secondary" gutterBottom>
                    No community challenges right now.
                </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* ─── Pending Invitations ─── */}
            <Typography variant="h6" gutterBottom>
                Pending Invitations
            </Typography>
            {pending.length > 0 ? (
                <Grid container spacing={2}>
                    {pending.map(ch => {
                        const start = new Date(ch.startDate).toLocaleDateString();
                        const end = new Date(ch.endDate).toLocaleDateString();
                        return (
                            <Grid item xs={12} md={6} key={ch._id}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography>
                                            <strong>
                                                {ch.challenger.firstName} {ch.challenger.lastInitial}.
                                            </strong>{' '}
                                            has challenged you on <em>"{ch.metric}"</em> for {ch.window} days
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {start} – {end}
                                        </Typography>
                                        <Box mt={2} display="flex" gap={1}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={async () => {
                                                    await axios.put(
                                                        `/api/challenges/${ch._id}/respond`,
                                                        { action: 'Accept', userId: currentUser.id }
                                                    );
                                                    fetchPersonal();
                                                }}
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={async () => {
                                                    await axios.put(
                                                        `/api/challenges/${ch._id}/respond`,
                                                        { action: 'Decline', userId: currentUser.id }
                                                    );
                                                    fetchPersonal();
                                                }}
                                            >
                                                Decline
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            ) : (
                <Typography color="text.secondary" gutterBottom>
                    You have no pending invitations.
                </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* ─── Active Challenges ─── */}
            <Typography variant="h6" gutterBottom>
                Active Challenges
            </Typography>
            {active.length > 0 ? (
                active.map(ch => {
                    const start = new Date(ch.startDate).toLocaleDateString();
                    const end = new Date(ch.endDate).toLocaleDateString();
                    const today = new Date();
                    const diffMs = new Date(end).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0);
                    const daysLeft = Math.max(0, Math.ceil(diffMs / 86400000) + 1);
                    return (
                        <Accordion key={ch._id} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>
                                    {ch.challenger.firstName} {ch.challenger.lastInitial}. vs{' '}
                                    {ch.challengee.firstName} {ch.challengee.lastInitial}. on “{ch.metric}”
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography>Window: {start} – {end}</Typography>
                                <Typography>Days Remaining: {daysLeft}</Typography>
                            </AccordionDetails>
                        </Accordion>
                    );
                })
            ) : (
                <Typography color="text.secondary" gutterBottom>
                    No active challenges at the moment.
                </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* ─── Past Challenges ─── */}
            <Typography variant="h6" gutterBottom>
                Past Challenges
            </Typography>
            {past.length > 0 ? (
                past.map(ch => {
                    const start = new Date(ch.startDate).toLocaleDateString();
                    const end = new Date(ch.endDate).toLocaleDateString();
                    return (
                        <Accordion key={ch._id} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>
                                    {ch.challenger.firstName} {ch.challenger.lastInitial}. vs{' '}
                                    {ch.challengee.firstName} {ch.challengee.lastInitial}. on “{ch.metric}”
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography>
                                    Status: <strong>{ch.status}</strong>
                                </Typography>
                                <Typography>Window: {start} – {end}</Typography>
                                {ch.status === 'Completed' && ch.result?.winner ? (
                                    <Typography>
                                        Winner:{' '}
                                        {String(ch.result.winner) === currentUser.id
                                            ? 'You'
                                            : ch.result.winner === ch.challenger._id
                                                ? `${ch.challenger.firstName} ${ch.challenger.lastInitial}.`
                                                : `${ch.challengee.firstName} ${ch.challengee.lastInitial}.`}
                                        <br />
                                        {ch.challenger.firstName} {ch.challenger.lastInitial}.: {ch.result.challengerValue}{' '}
                                        vs {ch.challengee.firstName} {ch.challengee.lastInitial}.: {ch.result.challengeeValue}
                                    </Typography>
                                ) : ch.status === 'Completed' ? (
                                    <Typography>
                                        Tie: Both had {ch.result.challengerValue}
                                    </Typography>
                                ) : (
                                    <Typography>
                                        Declined on {new Date(ch.updatedAt).toLocaleDateString()}
                                    </Typography>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    );
                })
            ) : (
                <Typography color="text.secondary">
                    You have no past challenges.
                </Typography>
            )}
        </Box>
    );
}