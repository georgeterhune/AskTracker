// client/src/components/Dashboard.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import RecentRecords from './RecentRecords';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    Grid,
} from '@mui/material';

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await axios.get('/api/daily/summary', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });
                setSummary(res.data.summary);
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

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

    if (!summary) {
        // We got a response, but summary was null
        return (
            <Box textAlign="center" mt={4}>
                <Typography>No data to display yet — start by logging your first daily record!</Typography>
            </Box>
        );
    }

    // Prepare an array of key/value pairs for grid rendering
    const stats = [
        { label: 'Days Tracked', value: summary.daysTracked },
        { label: 'Total Calls', value: summary.totalCalls },
        { label: 'Asks', value: summary.totalAsks },
        { label: 'Ask %', value: `${summary.askPercent}%` },
        { label: 'NCS %', value: `${summary.ncsPercent}%` },
        { label: 'BLRs', value: summary.totalBLRs },
        { label: 'TSRs', value: summary.totalTSRs },
        { label: 'Thank Yous', value: summary.thankYous },
        { label: 'Assurances', value: summary.assurances },
        { label: 'Avg Calls/Day', value: summary.avgCallsPerDay },
    ];

    return (
        <Box sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4 } }}>
            {/* Dashboard Header */}
            <Typography variant="h4" gutterBottom>
                📊 Dashboard Overview
            </Typography>

            {/* Grid of Statistic Cards */}
            <Grid container spacing={2}>
                {stats.map((stat) => (
                    <Grid item xs={12} sm={6} md={4} key={stat.label}>
                        <Paper
                            elevation={2}
                            sx={{
                                p: 2,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <Typography variant="subtitle1" color="textSecondary">
                                {stat.label}
                            </Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>
                                {stat.value}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Recent Activity Section */}
            <Box sx={{ mt: 4 }}>
                <Paper elevation={1} sx={{ p: 2 }}>
                    <RecentRecords />
                </Paper>
            </Box>
        </Box>
    );
}