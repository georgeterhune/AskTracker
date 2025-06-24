// client/src/components/ManagerDashboard.jsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    Grid,
    Paper,
    Button,
    Stack,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Divider,
    TextField,
} from '@mui/material';

// Make sure these two lines are present:
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';

import TeamBattleManager from './TeamBattleManager';

export default function ManagerDashboard({ currentUser }) {
    // ─── Guard against missing currentUser ─────────────────
    if (!currentUser?.id) {
        return (
            <Box textAlign="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }

    // ─── State for “All Teams Overview” ───────────────────
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('All');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [preset, setPreset] = useState('Last 30 Days');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ─── Show/Hide the TeamBattles panel ───────────────────
    const [showTeamBattles, setShowTeamBattles] = useState(false);

    // Whenever “preset” changes, recalc startDate/endDate:
    useEffect(() => {
        const today = new Date();
        if (preset === 'Last 7 Days') {
            setStartDate(subDays(today, 6));
            setEndDate(today);
        } else if (preset === 'Last 30 Days') {
            setStartDate(subDays(today, 29));
            setEndDate(today);
        } else if (preset === 'This Month') {
            setStartDate(startOfMonth(today));
            setEndDate(endOfMonth(today));
        } else if (preset === 'Custom') {
            // leave dates for manual pick
        }
    }, [preset]);

    // Fetch “All Teams” whenever date filters change:
    useEffect(() => {
        const fetchTeams = async () => {
            setLoading(true);
            setError('');

            try {
                const params = {};
                if (startDate) params.startDate = startDate.toISOString();
                if (endDate) params.endDate = endDate.toISOString();

                const res = await axios.get(
                    'http://localhost:5000/api/manager/teams',
                    {
                        headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                        params,
                    }
                );

                // Sort by askPercent descending:
                const sorted = res.data.sort(
                    (a, b) => b.teamStats.askPercent - a.teamStats.askPercent
                );
                setTeams(sorted);
            } catch (err) {
                console.error('Error loading teams:', err.response || err);
                setError('Failed to load teams.');
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [startDate, endDate]);

    // Helper to find the “top performer” in a team
    const getTopPerformer = (members) => {
        return members.reduce(
            (top, curr) => (curr.askPercent > top.askPercent ? curr : top),
            members[0]
        );
    };

    // ─── generateCSV (MUST be defined before JSX) ─────────
    const generateCSV = () => {
        const teamsToExport =
            selectedTeam === 'All'
                ? teams
                : teams.filter((team) => team.team === selectedTeam);

        const rows = [];
        teamsToExport.forEach((team) => {
            rows.push([`Team: ${team.team}`]);
            rows.push(['Name', 'Asks', 'Calls', 'Ask %', 'BLRs', 'TSRs']);

            team.members.forEach((member) => {
                rows.push([
                    formatManagerName(member.email),
                    member.totalAsks,
                    member.totalCalls,
                    `${member.askPercent}%`,
                    member.totalBLRs,
                    member.totalTSRs,
                ]);
            });

            rows.push([]); // blank line
        });

        const csvContent = rows.map((r) => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
            'download',
            `Ask_Report_${selectedTeam === 'All' ? 'All' : selectedTeam}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ─── generatePDF (MUST be defined before JSX) ─────────
    const generatePDF = async (startDate, endDate) => {
        // Dynamic import so Vite can tree-shake properly:
        const jsPDFModule = await import('jspdf');
        const autoTable = await import('jspdf-autotable');
        const jsPDF = jsPDFModule.default;
        const doc = new jsPDF();

        const formatDate = (date) =>
            new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });

        const dateLabel =
            startDate && endDate
                ? `Date Range: ${formatDate(startDate)} – ${formatDate(endDate)}`
                : 'Date Range: All Time';

        try {
            const params = {};
            if (startDate) params.startDate = startDate.toISOString();
            if (endDate) params.endDate = endDate.toISOString();

            const res = await axios.get(
                'http://localhost:5000/api/manager/teams',
                {
                    headers: { 'x-auth-token': localStorage.getItem('auth-token') },
                    params,
                }
            );

            const filteredTeams =
                selectedTeam === 'All'
                    ? res.data
                    : res.data.filter((team) => team.team === selectedTeam);

            doc.setFontSize(16);
            doc.text('Team Performance Report', 14, 20);
            doc.setFontSize(12);
            doc.text(dateLabel, 14, 30);

            let yOffset = 40;
            filteredTeams.forEach((team) => {
                const teamHeaderY = yOffset;
                doc.setFontSize(14);
                doc.text(`${team.team}`, 14, teamHeaderY);

                autoTable.default(doc, {
                    startY: teamHeaderY + 6,
                    head: [['Name', 'Asks', 'Calls', 'Ask %', 'BLRs', 'TSRs']],
                    body: team.members.map((member) => [
                        formatManagerName(member.email),
                        member.totalAsks,
                        member.totalCalls,
                        `${member.askPercent}%`,
                        member.totalBLRs,
                        member.totalTSRs,
                    ]),
                    styles: { fontSize: 10 },
                    theme: 'grid',
                });

                yOffset = doc.lastAutoTable.finalY + 12;
            });

            const filename = `AskReport_${formatDate(
                startDate
            )}_to_${formatDate(endDate)}.pdf`;
            doc.save(filename);
        } catch (err) {
            console.error('PDF export failed:', err);
        }
    };

    // ───────────────────────────────────────────────────────────
    return (
        <Box sx={{ mt: 4, px: 2 }}>
            {/* ────────── Header w/ Team Battles toggle ────────── */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography variant="h5" gutterBottom>
                    🏆 All Teams Overview
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => setShowTeamBattles((prev) => !prev)}
                >
                    {showTeamBattles ? 'Close Team Battles' : 'Team Battles'}
                </Button>
            </Box>

            {/* ────────── Conditionally render TeamBattleManager ────────── */}
            {showTeamBattles && (
                <Box mb={4}>
                    <TeamBattleManager currentUser={currentUser} />
                    <Divider sx={{ my: 4 }} />
                </Box>
            )}

            {/* ─── Filters & Export Buttons ───────────────────────────────── */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Select
                        value={preset}
                        onChange={(e) => setPreset(e.target.value)}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="Last 7 Days">Last 7 Days</MenuItem>
                        <MenuItem value="Last 30 Days">Last 30 Days</MenuItem>
                        <MenuItem value="This Month">This Month</MenuItem>
                        <MenuItem value="Custom">Custom</MenuItem>
                    </Select>

                    {preset === 'Custom' && (
                        <>
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(newDate) => setStartDate(newDate)}
                                renderInput={(params) => <TextField {...params} />}
                                sx={{ width: 150 }}
                            />
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={(newDate) => setEndDate(newDate)}
                                renderInput={(params) => <TextField {...params} />}
                                sx={{ width: 150 }}
                            />
                        </>
                    )}

                    <Button variant="contained" onClick={() => { /* refresh happens automatically */ }}>
                        Apply
                    </Button>

                    {/* Team selector */}
                    <Box display="flex" alignItems="center" ml="auto">
                        <Typography mr={1}>Select Team:</Typography>
                        <Select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            sx={{ minWidth: 140 }}
                        >
                            <MenuItem value="All">All Teams</MenuItem>
                            {teams.map((team) => (
                                <MenuItem key={team.team} value={team.team}>
                                    {team.team}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>

                    {/* Export buttons */}
                    <Stack direction="row" spacing={2} ml={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PictureAsPdfIcon />}
                            onClick={() => generatePDF(startDate, endDate)}
                        >
                            Download PDF
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<TableViewIcon />}
                            onClick={generateCSV}
                        >
                            Download CSV
                        </Button>
                    </Stack>
                </Stack>
            </LocalizationProvider>

            <Box sx={{ mt: 3 }}>
                {loading ? (
                    <Box textAlign="center" mt={4}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    teams
                        .filter((team) =>
                            selectedTeam === 'All' ? true : team.team === selectedTeam
                        )
                        .map((team) => {
                            const topPerformer = getTopPerformer(team.members);
                            return (
                                <Accordion key={team.team} sx={{ mb: 2 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box display="flex" alignItems="center">
                                            <Typography variant="h6">{team.team}</Typography>
                                            <Typography sx={{ ml: 2, color: 'gray' }}>
                                                | Ask %: {team.teamStats.askPercent}% |
                                                BLRs: {team.teamStats.totalBLRs} | TSRs:
                                                {team.teamStats.totalTSRs}
                                            </Typography>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            {team.members.map((member) => (
                                                <Grid item key={member.email} xs={12} md={6}>
                                                    <Paper
                                                        elevation={2}
                                                        sx={{
                                                            p: 2,
                                                            border:
                                                                member.email === topPerformer.email
                                                                    ? '2px solid gold'
                                                                    : undefined,
                                                            backgroundColor:
                                                                member.email === topPerformer.email
                                                                    ? '#fff8e1'
                                                                    : undefined,
                                                        }}
                                                    >
                                                        <Typography variant="subtitle1">
                                                            {formatManagerName(member.email)}
                                                            {member.email === topPerformer.email &&
                                                                ' 🏅 Top Performer'}
                                                        </Typography>
                                                        <Typography>
                                                            Total Calls: {member.totalCalls}
                                                        </Typography>
                                                        <Typography>Asks: {member.totalAsks}</Typography>
                                                        <Typography>
                                                            Ask %: {member.askPercent}%
                                                        </Typography>
                                                        <Typography>BLRs: {member.totalBLRs}</Typography>
                                                        <Typography>TSRs: {member.totalTSRs}</Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })
                )}
            </Box>
        </Box>
    );
}

// Helper to format “first.last@…” ➞ “First Last”
const formatManagerName = (email) => {
    const [user] = email.split('@');
    const [first, last] = user.split('.');
    return `${capitalize(first)} ${capitalize(last)}`;
};
const capitalize = (s) => s?.charAt(0).toUpperCase() + s?.slice(1);