const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/attendance — Get All Attendance records (admin: all, student: own)
router.get('/', authenticate, async (req, res) => {
    try {
        let rows;
        if (req.user.role === 'admin') {
            [rows] = await db.query(`
                SELECT a.*, s.name AS student_name, c.title AS course_title
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN courses  c ON a.course_id  = c.id
                ORDER BY a.date DESC, a.created_at DESC
            `);
        } else {
            // student_id = ID in students table (may differ from users.id)
            const sid = req.user.student_id;
            [rows] = await db.query(`
                SELECT a.*, s.name AS student_name, c.title AS course_title
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN courses  c ON a.course_id  = c.id
                WHERE a.student_id = ?
                ORDER BY a.date DESC, a.created_at DESC
            `, [sid]);
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/attendance/student/:id
router.get('/student/:id', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, c.title AS course_title
            FROM attendance a
            JOIN courses c ON a.course_id = c.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/attendance/course/:id
router.get('/course/:id', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, s.name AS student_name, s.email
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.course_id = ?
            ORDER BY a.date DESC
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/attendance — Mark Attendance (student must have read required article)
router.post('/', authenticate, async (req, res) => {
    const { student_id, course_id, date, status, notes } = req.body;
    if (!student_id || !course_id || !date)
        return res.status(400).json({ success: false, message: 'student_id, course_id, and date are required' });

    try {
        // --- Gate: check student has read required article ---
        if (req.user.role === 'student') {
            const sid = req.user.student_id; // ID in students table

            const [articles] = await db.query(
                'SELECT id FROM articles WHERE course_id = ?', [course_id]
            );
            if (articles.length > 0) {
                const articleIds = articles.map(a => a.id);
                const [reads] = await db.query(
                    'SELECT article_id FROM article_reads WHERE student_id = ? AND article_id IN (?)',
                    [sid, articleIds]
                );
                if (reads.length < articleIds.length) {
                    return res.status(403).json({
                        success: false,
                        message: 'Please read the required article for this course before attending'
                    });
                }
            }
        }
        // --- End gate ---

        const [result] = await db.query(
            'INSERT INTO attendance (student_id, course_id, date, status, notes) VALUES (?, ?, ?, ?, ?)',
            [student_id, course_id, date, status || 'present', notes || null]
        );
        const [newRecord] = await db.query(`
            SELECT a.*, s.name AS student_name, c.title AS course_title
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN courses  c ON a.course_id  = c.id
            WHERE a.id = ?
        `, [result.insertId]);
        res.status(201).json({ success: true, data: newRecord[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/attendance/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
    const { status, notes } = req.body;
    try {
        const [check] = await db.query('SELECT id FROM attendance WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Attendance record not found' });
        await db.query('UPDATE attendance SET status=?, notes=? WHERE id=?', [status, notes, req.params.id]);
        const [updated] = await db.query(`
            SELECT a.*, s.name AS student_name, c.title AS course_title
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN courses  c ON a.course_id  = c.id
            WHERE a.id = ?
        `, [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/attendance/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const [check] = await db.query('SELECT id FROM attendance WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Attendance record not found' });
        await db.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Attendance record deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
