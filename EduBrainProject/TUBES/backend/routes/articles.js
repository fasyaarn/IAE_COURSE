const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/articles — List all articles (authenticated)
router.get('/', authenticate, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'student') {
            // Include whether this student already read each article
            query = `
                SELECT a.*,
                       IF(ar.id IS NOT NULL, 1, 0) AS is_read
                FROM articles a
                LEFT JOIN article_reads ar
                       ON ar.article_id = a.id AND ar.student_id = ?
                ORDER BY a.created_at DESC
            `;
            params = [req.user.student_id]; // ID in students table
        } else {
            query = 'SELECT a.*, NULL AS is_read FROM articles a ORDER BY a.created_at DESC';
        }

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/articles/:id — Get single article
router.get('/:id', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Article not found' });

        let is_read = false;
        if (req.user.role === 'student') {
            const [reads] = await db.query(
                'SELECT id FROM article_reads WHERE article_id = ? AND student_id = ?',
                [req.params.id, req.user.student_id]
            );
            is_read = reads.length > 0;
        }

        res.json({ success: true, data: { ...rows[0], is_read } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/articles — Create article (admin only)
router.post('/', authenticate, adminOnly, async (req, res) => {
    const { title, content, course_id } = req.body;
    if (!title || !content)
        return res.status(400).json({ success: false, message: 'Title and content are required' });

    try {
        const [result] = await db.query(
            'INSERT INTO articles (title, content, course_id, created_by) VALUES (?, ?, ?, ?)',
            [title, content, course_id || null, req.user.id]
        );
        const [article] = await db.query('SELECT * FROM articles WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: article[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/articles/:id — Update article (admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
    const { title, content, course_id } = req.body;
    try {
        const [check] = await db.query('SELECT id FROM articles WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Article not found' });

        await db.query(
            'UPDATE articles SET title=?, content=?, course_id=? WHERE id=?',
            [title, content, course_id || null, req.params.id]
        );
        const [updated] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/articles/:id — Delete article (admin only)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const [check] = await db.query('SELECT id FROM articles WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Article not found' });
        await db.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Article deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/articles/:id/read — Mark article as read by student
router.post('/:id/read', authenticate, async (req, res) => {
    if (req.user.role !== 'student')
        return res.status(403).json({ success: false, message: 'Only students can mark articles as read' });

    try {
        const [check] = await db.query('SELECT id FROM articles WHERE id = ?', [req.params.id]);
        if (!check.length) return res.status(404).json({ success: false, message: 'Article not found' });

        // Upsert – ignore if already exists
        await db.query(
            'INSERT IGNORE INTO article_reads (article_id, student_id) VALUES (?, ?)',
            [req.params.id, req.user.student_id] // use students table ID
        );
        res.json({ success: true, message: 'Article marked as read' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/articles/reads/check?course_id=X — Check if student has read the article for a course
router.get('/reads/check', authenticate, async (req, res) => {
    const { course_id } = req.query;
    if (!course_id) return res.status(400).json({ success: false, message: 'course_id is required' });

    try {
        // Find articles linked to this course
        const [articles] = await db.query('SELECT id FROM articles WHERE course_id = ?', [course_id]);
        if (!articles.length) {
            // No article required → attendance allowed
            return res.json({ success: true, can_attend: true, message: 'No article required' });
        }

        if (req.user.role !== 'student') {
            return res.json({ success: true, can_attend: true });
        }

        // Check if ALL articles for this course have been read
        const articleIds = articles.map(a => a.id);
        const [reads] = await db.query(
            'SELECT article_id FROM article_reads WHERE student_id = ? AND article_id IN (?)',
            [req.user.student_id, articleIds] // use students table ID
        );

        const can_attend = reads.length >= articleIds.length;
        res.json({
            success: true,
            can_attend,
            message: can_attend
                ? 'You have read all required articles'
                : 'Please read the required article before attending',
            articles_required: articleIds.length,
            articles_read: reads.length
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
