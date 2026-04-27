-- ============================================================
-- EduBrain Online Learning Platform - Database Schema v2
-- ============================================================

CREATE DATABASE IF NOT EXISTS edubrain_db;
USE edubrain_db;

-- ============================================================
-- Users Table (Admin & Student accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)        NOT NULL,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)        NOT NULL,
    role          ENUM('admin','student') DEFAULT 'student',
    created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Students Table
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(150)        NOT NULL UNIQUE,
    phone       VARCHAR(20),
    address     TEXT,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Courses Table
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(150)        NOT NULL,
    description TEXT,
    instructor  VARCHAR(100),
    credits     INT                 DEFAULT 3,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Enrollments Table
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  INT                 NOT NULL,
    course_id   INT                 NOT NULL,
    status      ENUM('active','completed','dropped') DEFAULT 'active',
    enrolled_at TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE,
    UNIQUE KEY uq_enrollment (student_id, course_id)
);

-- ============================================================
-- Articles Table (learning material)
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)        NOT NULL,
    content     LONGTEXT            NOT NULL,
    course_id   INT,
    created_by  INT,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
);

-- ============================================================
-- Article Reads Table (tracks which student read which article)
-- ============================================================
CREATE TABLE IF NOT EXISTS article_reads (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    article_id  INT                 NOT NULL,
    student_id  INT                 NOT NULL,
    read_at     TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_read (article_id, student_id)
);

-- ============================================================
-- Attendance Table
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  INT                 NOT NULL,
    course_id   INT                 NOT NULL,
    date        DATE                NOT NULL,
    status      ENUM('present','absent','late') DEFAULT 'present',
    notes       TEXT,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- ============================================================
