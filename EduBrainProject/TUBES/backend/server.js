const express  = require('express');
const cors     = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/students',    require('./routes/students'));
app.use('/api/courses',     require('./routes/courses'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/attendance',  require('./routes/attendance'));
app.use('/api/articles',    require('./routes/articles'));

// ── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        message: 'EduBrain API is running',
        version: '2.0.0',
        services: {
            auth:        '/api/auth',
            students:    '/api/students',
            courses:     '/api/courses',
            enrollments: '/api/enrollments',
            attendance:  '/api/attendance',
            articles:    '/api/articles',
        }
    });
});

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅  EduBrain API running on http://localhost:${PORT}`);
});
