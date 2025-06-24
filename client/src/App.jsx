// src/App.jsx

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthForm from './components/Authform';
import Dashboard from './components/Dashboard';
import DailyTracker from './components/DailyTracker';
import HistoryViewer from './components/HistoryViewer';
import TrendsChart from './components/TrendsChart';
import GoalSettings from './components/GoalSettings';
import AnalyticsExport from './components/AnalyticsExport';
import ChallengeDashboard from './components/ChallengeDashboard';
import ChallengeCreator from './components/ChallengeCreator';
import UserProfile from './components/UserProfile';
import ManagerDashboard from './components/ManagerDashboard';
import Navbar from './components/Navbar';
import { useThemeContext } from './contexts/ThemeContext';
import { Box } from '@mui/material';

axios.defaults.baseURL = 'http://localhost:5000';

// Simple JWT decoder: splits the token, base64‐url decodes the payload, parses JSON
function jwtDecode(token) {
  try {
    const payload = token.split('.')[1];
    // pad base64 string if needed
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    return JSON.parse(json);
  } catch (e) {
    console.error('Invalid JWT format', e);
    return {};
  }
}

function App() {
  const [user, setUser] = useState(null);
  const chartRef = useRef();
  const { mode, toggleTheme } = useThemeContext();

  const bootstrapUser = async (token) => {
    try {
      const decoded = jwtDecode(token);

      // 1) Set the bare minimum so routes render immediately
      setUser({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
      });
      axios.defaults.headers.common['x-auth-token'] = token;

      // 2) Fetch the full user profile
      const { data } = await axios.get(`/api/users/${decoded.id}/profile`);
      const { user: full } = data;
      setUser((prev) => ({
        ...prev,
        firstName: full.firstName,
        lastName: full.lastName,
        team: full.team,
        badges: full.badges,
      }));
    } catch (err) {
      console.error('Failed to bootstrap user:', err);
      localStorage.removeItem('auth-token');
      setUser(null);
    }
  };

  // On mount: look for a token
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (token) bootstrapUser(token);
  }, []);

  // Called after a successful login
  const handleLogin = (userPayload, token) => {
    localStorage.setItem('auth-token', token);
    bootstrapUser(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    delete axios.defaults.headers.common['x-auth-token'];
    setUser(null);
  };

  // If no user yet, show login/register form
  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogout} />

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: (t) => t.palette.background.default,
          color: (t) => t.palette.text.primary,
          p: 2,
          transition: 'all 0.3s ease',
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracker" element={<DailyTracker onSubmit={() => { }} />} />
          <Route path="/history" element={<HistoryViewer />} />
          <Route path="/trends" element={<TrendsChart chartRef={chartRef} />} />
          <Route path="/goals" element={<GoalSettings />} />
          <Route path="/export" element={<AnalyticsExport chartRef={chartRef} />} />

          {/* 1:1 Challenges */}
          <Route path="/challenges" element={<ChallengeDashboard currentUser={user} />} />
          <Route
            path="/challenge"
            element={<ChallengeCreator currentUser={user} onCreated={() => { }} />}
          />

          {/* Profile */}
          <Route path="/profile" element={<UserProfile currentUser={user} />} />

          {/* Manager only */}
          <Route
            path="/manager"
            element={
              user.role === 'manager' || user.role === 'admin' ? (
                <ManagerDashboard currentUser={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;