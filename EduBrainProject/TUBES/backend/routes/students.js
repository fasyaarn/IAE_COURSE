const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

// All student routes require authentication + admin role
router.use(authenticate, adminOnly);

// GET /api/students — Get All Students
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/students/:id — Get Student Detail
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/students — Register Student
router.post('/', async (req, res) => {
    const { name, email, phone, address } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });
    try {
        const [result] = await db.query(
            'INSERT INTO students (name, email, phone, address) VALUES (?, ?, ?, ?)',
            [name, email, phone || null, address || null]
        );
        const [newStudent] = await db.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: newStudent[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/students/:id — Update Student
router.put('/:id', async (req, res) => {
    const { name, email, phone, address } = req.body;
    try {
        const [check] = await db.query('SELECT id FROM students WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Student not found' });
        await db.query(
            'UPDATE students SET name=?, email=?, phone=?, address=? WHERE id=?',
            [name, email, phone, address, req.params.id]
        );
        const [updated] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/students/:id — Remove Student
router.delete('/:id', async (req, res) => {
    try {
        const [check] = await db.query('SELECT id FROM students WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Student not found' });
        await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
