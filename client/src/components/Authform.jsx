// client/src/components/AuthForm.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Link,
  Stack,
} from '@mui/material';

export default function AuthForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');           // ← new
  const [lastName, setLastName] = useState('');             // ← new
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [isManager, setIsManager] = useState(false);
  const [managerCode, setManagerCode] = useState('');
  const [managerList, setManagerList] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');

  useEffect(() => {
    // Fetch managers only in register mode
    if (mode !== 'register') return;

    axios
      .get('/api/auth/managers')
      .then(res => setManagerList(res.data))
      .catch(err => console.error('Error fetching manager list', err));
  }, [mode]);

  // Capitalize helper
  const capitalize = str =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  // Show full last name instead of just initial
  const formatManagerName = email => {
    const [username] = email.split('@');
    const parts = username.split('.');
    if (parts.length >= 2) {
      const [first, last] = parts;
      return `${capitalize(first)} ${capitalize(last)}`;
    }
    return email;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const payload = { email, password };

      if (mode === 'register') {
        // require names
        if (!firstName.trim() || !lastName.trim()) {
          return alert('Please enter both first and last name.');
        }
        payload.firstName = firstName.trim();
        payload.lastName = lastName.trim();
        payload.role = isManager ? 'manager' : 'user';

        if (isManager) {
          payload.managerCode = managerCode;
        } else {
          payload.managerId = selectedManager;
        }
      }

      const res = await axios.post(`/api/auth/${endpoint}`, payload);

      if (mode === 'login') {
        const { token, user } = res.data;
        localStorage.setItem('auth-token', token);
        onLogin(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          token
        );
      } else {
        alert('Registration successful! Please log in now.');
        // Reset form
        setMode('login');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setIsManager(false);
        setManagerCode('');
        setSelectedManager('');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme => theme.palette.background.default,
        p: 2,
      }}
    >
      <Typography variant="h3" gutterBottom>
        NCS Ask Tracker
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ width: { xs: '100%', sm: 400 }, p: 2 }}
      >
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5" align="center">
                {mode === 'login' ? 'Login' : 'Register'}
              </Typography>

              {/* Registration only: name fields */}
              {mode === 'register' && (
                <>
                  <TextField
                    label="First Name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Last Name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    fullWidth
                  />
                </>
              )}

              <TextField
                label="Email"
                type="email"
                value={email}
                required
                fullWidth
                onChange={e => setEmail(e.target.value)}
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                required
                fullWidth
                onChange={e => setPassword(e.target.value)}
              />

              {mode === 'register' && (
                <>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isManager}
                          onChange={() => {
                            setIsManager(prev => !prev);
                            setManagerCode('');
                            setSelectedManager('');
                          }}
                        />
                      }
                      label="Registering as a Manager"
                    />
                  </FormGroup>

                  {isManager ? (
                    <TextField
                      label="Manager Access Code"
                      value={managerCode}
                      onChange={e => setManagerCode(e.target.value)}
                      fullWidth
                      helperText="Enter the code provided by admin"
                    />
                  ) : (
                    <TextField
                      select
                      label="Select Your Manager"
                      value={selectedManager}
                      onChange={e => setSelectedManager(e.target.value)}
                      required
                      fullWidth
                    >
                      {managerList.map(mgr => (
                        <MenuItem key={mgr._id} value={mgr._id}>
                          {formatManagerName(mgr.email)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </>
              )}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                {mode === 'login' ? 'Login' : 'Register'}
              </Button>

              <Typography align="center">
                {mode === 'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'}{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() =>
                    setMode(prev => (prev === 'login' ? 'register' : 'login'))
                  }
                  sx={{ fontWeight: 500 }}
                >
                  {mode === 'login' ? 'Register' : 'Login'}
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}