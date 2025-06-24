import { createContext, useState, useMemo, useContext } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState('light');

    const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            primary: { main: '#1976d2' },
            secondary: { main: '#00c49f' },
        },
        typography: {
            fontFamily: 'Roboto, sans-serif',
        },
    }), [mode]);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => useContext(ThemeContext);