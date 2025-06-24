import { useEffect, useState } from 'react';
import axios from 'axios';

export default function StreaksDashboard() {
    const [records, setRecords] = useState([]);
    const [streak, setStreak] = useState(0);
    const [todayProgress, setTodayProgress] = useState(null);
    const [longest, setLongest] = useState(0);
    const [prefs, setPrefs] = useState({ targetAskPercent: 50, minCallsPerDay: 10 });

    useEffect(() => {
        const fetchPrefs = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/preferences', {
                    headers: {
                        'x-auth-token': localStorage.getItem('auth-token'),
                    },
                });
                setPrefs(res.data);
            } catch (err) {
                console.error('Failed to fetch user preferences', err);
            }
        };
        const fetchRecords = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/daily', {
                    headers: {
                        'x-auth-token': localStorage.getItem('auth-token'),
                    },
                });

                const sorted = res.data
                    .sort((a, b) => new Date(b.date) - new Date(a.date)) // newest first
                    .map((r) => ({
                        date: r.date,
                        askPercent: r.totalCalls ? (r.asks / r.totalCalls) * 100 : 0,
                        totalCalls: r.totalCalls,
                        asks: r.asks,
                    }));

                setRecords(sorted);

                // === Compute current streak (most recent consecutive days ≥ 50%) ===
                let streakCount = 0;
                for (const day of sorted) {
                    if (day.askPercent >= prefs.targetAskPercent) {
                        streakCount++;
                    } else {
                        break;
                    }
                }
                setStreak(streakCount);

                // === Compute longest streak ever ===
                let longestSoFar = 0;
                let temp = 0;

                for (const day of [...sorted].reverse()) {
                    if (day.askPercent >= prefs.targetAskPercent) {
                        temp++;
                        if (temp > longestSoFar) longestSoFar = temp;
                    } else {
                        temp = 0;
                    }
                }
                setLongest(longestSoFar);

                // === Find today's record ===
                const todayStr = new Date().toISOString().split('T')[0];
                const today = sorted.find((r) => r.date === todayStr);
                if (today) {
                    setTodayProgress({
                        percent: Math.round((today.asks / today.totalCalls) * 100),
                        asks: today.asks,
                        total: today.totalCalls,
                    });
                }

            } catch (err) {
                console.error('Error fetching streak data:', err);
            }
        };
        fetchPrefs().then(fetchRecords);
        fetchRecords();
    }, []);

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2>🔥 Streak & Goal Tracker</h2>

            <p>
                <strong>Current Streak:</strong> {streak} day{streak !== 1 ? 's' : ''} in a row with an
                <strong> Ask % of {prefs.targetAskPercent}% or higher</strong>
            </p>
            <p>
                <strong>Longest Streak Ever:</strong> {longest} day{longest !== 1 ? 's' : ''}
            </p>

            {todayProgress ? (
                <>
                    <p>
                        <strong>Today’s Ask %:</strong> {todayProgress.percent}% ({todayProgress.asks}/{todayProgress.total})
                    </p>
                    <p>
                        {todayProgress.percent >= prefs.targetAskPercent
                            ? '✅ You’re on track today!'
                            : `🔁 Aim for ${prefs.targetAskPercent}% Ask Rate`}
                    </p>
                </>
            ) : (
                <p>No data yet for today.</p>
            )}
        </div>
    );
}