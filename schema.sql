-- ============================================================
-- Busega Market Leaders & Vendors SACCO - Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS busega_sacco CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE busega_sacco;

-- ---------- ADMIN ----------
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id VARCHAR(50) UNIQUE NOT NULL,        -- e.g. ADMIN
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(255) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------- MOBILISER ----------
CREATE TABLE IF NOT EXISTS mobilisers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobiliser_id VARCHAR(50) UNIQUE NOT NULL,    -- e.g. MOB-9258-2026
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(255) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------- MEMBERS ----------
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(20) UNIQUE NOT NULL,       -- e.g. M-0001
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  profile_picture VARCHAR(255) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  language VARCHAR(10) DEFAULT 'en',           -- en, lg (Luganda), sw (Kiswahili)
  theme VARCHAR(10) DEFAULT 'light',
  status ENUM('active','suspended') DEFAULT 'active',
  added_by VARCHAR(50) DEFAULT NULL,           -- mobiliser_id who added them
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------- TRANSACTIONS ----------
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  category ENUM('deposit','withdrawal','loan','loan_repayment','share') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  performed_by VARCHAR(50) NOT NULL,           -- admin_id or mobiliser_id
  performed_by_role ENUM('admin','mobiliser') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  INDEX idx_member_date (member_id, created_at)
);

-- ---------- LOANS ----------
CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  amount_requested DECIMAL(15,2) NOT NULL,
  purpose VARCHAR(255) DEFAULT NULL,
  status ENUM('pending','approved','disapproved','repaid') DEFAULT 'pending',
  reviewed_by VARCHAR(50) DEFAULT NULL,
  review_note VARCHAR(255) DEFAULT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);

-- ---------- COMMENTS ----------
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  member_name VARCHAR(150) NOT NULL,
  content VARCHAR(500) NOT NULL,
  approved TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id VARCHAR(50) NOT NULL,           -- member_id / mobiliser_id / admin_id
  recipient_role ENUM('member','mobiliser','admin') NOT NULL,
  type ENUM('deposit','withdrawal','loan','loan_repayment','share','loan_approved','loan_disapproved','comment','system') NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient (recipient_id, is_read)
);

-- ---------- GROWTH SNAPSHOTS (for rise/fall + growth graph) ----------
CREATE TABLE IF NOT EXISTS balance_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);
