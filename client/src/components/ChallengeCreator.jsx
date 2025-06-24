// src/components/ChallengeCreator.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    Button,
    CircularProgress,
    Stack,
} from '@mui/material';

/**
 * ChallengeCreator
 *
 * Props:
 *  - currentUser: { id, firstName, lastName, team, role }
 *  - onCreated: callback after successfully sending
 */
export default function ChallengeCreator({ currentUser, onCreated }) {
    const [members, setMembers] = useState([]);
    const [selectedTeammate, setSelectedTeammate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [metric, setMetric] = useState('askPercent');
    const [windowDays, setWindowDays] = useState(7);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    useEffect(() => {
        const fetchTeam = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axios.get('/api/users/team', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });

                // 1) Remove yourself
                // 2) Remove pure managers (role==='manager'), but keep admins
                const filtered = res.data.filter(u => {
                    const isSelf = u._id.toString() === currentUser.id.toString();
                    const isManagerOnly = u.role === 'manager';
                    return !isSelf && !isManagerOnly;
                });

                setMembers(filtered);

                if (filtered.length) {
                    setSelectedTeammate(filtered[0]._id);
                } else {
                    setSelectedTeammate('');
                }
            } catch (err) {
                console.error('Error loading your team:', err);
                setError('Failed to load your team.');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.team) {
            fetchTeam();
        }
    }, [currentUser]);

    const handleSubmit = async () => {
        if (!selectedTeammate) {
            setError('Please pick someone to challenge.');
            return;
        }

        try {
            await axios.post(
                '/api/challenges',
                {
                    challengerId: currentUser.id,
                    challengeeId: selectedTeammate,
                    metric,
                    window: windowDays,
                    startDate: startDate.toISOString(),
                },
                { headers: { 'x-auth-token': localStorage.getItem('auth-token') } }
            );
            onCreated();
        } catch (err) {
            console.error('Error sending challenge', err);
            setError(err.response?.data?.error || 'Could not send challenge.');
        }
    };

    if (loading) {
        return (
            <Box textAlign="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box maxWidth={400} mx="auto" px={2} py={3}>
            <Stack spacing={2}>
                <Typography variant="h6" align="center">
                    🆕 New 1-on-1 Challenge
                </Typography>

                {error && (
                    <Typography color="error" align="center">
                        {error}
                    </Typography>
                )}

                <TextField
                    select
                    label="Teammate"
                    value={selectedTeammate}
                    onChange={(e) => setSelectedTeammate(e.target.value)}
                    fullWidth
                >
                    {members.map((u) => (
                        <MenuItem key={u._id} value={u._id}>
                            {u.firstName} {u.lastName}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    fullWidth
                >
                    <MenuItem value="askPercent">Ask %</MenuItem>
                    <MenuItem value="ncsPercent">NCS %</MenuItem>
                    <MenuItem value="blrCount">BLR Count</MenuItem>
                    <MenuItem value="tsrCount">TSR Count</MenuItem>
                </TextField>

                <TextField
                    type="number"
                    label="Window (days)"
                    value={windowDays}
                    onChange={(e) => setWindowDays(Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 1 }}
                />

                <TextField
                    type="date"
                    label="Start Date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                />

                <Button variant="contained" onClick={handleSubmit} fullWidth>
                    Send Challenge
                </Button>
            </Stack>
        </Box>
    );
}