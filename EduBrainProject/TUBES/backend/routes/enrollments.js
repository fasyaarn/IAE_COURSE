const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/enrollments — Get All Enrollments (admin: all, student: own)
router.get('/', authenticate, async (req, res) => {
    try {
        let rows;
        if (req.user.role === 'admin') {
            [rows] = await db.query(`
                SELECT e.*, s.name AS student_name, c.title AS course_title
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN courses  c ON e.course_id  = c.id
                ORDER BY e.enrolled_at DESC
            `);
        } else {
            [rows] = await db.query(`
                SELECT e.*, s.name AS student_name, c.title AS course_title
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN courses  c ON e.course_id  = c.id
                WHERE e.student_id = ?
                ORDER BY e.enrolled_at DESC
            `, [req.user.student_id]);
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/enrollments/student/:studentId — Get Student's Courses
router.get('/student/:studentId', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, c.title AS course_title, c.instructor, c.credits
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = ?
            ORDER BY e.enrolled_at DESC
        `, [req.params.studentId]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/enrollments/course/:courseId — Get Course Participants
router.get('/course/:courseId', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, s.name AS student_name, s.email, s.phone
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.course_id = ?
            ORDER BY e.enrolled_at DESC
        `, [req.params.courseId]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/enrollments — Enroll Student to Course
router.post('/', authenticate, async (req, res) => {
    // Student can only enroll themselves; admin can enroll anyone
    let { student_id, course_id, status } = req.body;
    if (req.user.role === 'student') student_id = req.user.student_id;

    if (!student_id || !course_id)
        return res.status(400).json({ success: false, message: 'student_id and course_id are required' });

    try {
        const [result] = await db.query(
            'INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, ?)',
            [student_id, course_id, status || 'active']
        );
        const [newEnrollment] = await db.query(`
            SELECT e.*, s.name AS student_name, c.title AS course_title
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN courses  c ON e.course_id  = c.id
            WHERE e.id = ?
        `, [result.insertId]);
        res.status(201).json({ success: true, data: newEnrollment[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ success: false, message: 'Student already enrolled in this course' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/enrollments/:id — Update Enrollment Status (admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
    const { status } = req.body;
    try {
        const [check] = await db.query('SELECT id FROM enrollments WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Enrollment not found' });
        await db.query('UPDATE enrollments SET status=? WHERE id=?', [status, req.params.id]);
        const [updated] = await db.query(`
            SELECT e.*, s.name AS student_name, c.title AS course_title
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN courses  c ON e.course_id  = c.id
            WHERE e.id = ?
        `, [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/enrollments/:id — Remove Enrollment
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const [check] = await db.query('SELECT id, student_id FROM enrollments WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Enrollment not found' });

        // Student can only drop their own enrollment
        if (req.user.role === 'student' && check[0].student_id !== req.user.student_id)
            return res.status(403).json({ success: false, message: 'You can only drop your own enrollment' });

        await db.query('DELETE FROM enrollments WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Enrollment removed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
