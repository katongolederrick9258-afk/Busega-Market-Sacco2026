const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

// GET /api/members  -> list all members, ascending by member_id (mobiliser/admin only)
router.get('/', authenticate, authorize('admin', 'mobiliser'), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT member_id, full_name, balance, status, profile_picture, created_at FROM members ORDER BY member_id ASC'
  );
  res.json(rows);
});

// GET /api/members/me  -> current member's own profile
router.get('/me', authenticate, authorize('member'), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT member_id, full_name, balance, profile_picture, email, phone, language, theme FROM members WHERE member_id = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Member not found.' });
  res.json(rows[0]);
});

// PUT /api/members/me/settings  -> language / theme
router.put('/me/settings', authenticate, authorize('member'), async (req, res) => {
  const { language, theme } = req.body;
  await pool.query('UPDATE members SET language = COALESCE(?, language), theme = COALESCE(?, theme) WHERE member_id = ?',
    [language || null, theme || null, req.user.id]);
  res.json({ message: 'Settings updated.' });
});

// POST /api/members/me/profile-picture
router.post('/me/profile-picture', authenticate, authorize('member'), upload.single('picture'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  const url = `/uploads/${req.file.filename}`;
  await pool.query('UPDATE members SET profile_picture = ? WHERE member_id = ?', [url, req.user.id]);
  res.json({ profile_picture: url });
});

// GET /api/members/me/transactions?category=&period=daily|weekly|monthly|annually
router.get('/me/transactions', authenticate, authorize('member'), async (req, res) => {
  const { category, period } = req.query;
  let sql = 'SELECT * FROM transactions WHERE member_id = ?';
  const params = [req.user.id];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (period === 'daily') sql += ' AND created_at >= CURDATE()';
  else if (period === 'weekly') sql += ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  else if (period === 'monthly') sql += ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  else if (period === 'annually') sql += ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';

  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/members/me/growth  -> balance history for the rise/fall graph
router.get('/me/growth', authenticate, authorize('member'), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT balance, recorded_at FROM balance_history WHERE member_id = ? ORDER BY recorded_at ASC',
    [req.user.id]
  );
  res.json(rows);
});

// ---------- Loans (requested by member) ----------
router.post('/me/loans', authenticate, authorize('member'), async (req, res) => {
  const { amount, purpose } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Enter a valid loan amount.' });
  const [result] = await pool.query(
    'INSERT INTO loans (member_id, amount_requested, purpose) VALUES (?, ?, ?)',
    [req.user.id, amount, purpose || null]
  );
  const io = req.app.get('io');
  await notify(io, {
    recipientId: 'ADMIN', recipientRole: 'admin', type: 'loan',
    title: 'New loan request', message: `${req.user.name} (${req.user.id}) requested UGX ${amount}.`
  });
  res.json({ message: 'Loan request submitted. You will be notified once reviewed.', loanId: result.insertId });
});

router.get('/me/loans', authenticate, authorize('member'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM loans WHERE member_id = ? ORDER BY requested_at DESC', [req.user.id]);
  res.json(rows);
});

// ---------- Comments ----------
// GET latest approved comments for the rotating comment section
router.get('/comments', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT member_name, content, created_at FROM comments WHERE approved = 1 ORDER BY created_at DESC LIMIT 30'
  );
  res.json(rows);
});

router.post('/me/comments', authenticate, authorize('member'), async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
  await pool.query('INSERT INTO comments (member_id, member_name, content) VALUES (?, ?, ?)',
    [req.user.id, req.user.name, content.trim().slice(0, 500)]);
  const io = req.app.get('io');
  io.emit('new-comment', { member_name: req.user.name, content, created_at: new Date().toISOString() });
  res.json({ message: 'Comment posted.' });
});

module.exports = router;
