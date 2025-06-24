import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useThemeContext } from '../contexts/ThemeContext';
import { LightMode, DarkMode } from '@mui/icons-material';

export default function Navbar({ user, onLogout }) {
    const { mode, toggleTheme } = useThemeContext();
    const navigate = useNavigate();

    const getDisplayName = () => {
        if (!user?.email) return 'User';
        const [first, last] = user.email.split('@')[0].split('.');
        return `${capitalize(first)} ${last?.charAt(0).toUpperCase() || ''}.`;
    };

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    NCS Ask Tracker
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button color="inherit" component={RouterLink} to="/">Dashboard</Button>
                    <Button color="inherit" component={RouterLink} to="/tracker">Tracker</Button>
                    <Button color="inherit" component={RouterLink} to="/history">History</Button>
                    <Button color="inherit" component={RouterLink} to="/trends">Trends</Button>
                    <Button color="inherit" component={RouterLink} to="/goals">Goals</Button>
                    <Button color="inherit" component={RouterLink} to="/challenges">
                        Challenges
                    </Button>
                    <Button color="inherit" component={RouterLink} to="/export">Export</Button>
                    <Button color="inherit" component={RouterLink} to="/profile">
                        Profile
                    </Button>
                </Box>

                {(user?.role === 'manager' || user?.role === 'admin') && (
                    <Button component={RouterLink} to="/manager" color="inherit">
                        Manager Dashboard
                    </Button>
                )}

                <Typography sx={{ mx: 2 }}>Welcome {getDisplayName()}</Typography>

                <IconButton onClick={toggleTheme} color="inherit">
                    {mode === 'light' ? <DarkMode /> : <LightMode />}
                </IconButton>

                <Button color="inherit" onClick={onLogout}>Logout</Button>
            </Toolbar>
        </AppBar>
    );
}