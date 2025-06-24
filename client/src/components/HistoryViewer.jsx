import { useEffect, useState } from 'react';
import axios from 'axios';
import EditRecordForm from './EditRecordForm';
import {
    Button,
    useTheme,
    Box,
    Typography,
    IconButton,
    Stack,
    CircularProgress,
    Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function HistoryViewer() {
    const theme = useTheme();

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selected, setSelected] = useState(null);

    // Helper: parse “YYYY-MM-DD” as local midnight
    const parseLocalYMD = (ymd) => {
        const [y, m, d] = ymd.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    // Consistent date formatter
    const formatDate = (ymd) =>
        parseLocalYMD(ymd).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

    // Fetch history once
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('/api/daily', {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                });
                setRecords(res.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load history.');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Group into { year: { monthName: [records...] } }
    const groupByYearMonth = () => {
        const grouped = {};
        records.forEach((r) => {
            const dt = parseLocalYMD(r.date);
            const year = dt.getFullYear();
            const month = dt.toLocaleString('default', { month: 'long' });

            grouped[year] ??= {};
            grouped[year][month] ??= [];
            grouped[year][month].push(r);
        });
        return grouped;
    };

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

    const grouped = groupByYearMonth();
    const years = Object.keys(grouped).sort((a, b) => b - a);

    return (
        <Box sx={{ mt: 4, px: 2 }}>
            <Typography variant="h4" gutterBottom>📅 History Viewer</Typography>

            {/* 1) Pick year */}
            {!selectedYear && (
                <Box>
                    <Typography variant="h6">Select a Year</Typography>
                    {years.map((yr) => (
                        <Button
                            key={yr}
                            variant="outlined"
                            onClick={() => setSelectedYear(yr)}
                            sx={{ m: 1 }}
                        >
                            {yr}
                        </Button>
                    ))}
                </Box>
            )}

            {/* 2) Pick month */}
            {selectedYear && !selectedMonth && (
                <Box>
                    <Typography variant="h6">{selectedYear} — Select a Month</Typography>
                    {Object.keys(grouped[selectedYear]).map((mo) => (
                        <Button
                            key={mo}
                            variant="outlined"
                            onClick={() => setSelectedMonth(mo)}
                            sx={{ m: 1 }}
                        >
                            {mo}
                        </Button>
                    ))}
                    <Box mt={2}>
                        <Button onClick={() => setSelectedYear(null)}>⬅ Back to Years</Button>
                    </Box>
                </Box>
            )}

            {/* 3) Pick day */}
            {selectedYear && selectedMonth && !selected && (
                <Box>
                    <Typography variant="h6">
                        {selectedMonth} {selectedYear} — Select a Day
                    </Typography>
                    {grouped[selectedYear][selectedMonth].map((r) => (
                        <Stack
                            key={r._id}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                                maxWidth: 400,
                                mb: 1,
                                pb: 1,
                                borderBottom: '1px solid',
                                borderColor: theme.palette.divider,
                            }}
                        >
                            <Button
                                variant="outlined"
                                onClick={() => setSelected(r)}
                                sx={{ flexGrow: 1, textAlign: 'left' }}
                            >
                                {formatDate(r.date)}
                            </Button>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                    if (!window.confirm('Delete this record?')) return;
                                    try {
                                        await axios.delete(`/api/daily/${r._id}`, {
                                            headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                                        });
                                        setRecords((prev) => prev.filter((x) => x._id !== r._id));
                                    } catch {
                                        alert('Failed to delete record');
                                    }
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                    <Box mt={2}>
                        <Button onClick={() => setSelectedMonth(null)}>⬅ Back to Months</Button>
                    </Box>
                </Box>
            )}

            {/* 4) Edit form */}
            {selected && (
                <EditRecordForm
                    record={selected}
                    onClose={() => setSelected(null)}
                    onUpdated={() => {
                        setSelected(null);
                        setSelectedMonth(null);
                        setSelectedYear(null);
                        // you could also refetch instead of full reload:
                        window.location.reload();
                    }}
                />
            )}
        </Box>
    );
}