// src/components/AnalyticsExport.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { Box, Button, Typography, Stack, TextField } from '@mui/material';
import 'react-datepicker/dist/react-datepicker.css';

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-US') : '';

export default function AnalyticsExport({ chartRef }) {
    const [records, setRecords] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    useEffect(() => {
        (async () => {
            const res = await axios.get('/api/daily', {
                headers: { 'x-auth-token': localStorage.getItem('auth-token') },
            });
            setRecords(res.data);
        })();
    }, []);

    useEffect(() => {
        if (!startDate || !endDate) return;
        setFiltered(
            records.filter((r) => {
                const d = new Date(r.date);
                return d >= startDate && d <= endDate;
            })
        );
    }, [startDate, endDate, records]);

    const getSummary = () => {
        const s = {
            totalCalls: 0,
            totalAsks: 0,
            totalNCS: 0,
            blrs: 0,
            tsrs: 0,
            thankYous: 0,
            assurances: 0,
            bestAskDay: null,
            mostLeadsDay: null,
        };
        let bestAsk = 0,
            mostLeads = 0;

        filtered.forEach((r) => {
            s.totalCalls += r.totalCalls;
            s.totalAsks += r.asks;
            s.totalNCS += r.ncsOpenUsed;
            s.blrs += r.blrCount;
            s.tsrs += r.tsrCount;
            s.thankYous += r.thankYouCount;
            s.assurances += r.assuranceUsed;

            const ap = r.totalCalls ? (r.asks / r.totalCalls) * 100 : 0;
            if (ap > bestAsk) {
                bestAsk = ap;
                s.bestAskDay = { date: r.date, percent: ap.toFixed(1) };
            }

            const leads = r.blrCount + r.tsrCount;
            if (leads > mostLeads) {
                mostLeads = leads;
                s.mostLeadsDay = {
                    date: r.date,
                    total: leads,
                    blrs: r.blrCount,
                    tsrs: r.tsrCount,
                };
            }
        });

        s.avgAsk = s.totalCalls ? (s.totalAsks / s.totalCalls) * 100 : 0;
        return s;
    };

    const exportPDF = async () => {
        const summary = getSummary();
        const doc = new jsPDF();
        const title = `Performance Summary (${formatDate(startDate)} to ${formatDate(
            endDate
        )})`;
        doc.text(title, 14, 16);
        doc.text(`Target Ask %: ${(
            (await axios.get('/api/preferences', {
                headers: { 'x-auth-token': localStorage.getItem('auth-token') },
            })
            ).data.targetAskPercent) || '--'}%`, 14, 24);

        autoTable(doc, {
            startY: 32,
            head: [['Metric', 'Value']],
            body: [
                ['Total Calls', summary.totalCalls],
                ['Total Asks', summary.totalAsks],
                ['Average Ask %', summary.avgAsk.toFixed(1) + '%'],
                ['Total NCS Opens', summary.totalNCS],
                ['BLRs', summary.blrs],
                ['TSRs', summary.tsrs],
                ['Thank Yous', summary.thankYous],
                ['Assurances', summary.assurances],
                summary.bestAskDay
                    ? [
                        'Best Ask Day',
                        `${summary.bestAskDay.date} (${summary.bestAskDay.percent}%)`,
                    ]
                    : [],
                summary.mostLeadsDay
                    ? [
                        'Most Leads Day',
                        `${summary.mostLeadsDay.date}: ${summary.mostLeadsDay.total}`,
                    ]
                    : [],
            ],
        });

        if (chartRef?.current) {
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
            });
            const imgData = canvas.toDataURL('image/png');
            const y = doc.previousAutoTable.finalY + 10;
            doc.addImage(imgData, 'PNG', 14, y, 180, 90);
        }

        doc.save('ask-tracker-summary.pdf');
    };

    const exportCSV = () => {
        const s = getSummary();
        const rows = [
            ['Metric', 'Value'],
            ['Total Calls', s.totalCalls],
            ['Total Asks', s.totalAsks],
            ['Average Ask %', s.avgAsk.toFixed(1) + '%'],
            ['Total NCS Opens', s.totalNCS],
            ['BLRs', s.blrs],
            ['TSRs', s.tsrs],
            ['Thank Yous', s.thankYous],
            ['Assurances', s.assurances],
        ];
        if (s.bestAskDay)
            rows.push([
                'Best Ask Day',
                `${s.bestAskDay.date} (${s.bestAskDay.percent}%)`,
            ]);
        if (s.mostLeadsDay)
            rows.push([
                'Most Leads Day',
                `${s.mostLeadsDay.date}: ${s.mostLeadsDay.total}`,
            ]);

        const csv = rows.map((r) => r.join(',')).join('\n');
        saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'summary.csv');
    };

    const summary = getSummary();

    return (
        <Box sx={{ mt: 4, mx: 'auto', maxWidth: 600 }}>
            <Typography variant="h5" gutterBottom>
                📊 Export Analytics Summary
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <DatePicker
                    selected={startDate}
                    onChange={(d) => setStartDate(d)}
                    placeholderText="Start Date"
                />
                <DatePicker
                    selected={endDate}
                    onChange={(d) => setEndDate(d)}
                    placeholderText="End Date"
                    minDate={startDate}
                />
            </Stack>
            {filtered.length > 0 && (
                <>
                    <ul>
                        <li>
                            <strong>Total Calls:</strong> {summary.totalCalls}
                        </li>
                        <li>
                            <strong>Total Asks:</strong> {summary.totalAsks}
                        </li>
                        <li>
                            <strong>Average Ask %:</strong> {summary.avgAsk.toFixed(1)}%
                        </li>
                        <li>
                            <strong>Total NCS Opens:</strong> {summary.totalNCS}
                        </li>
                        <li>
                            <strong>BLRs:</strong> {summary.blrs}
                        </li>
                        <li>
                            <strong>TSRs:</strong> {summary.tsrs}
                        </li>
                        <li>
                            <strong>Thank Yous:</strong> {summary.thankYous}
                        </li>
                        <li>
                            <strong>Assurances:</strong> {summary.assurances}
                        </li>
                    </ul>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" onClick={exportPDF}>
                            📄 Export PDF
                        </Button>
                        <Button variant="outlined" onClick={exportCSV}>
                            📥 Export CSV
                        </Button>
                    </Stack>
                </>
            )}
        </Box>
    );
}