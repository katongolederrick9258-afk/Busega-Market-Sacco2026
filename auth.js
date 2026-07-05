const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' }
});

const TABLE_BY_ROLE = {
  admin: { table: 'admins', idCol: 'admin_id' },
  mobiliser: { table: 'mobilisers', idCol: 'mobiliser_id' },
  member: { table: 'members', idCol: 'member_id' }
};

function signToken(user, role) {
  return jwt.sign(
    { id: user[TABLE_BY_ROLE[role].idCol], role, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

// POST /api/auth/login  { role, id, password }
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { role, id, password } = req.body;
    if (!role || !id || !password || !TABLE_BY_ROLE[role]) {
      return res.status(400).json({ error: 'Role, ID and password are required.' });
    }
    const { table, idCol } = TABLE_BY_ROLE[role];
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idCol} = ?`, [id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }
    if (role === 'member' && user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Contact the SACCO office.' });
    }
    const token = signToken(user, role);
    delete user.password_hash;
    res.json({ token, role, profile: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/change-password  (self-service, any authenticated role)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { role, id } = req.user;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    const { table, idCol } = TABLE_BY_ROLE[role];
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idCol} = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Account not found.' });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${table} SET password_hash = ? WHERE ${idCol} = ?`, [newHash, id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while changing password.' });
  }
});

// POST /api/auth/change-id  (mobiliser & admin only - lets mobiliser change ANY of the 3 ID schemes per brief)
router.post('/change-id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'mobiliser') {
      return res.status(403).json({ error: 'Only the mobiliser can change login IDs.' });
    }
    const { targetRole, newId } = req.body;
    if (!TABLE_BY_ROLE[targetRole] || !newId) {
      return res.status(400).json({ error: 'Target role and new ID are required.' });
    }
    const { table, idCol } = TABLE_BY_ROLE[targetRole];
    // Update the most recent single admin/mobiliser row (system has exactly one of each)
    await pool.query(`UPDATE ${table} SET ${idCol} = ? ORDER BY id ASC LIMIT 1`, [newId]);
    res.json({ message: `${targetRole} ID updated successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while changing ID.' });
  }
});

module.exports = router;
