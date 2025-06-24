// server/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function capitalize(str) {
    return str?.charAt(0).toUpperCase() + str?.slice(1);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        role = 'user',
        managerCode,
        managerId,
    } = req.body;

    // Require names
    if (!firstName || !lastName) {
        return res.status(400).json({ error: 'First name and last name are required.' });
    }

    try {
        // Check duplicate
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let assignedRole = role;
        let teamName = '';

        if (role === 'manager') {
            // manager signup path
            if (managerCode?.trim() !== process.env.MANAGER_ACCESS_CODE?.trim()) {
                return res.status(400).json({ error: 'Invalid manager access code.' });
            }
            // generate a team name from their email
            const [first, last] = email.split('@')[0].split('.');
            teamName = `Team ${capitalize(last || first)}`;
        }

        if (role === 'user') {
            // user signup path: must supply managerId
            if (!managerId) {
                return res.status(400).json({ error: 'managerId is required for user sign up.' });
            }
            const manager = await User.findById(managerId);
            if (!manager) {
                return res.status(400).json({ error: 'Manager not found.' });
            }
            const [first, last] = manager.email.split('@')[0].split('.');
            teamName = `Team ${capitalize(last || first)}`;
        }

        const newUser = new User({
            email,
            password: hashedPassword,
            firstName,            // ← store first name
            lastName,             // ← store last name
            role: assignedRole,
            managerId: role === 'user' ? managerId : undefined,
            team: teamName,
        });

        await newUser.save();
        return res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials.' });

        // (Optional) Hardcode an admin override for a special email
        const roleForToken =
            user.email === 'george.terhune@schwab.com' ? 'admin' : user.role;

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: roleForToken,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Return user payload including names
        return res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: roleForToken,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/managers
router.get('/managers', async (req, res) => {
    try {
        // Return managers with their names, not just email
        const managers = await User.find(
            { role: 'manager' },
            '_id email firstName lastName'
        );
        return res.json(managers);
    } catch (err) {
        console.error('Error fetching managers:', err);
        return res.status(500).json({ error: 'Failed to fetch managers.' });
    }
});

module.exports = router;