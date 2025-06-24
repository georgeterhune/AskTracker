// src/components/TrendsChart.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    TextField,
    CircularProgress,
} from '@mui/material';
import {
    LocalizationProvider,
    DatePicker,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

export default function TrendsChart({ chartRef }) {
    const [records, setRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [range, setRange] = useState('7');
    const [customStart, setCustomStart] = useState(null);
    const [customEnd, setCustomEnd] = useState(null);
    const [goals, setGoals] = useState({});
    const [loading, setLoading] = useState(true);

    // 1) Fetch and preprocess raw records
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/daily', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });

                const processed = res.data
                    .map((r) => {
                        const localMidnight = new Date(r.date + 'T00:00');
                        return {
                            dateObj: localMidnight,
                            displayDate: localMidnight.toLocaleDateString(),
                            askPercent: r.totalCalls
                                ? Math.round((r.asks / r.totalCalls) * 100)
                                : 0,
                            ncsPercent: r.totalCalls
                                ? Math.round((r.ncsOpenUsed / r.totalCalls) * 100)
                                : 0,
                            blrs: r.blrCount,
                            tsrs: r.tsrCount,
                        };
                    })
                    .sort((a, b) => a.dateObj - b.dateObj);

                setRecords(processed);
                setFilteredData(processed);
            } catch (err) {
                console.error('Error fetching trends data:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // 2) Re-filter whenever range / custom dates change
    useEffect(() => {
        if (records.length === 0) return;

        const today = new Date();
        let filtered = [];

        if (range === '7' || range === '30') {
            const days = Number(range);
            const cutoff = new Date(today);
            cutoff.setDate(cutoff.getDate() - days + 1);
            filtered = records.filter((r) => r.dateObj >= cutoff);
        } else if (range === 'all') {
            filtered = records;
        } else if (range === 'custom' && customStart && customEnd) {
            filtered = records.filter(
                (r) => r.dateObj >= customStart && r.dateObj <= customEnd
            );
        }

        setFilteredData(filtered);
    }, [range, customStart, customEnd, records]);

    // 3) Fetch goals for reference lines
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/preferences', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });
                setGoals(res.data || {});
            } catch (err) {
                console.error('Error fetching user goals:', err);
            }
        })();
    }, []);

    if (loading) {
        return (
            <Box textAlign="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box ref={chartRef} sx={{ mt: 4, px: 2 }}>
            <Typography variant="h4" gutterBottom>
                📊 Performance Trends
            </Typography>

            {/* ─── Date Range Selector ─── */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="center"
                    sx={{ mb: 3 }}
                >
                    <FormControl sx={{ minWidth: 180 }}>
                        <InputLabel>Date Range</InputLabel>
                        <Select
                            value={range}
                            label="Date Range"
                            onChange={(e) => setRange(e.target.value)}
                        >
                            <MenuItem value="7">Last 7 Days</MenuItem>
                            <MenuItem value="30">Last 30 Days</MenuItem>
                            <MenuItem value="all">All Time</MenuItem>
                            <MenuItem value="custom">Custom Range</MenuItem>
                        </Select>
                    </FormControl>

                    {range === 'custom' && (
                        <>
                            <DatePicker
                                label="Start Date"
                                value={customStart}
                                onChange={setCustomStart}
                                renderInput={(params) => (
                                    <TextField {...params} sx={{ minWidth: 140 }} />
                                )}
                            />
                            <DatePicker
                                label="End Date"
                                value={customEnd}
                                minDate={customStart}
                                onChange={setCustomEnd}
                                renderInput={(params) => (
                                    <TextField {...params} sx={{ minWidth: 140 }} />
                                )}
                            />
                        </>
                    )}
                </Stack>
            </LocalizationProvider>

            {filteredData.length === 0 ? (
                <Typography>No data available for this range.</Typography>
            ) : (
                <>
                    {/* ─── Ask & NCS % Chart ─── */}
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                        🎯 Ask & NCS %
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="displayDate" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            {goals.targetAskPercent && (
                                <ReferenceLine
                                    y={goals.targetAskPercent}
                                    stroke="#82ca9d"
                                    strokeDasharray="4 4"
                                    label="Ask Goal"
                                />
                            )}
                            {goals.targetNcsPercent && (
                                <ReferenceLine
                                    y={goals.targetNcsPercent}
                                    stroke="#8884d8"
                                    strokeDasharray="4 4"
                                    label="NCS Goal"
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey="askPercent"
                                stroke="#82ca9d"
                                name="Ask %"
                            />
                            <Line
                                type="monotone"
                                dataKey="ncsPercent"
                                stroke="#8884d8"
                                name="NCS %"
                            />
                        </LineChart>
                    </ResponsiveContainer>

                    {/* ─── BLRs & TSRs Chart ─── */}
                    <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
                        📈 BLRs & TSRs (Counts)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="displayDate" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            {goals.weeklyBlrGoal && (
                                <ReferenceLine
                                    y={goals.weeklyBlrGoal / 7}
                                    stroke="#ff7300"
                                    strokeDasharray="4 4"
                                    label="BLR Daily Avg"
                                />
                            )}
                            {goals.weeklyTsrGoal && (
                                <ReferenceLine
                                    y={goals.weeklyTsrGoal / 7}
                                    stroke="#00c49f"
                                    strokeDasharray="4 4"
                                    label="TSR Daily Avg"
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey="blrs"
                                stroke="#ff7300"
                                name="BLRs"
                            />
                            <Line
                                type="monotone"
                                dataKey="tsrs"
                                stroke="#00c49f"
                                name="TSRs"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </>
            )}
        </Box>
    );
}