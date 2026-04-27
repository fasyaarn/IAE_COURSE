const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'edubrain_super_secret_2026';

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded payload to req.user.
 */
function authenticate(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ success: false, message: 'No token provided' });

    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

/**
 * Allow only admin role.
 */
function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
}

/**
 * Allow only student role.
 */
function studentOnly(req, res, next) {
    if (req.user?.role !== 'student')
        return res.status(403).json({ success: false, message: 'Student access required' });
    next();
}

module.exports = { authenticate, adminOnly, studentOnly };
