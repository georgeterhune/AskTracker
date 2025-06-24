// src/components/CreateChallengeDialog.jsx

import React, { useState, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Autocomplete,
    Box,
    Typography,
} from '@mui/material';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // if you're using @mui/x-date-pickers

/**
 * Props:
 * - open       : boolean, whether the dialog is open
 * - onClose    : function(), called to close the dialog
 * - currentUser: { _id, firstName, lastInitial, team } (from App.jsx or context)
 *
 * This component assumes you have an endpoint:
 *   GET /api/users?team=<teamName>
 * that returns all users in the same team (so you can challenge only teammates).
 */
export default function CreateChallengeDialog({ open, onClose, currentUser }) {
    const [allTeammates, setAllTeammates] = useState([]); // list of { _id, firstName, lastInitial }
    const [selectedTeammate, setSelectedTeammate] = useState(null);
    const [metric, setMetric] = useState('askPercent');
    const [windowDays, setWindow] = useState(7);
    const [startDate, setStartDate] = useState(new Date());
    const [errorMsg, setErrorMsg] = useState('');

    // 1) Fetch all teammates (excluding the current user)
    useEffect(() => {
        async function fetchTeammates() {
            try {
                // Replace with your actual users-by-team endpoint
                const res = await axios.get('http://localhost:5000/api/users', {
                    params: { team: currentUser.team },
                });
                // Filter out the current user
                const others = res.data.filter(
                    (u) => u._id !== currentUser._id
                );
                setAllTeammates(others);
            } catch (err) {
                console.error('Failed to load teammates:', err);
                setErrorMsg('Could not load teammates.');
            }
        }
        if (currentUser?.team) {
            fetchTeammates();
        }
    }, [currentUser]);

    // 2) Handle “Send Challenge”
    const handleSend = async () => {
        setErrorMsg('');
        if (!selectedTeammate) {
            setErrorMsg('Please select a teammate to challenge.');
            return;
        }
        if (!windowDays || windowDays < 1) {
            setErrorMsg('Window must be at least 1 day.');
            return;
        }

        try {
            await axios.post(
                'http://localhost:5000/api/challenges',
                {
                    challengerId: currentUser._id,
                    challengeeId: selectedTeammate._id,
                    metric,
                    window: windowDays,
                    startDate: startDate.toISOString(), // back end normalizes to midnight
                },
                {
                    headers: {
                        'x-auth-token': localStorage.getItem('auth-token'),
                    },
                }
            );
            // On success: close the dialog
            onClose();
        } catch (err) {
            console.error('Failed to send challenge:', err.response || err);
            setErrorMsg(
                err.response?.data?.error ||
                'Error sending challenge. Try again.'
            );
        }
    };

    // 3) Render the dialog
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Create a 1v1 Challenge</DialogTitle>
            <DialogContent dividers>
                {errorMsg && (
                    <Typography color="error" variant="body2" gutterBottom>
                        {errorMsg}
                    </Typography>
                )}
                {/* Autocomplete for Teammates */}
                <Autocomplete
                    options={allTeammates}
                    getOptionLabel={(u) =>
                        `${u.firstName} ${u.lastInitial}.`
                    }
                    value={selectedTeammate}
                    onChange={(e, newVal) => setSelectedTeammate(newVal)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Select Teammate"
                            margin="normal"
                            required
                        />
                    )}
                />

                {/* Metric Selector */}
                <TextField
                    select
                    fullWidth
                    label="Metric"
                    value={metric}
                    margin="normal"
                    onChange={(e) => setMetric(e.target.value)}
                >
                    <MenuItem value="askPercent">Ask %</MenuItem>
                    <MenuItem value="ncsPercent">NCS %</MenuItem>
                    <MenuItem value="blrCount">BLR Count</MenuItem>
                    <MenuItem value="tsrCount">TSR Count</MenuItem>
                </TextField>

                {/* Window (number of days) */}
                <TextField
                    type="number"
                    fullWidth
                    label="Window (days)"
                    value={windowDays}
                    margin="normal"
                    onChange={(e) => setWindow(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                />

                {/* Optional Start Date */}
                <Box mt={2}>
                    <DatePicker
                        label="Start Date"
                        value={startDate}
                        onChange={(newDate) => {
                            if (newDate) {
                                // Normalize to midnight
                                const d = new Date(newDate);
                                d.setHours(0, 0, 0, 0);
                                setStartDate(d);
                            }
                        }}
                        disablePast
                        renderInput={(params) => (
                            <TextField {...params} fullWidth margin="normal" />
                        )}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSend}>
                    Send Challenge
                </Button>
            </DialogActions>
        </Dialog>
    );
}