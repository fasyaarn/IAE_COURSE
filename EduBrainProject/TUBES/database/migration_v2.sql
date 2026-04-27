-- ============================================================
-- EduBrain v2 - Migration: Add Auth, Articles, Article Reads
-- Run this on existing database OR use schema.sql for fresh install
-- ============================================================

USE edubrain_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)        NOT NULL,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)        NOT NULL,
    role          ENUM('admin','student') DEFAULT 'student',
    created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Articles Table
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

-- 3. Article Reads Table
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
-- Run seed-users.js (node seed-users.js) after this migration
-- to create admin and student accounts with hashed passwords.
-- ============================================================
