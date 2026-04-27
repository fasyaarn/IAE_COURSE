const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const { authenticate } = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'edubrain_super_secret_2026';

// POST /api/auth/register — Register new user (student only via public)
router.post('/register', async (req, res) => {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'Name, email, and password are required' });

    try {
        const hash = await bcrypt.hash(password, 10);

        // Insert into users table
        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hash, 'student']
        );

        // Also create matching student record
        await db.query(
            'INSERT INTO students (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
            [result.insertId, name, email, phone || null, address || null]
        );

        const token = jwt.sign({ id: result.insertId, email, role: 'student', name }, SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, token, user: { id: result.insertId, name, email, role: 'student' } });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ success: false, message: 'Email already registered' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/login — Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required' });

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!rows.length)
            return res.status(401).json({ success: false, message: 'Invalid email or password' });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(401).json({ success: false, message: 'Invalid email or password' });

        // For students: also get their students table ID (may differ from users.id)
        let studentId = null;
        if (user.role === 'student') {
            const [sRows] = await db.query('SELECT id FROM students WHERE email = ?', [email]);
            if (sRows.length) studentId = sRows[0].id;
        }

        const token = jwt.sign(
            { id: user.id, student_id: studentId, email: user.email, role: user.role, name: user.name },
            SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            success: true,
            token,
            user: { id: user.id, student_id: studentId, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// GET /api/auth/me — Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
