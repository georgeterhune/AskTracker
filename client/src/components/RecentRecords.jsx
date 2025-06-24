import { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function RecentRecords() {
    const [records, setRecords] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/daily', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });
                const sorted = res.data
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);

                setRecords(sorted);
            } catch (err) {
                console.error('Error fetching recent records:', err);
            }
        };

        fetchRecent();
    }, []);

    if (!records.length) return null;

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
                📆 Recent Activity
            </Typography>

            <Stack spacing={1}>
                {records.map((r) => (
                    <Paper key={r._id} elevation={2} sx={{ p: 1 }}>
                        <Typography variant="body1">
                            {new Date(r.date).toLocaleDateString()} — Ask %:{' '}
                            {r.totalCalls ? Math.round((r.asks / r.totalCalls) * 100) : 0}%,
                            BLRs: {r.blrCount}, TSRs: {r.tsrCount}
                        </Typography>
                    </Paper>
                ))}
            </Stack>

            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/history')}>
                View All
            </Button>
        </Box>
    );
}