// ChallengeList.jsx (fragment)
import React from 'react';
import axios from 'axios';
import { Button, Typography, Box } from '@mui/material';

export default function ChallengeList({ pendingChallenges, currentUser }) {
    // pendingChallenges is an array of objects like:
    // { _id, challenger: { firstName, lastInitial }, metric, window, startDate, endDate }

    const handleRespond = async (challengeId, action) => {
        try {
            // We assume authentication is handled (e.g. JWT), so axios will send a token
            const response = await axios.put(`/api/challenges/${challengeId}/respond`, {
                action,
                // If you’re not using auth, include userId here:
                // userId: currentUser._id,
            });
            const updatedChallenge = response.data;

            // 1) Optionally show a toast/snackbar: “Challenge Accepted!” or “Challenge Declined.”  
            // 2) Refresh the pendingChallenges list (e.g. call your fetch again), so this one goes away.
            console.log('Updated challenge:', updatedChallenge);
        } catch (err) {
            console.error('Error responding to challenge:', err.response?.data ?? err);
            // Show an error toast if err.response.data.error exists
        }
    };

    return (
        <Box>
            <Typography variant="h6">Pending Invitations</Typography>
            {pendingChallenges.length ? (
                pendingChallenges.map((ch) => (
                    <Box key={ch._id} sx={{ mb: 1, p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
                        <Typography>
                            {ch.challenger.firstName} {ch.challenger.lastInitial}. has challenged you on “{ch.metric}” for{' '}
                            {ch.window} days (from {new Date(ch.startDate).toLocaleDateString()} to{' '}
                            {new Date(ch.endDate).toLocaleDateString()})
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={() => handleRespond(ch._id, 'Accept')}
                            >
                                Accept
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleRespond(ch._id, 'Decline')}
                            >
                                Decline
                            </Button>
                        </Box>
                    </Box>
                ))
            ) : (
                <Typography>No pending invitations.</Typography>
            )}
        </Box>
    );
}