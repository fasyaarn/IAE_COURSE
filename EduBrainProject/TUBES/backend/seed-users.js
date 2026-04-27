/**
 * seed-users.js
 * Run: node seed-users.js
 * Creates admin and sample student accounts with hashed passwords.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./config/db');

async function seed() {
    console.log('🌱  Seeding users...');

    const adminHash   = await bcrypt.hash('admin123',   10);
    const studentHash = await bcrypt.hash('student123', 10);

    // ── Users ──────────────────────────────────────────────────
    const users = [
        { id: 1, name: 'Administrator',         email: 'admin@edubrain.id',   hash: adminHash,   role: 'admin'   },
        { id: 2, name: 'Fasya Arinal Hudha',     email: 'fasya@edubrain.id',   hash: studentHash, role: 'student' },
        { id: 3, name: 'Alifia Ryana Saputri',   email: 'alifia@edubrain.id',  hash: studentHash, role: 'student' },
        { id: 4, name: 'Asyifa Indi Azalia',     email: 'asyifa@edubrain.id',  hash: studentHash, role: 'student' },
        { id: 5, name: 'Maya Radina Putri',      email: 'maya@edubrain.id',    hash: studentHash, role: 'student' },
        { id: 6, name: 'Nadila Naurah R.H.',     email: 'nadila@edubrain.id',  hash: studentHash, role: 'student' },
        { id: 7, name: 'Budi Santoso',           email: 'budi@edubrain.id',    hash: studentHash, role: 'student' },
        { id: 8, name: 'Citra Dewi',             email: 'citra@edubrain.id',   hash: studentHash, role: 'student' },
    ];

    for (const u of users) {
        await db.query(
            `INSERT INTO users (id, name, email, password_hash, role)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)`,
            [u.id, u.name, u.email, u.hash, u.role]
        );
        console.log(`   ✅  ${u.role.padEnd(7)} | ${u.email}`);
    }

    // ── Students: sync emails with user IDs ───────────────────
    // Update existing student records to match new user IDs, or skip if not found
    const studentMappings = [
        { email: 'fasya@edubrain.id',   userId: 2 },
        { email: 'alifia@edubrain.id',  userId: 3 },
        { email: 'asyifa@edubrain.id',  userId: 4 },
        { email: 'maya@edubrain.id',    userId: 5 },
        { email: 'nadila@edubrain.id',  userId: 6 },
        { email: 'budi@edubrain.id',    userId: 7 },
        { email: 'citra@edubrain.id',   userId: 8 },
    ];

    for (const m of studentMappings) {
        // If a student with this email exists but with a different ID, skip
        // Otherwise try to insert with the target ID
        const [existing] = await db.query('SELECT id FROM students WHERE email = ?', [m.email]);
        if (existing.length > 0) {
            console.log(`   ⏭️  student record already exists for ${m.email} (id=${existing[0].id})`);
        } else {
            await db.query(
                'INSERT IGNORE INTO students (id, name, email) VALUES (?, ?, ?)',
                [m.userId, m.email.split('@')[0], m.email]
            );
        }
    }

    console.log('\n🎉  Done! Login credentials:');
    console.log('   Admin   → admin@edubrain.id   / admin123');
    console.log('   Student → fasya@edubrain.id   / student123');
    console.log('   Student → alifia@edubrain.id  / student123');
    console.log('   (all students use password: student123)\n');

    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
