// src/components/GoalSettings.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Stack,
} from '@mui/material';

export default function GoalSettings({ onUpdate }) {
    const [target, setTarget] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get('/api/preferences', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });
                setTarget(res.data.targetAskPercent ?? '');
            } catch (err) {
                console.error('Failed to load preferences', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(
                '/api/preferences',
                { targetAskPercent: target },
                { headers: { 'x-auth-token': localStorage.getItem('auth-token') } }
            );
            if (onUpdate) onUpdate();
            alert('Preferences saved!');
        } catch (err) {
            console.error('Failed to save preferences', err);
            alert('Could not save preferences.');
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
        <Card sx={{ mt: 4, maxWidth: 400, mx: 'auto' }}>
            <CardContent>
                <Typography variant="h5" gutterBottom align="center">
                    🎯 My Performance Goals
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField
                            label="Target Ask %"
                            type="number"
                            InputProps={{ inputProps: { min: 0, max: 100 } }}
                            value={target}
                            onChange={(e) => setTarget(Number(e.target.value))}
                            required
                            fullWidth
                        />
                        <Button type="submit" variant="contained" fullWidth>
                            Save Preferences
                        </Button>
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}