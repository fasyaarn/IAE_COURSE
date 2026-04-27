const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/courses — Display All Courses (public / any authenticated user)
router.get('/', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM courses ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/courses/:id — Get Course Detail
router.get('/:id', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/courses — Add Course (admin only)
router.post('/', authenticate, adminOnly, async (req, res) => {
    const { title, description, instructor, credits } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    try {
        const [result] = await db.query(
            'INSERT INTO courses (title, description, instructor, credits) VALUES (?, ?, ?, ?)',
            [title, description || null, instructor || null, credits || 3]
        );
        const [newCourse] = await db.query('SELECT * FROM courses WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: newCourse[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/courses/:id — Edit Course (admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
    const { title, description, instructor, credits } = req.body;
    try {
        const [check] = await db.query('SELECT id FROM courses WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Course not found' });
        await db.query(
            'UPDATE courses SET title=?, description=?, instructor=?, credits=? WHERE id=?',
            [title, description, instructor, credits, req.params.id]
        );
        const [updated] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/courses/:id — Delete Course (admin only)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const [check] = await db.query('SELECT id FROM courses WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Course not found' });
        await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