-- Seed: Admin Account
-- Password: admin123  (bcrypt hash pre-generated)
-- ============================================================
INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES
(1, 'Administrator', 'admin@edubrain.id',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu', 'admin');

-- ============================================================
-- Seed: Student Accounts (password: student123 for all)
-- ============================================================
INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES
(2, 'Fasya Arinal Hudha',       'fasya@edubrain.id',   '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student'),
(3, 'Alifia Ryana Saputri',     'alifia@edubrain.id',  '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student'),
(4, 'Asyifa Indi Azalia',       'asyifa@edubrain.id',  '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student'),
(5, 'Maya Radina Putri',        'maya@edubrain.id',    '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student'),
(6, 'Nadila Naurah Rayyani H.', 'nadila@edubrain.id',  '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student'),
(7, 'Budi Santoso',             'budi@edubrain.id',    '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student'),
(8, 'Citra Dewi',               'citra@edubrain.id',   '$2a$10$YourHashHere1111111111111111111111111111111111111111111', 'student');

-- Seed: Students (matching user IDs)
INSERT IGNORE INTO students (id, name, email, phone, address) VALUES
(2, 'Fasya Arinal Hudha',       'fasya@edubrain.id',   '081200000001', 'Bandung'),
(3, 'Alifia Ryana Saputri',     'alifia@edubrain.id',  '081200000002', 'Bandung'),
(4, 'Asyifa Indi Azalia',       'asyifa@edubrain.id',  '081200000003', 'Bandung'),
(5, 'Maya Radina Putri',        'maya@edubrain.id',    '081200000004', 'Bandung'),
(6, 'Nadila Naurah Rayyani H.', 'nadila@edubrain.id',  '081200000005', 'Bandung'),
(7, 'Budi Santoso',             'budi@edubrain.id',    '081200000006', 'Jakarta'),
(8, 'Citra Dewi',               'citra@edubrain.id',   '081200000007', 'Surabaya');

-- Seed: Courses
INSERT IGNORE INTO courses (id, title, description, instructor, credits) VALUES
(1, 'Web Programming',        'Learn HTML, CSS, JS, React, and Node.js',          'Dr. Ahmad',     3),
(2, 'Database Systems',       'Relational databases, SQL, and NoSQL fundamentals', 'Dr. Budi',      3),
(3, 'Computer Networks',      'TCP/IP, HTTP, DNS, and network protocols',          'Dr. Citra',     2),
(4, 'Software Engineering',   'SDLC, Agile, Scrum, and design patterns',           'Dr. Diana',     3),
(5, 'Mobile Development',     'Android and iOS development fundamentals',           'Dr. Eko',       3);

-- Seed: Enrollments
INSERT IGNORE INTO enrollments (student_id, course_id, status) VALUES
(2, 1, 'active'), (2, 2, 'active'), (2, 4, 'active'),
(3, 1, 'active'), (3, 3, 'active'),
(4, 2, 'active'), (4, 4, 'active'),
(5, 1, 'active'), (5, 5, 'active'),
(6, 3, 'active'), (6, 4, 'active'),
(7, 1, 'completed'), (7, 2, 'completed'),
(8, 5, 'active');

-- Seed: Articles
INSERT IGNORE INTO articles (id, title, content, course_id, created_by) VALUES
(1, 'Pengantar Web Programming',
 'Web programming adalah proses membuat aplikasi atau halaman web yang dapat diakses melalui browser.\n\n## Teknologi Utama\n\n**HTML (HyperText Markup Language)** adalah bahasa markup yang digunakan untuk membuat struktur halaman web. Setiap elemen ditandai dengan tag seperti `<div>`, `<p>`, `<h1>`, dan sebagainya.\n\n**CSS (Cascading Style Sheets)** digunakan untuk mengatur tampilan dan tata letak halaman web. CSS memungkinkan developer mengatur warna, font, ukuran, dan posisi elemen.\n\n**JavaScript** adalah bahasa pemrograman yang membuat halaman web menjadi interaktif. Dengan JavaScript, kita dapat merespons aksi pengguna, melakukan request ke server, dan memanipulasi DOM.\n\n## Framework Modern\n\nReact, Vue, dan Angular adalah framework JavaScript yang memudahkan pembangunan aplikasi web kompleks. Node.js dan Express.js digunakan di sisi server untuk membuat API.\n\n## Kesimpulan\n\nMemahami web programming adalah fondasi penting bagi setiap pengembang perangkat lunak modern. Setelah membaca artikel ini, Anda siap untuk mengikuti sesi perkuliahan!',
 1, 1),
(2, 'Dasar-Dasar Sistem Basis Data',
 'Sistem Basis Data (Database Systems) adalah cara terorganisir untuk menyimpan, mengelola, dan mengambil informasi.\n\n## Konsep Dasar\n\n**Relational Database** menyimpan data dalam tabel yang saling terhubung. Setiap tabel memiliki baris (record) dan kolom (field). Contoh: MySQL, PostgreSQL, Oracle.\n\n**SQL (Structured Query Language)** adalah bahasa standar untuk berinteraksi dengan database relasional. Perintah utama:\n- `SELECT` - mengambil data\n- `INSERT` - menambah data\n- `UPDATE` - mengubah data\n- `DELETE` - menghapus data\n\n## Primary Key & Foreign Key\n\n**Primary Key** adalah kolom unik yang mengidentifikasi setiap record. **Foreign Key** adalah kolom yang merujuk ke Primary Key tabel lain, membentuk relasi antar tabel.\n\n## Normalisasi\n\nNormalisasi adalah proses mengorganisir database untuk mengurangi redundansi dan ketergantungan data. Bentuk normal: 1NF, 2NF, 3NF, dan BCNF.\n\n## Kesimpulan\n\nMemahami database adalah keahlian wajib bagi developer. Baca artikel ini sebelum hadir agar diskusi lebih produktif!',
 2, 1),
(3, 'Pengantar Jaringan Komputer',
 'Jaringan komputer memungkinkan perangkat saling berkomunikasi dan berbagi sumber daya.\n\n## Model OSI & TCP/IP\n\nModel OSI memiliki 7 lapisan: Physical, Data Link, Network, Transport, Session, Presentation, Application. Model TCP/IP menyederhanakan menjadi 4 lapisan.\n\n## Protokol Penting\n\n**IP (Internet Protocol)** mengidentifikasi setiap perangkat di jaringan dengan alamat IP. **TCP (Transmission Control Protocol)** menjamin pengiriman data yang andal. **HTTP/HTTPS** adalah protokol untuk transfer data web.\n\n## DNS & Port\n\nDNS (Domain Name System) menerjemahkan nama domain (google.com) menjadi alamat IP. Port adalah nomor yang mengidentifikasi layanan tertentu (80=HTTP, 443=HTTPS, 3306=MySQL).\n\n## Kesimpulan\n\nJaringan komputer adalah tulang punggung internet. Wajib baca sebelum kelas!',
 3, 1);

-- Seed: Sample attendance
INSERT IGNORE INTO attendance (student_id, course_id, date, status) VALUES
(2, 1, '2026-04-01', 'present'),
(2, 1, '2026-04-08', 'present'),
(3, 1, '2026-04-01', 'present'),
(4, 2, '2026-04-02', 'present'),
(5, 1, '2026-04-01', 'present'),
(6, 3, '2026-04-03', 'present');
