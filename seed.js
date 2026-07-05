/**
 * Seed script - run once with: npm run seed
 * Creates the default Admin, Mobiliser, and starter members exactly as specified
 * in the brief. Passwords are embedded here only as plaintext defaults and are
 * immediately hashed before being stored - they are never exposed on the sign-in UI.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ADMIN_ID = process.env.ADMIN_ID || 'ADMIN';
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
const MOBILISER_ID = process.env.MOBILISER_ID || 'MOB-9258-2026';
const MOBILISER_PASSWORD = process.env.MOBILISER_DEFAULT_PASSWORD || '#Walt9258$';
const MEMBER_PASSWORD = process.env.MEMBER_DEFAULT_PASSWORD || 'member123';

// Ascending order by member ID, as specified in the brief
const STARTER_MEMBERS = [
  { id: 'M-0001', name: 'HANNAH CLOE JAIRAH' },
  { id: 'M-0002', name: 'SSEGUYA MUSTAFAH' },
  { id: 'M-0003', name: 'NABATANZI SHADIA' },
  { id: 'M-0004', name: 'MUKASA IBRAHIM' },
  { id: 'M-0005', name: 'NAKIMULI PATRICIA' }
];

async function seed() {
  try {
    console.log('🌱 Seeding Busega Market Leaders & Vendors SACCO database...');

    // Admin
    const [adminRows] = await pool.query('SELECT id FROM admins WHERE admin_id = ?', [ADMIN_ID]);
    if (adminRows.length === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await pool.query(
        'INSERT INTO admins (admin_id, full_name, password_hash) VALUES (?, ?, ?)',
        [ADMIN_ID, 'SSEMANDA MIKE', hash]
      );
      console.log('✅ Admin created:', ADMIN_ID);
    } else {
      console.log('ℹ️  Admin already exists, skipping.');
    }

    // Mobiliser
    const [mobRows] = await pool.query('SELECT id FROM mobilisers WHERE mobiliser_id = ?', [MOBILISER_ID]);
    if (mobRows.length === 0) {
      const hash = await bcrypt.hash(MOBILISER_PASSWORD, 10);
      await pool.query(
        'INSERT INTO mobilisers (mobiliser_id, full_name, password_hash) VALUES (?, ?, ?)',
        [MOBILISER_ID, 'KATONGOLE DERRICK', hash]
      );
      console.log('✅ Mobiliser created:', MOBILISER_ID);
    } else {
      console.log('ℹ️  Mobiliser already exists, skipping.');
    }

    // Members
    for (const m of STARTER_MEMBERS) {
      const [rows] = await pool.query('SELECT id FROM members WHERE member_id = ?', [m.id]);
      if (rows.length === 0) {
        const hash = await bcrypt.hash(MEMBER_PASSWORD, 10);
        await pool.query(
          'INSERT INTO members (member_id, full_name, password_hash, balance, added_by) VALUES (?, ?, ?, 0.00, ?)',
          [m.id, m.name, hash, MOBILISER_ID]
        );
        console.log('✅ Member created:', m.id, m.name);
      } else {
        console.log('ℹ️  Member', m.id, 'already exists, skipping.');
      }
    }

    console.log('🎉 Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
