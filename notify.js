const pool = require('../config/db');

/**
 * Creates a notification row and emits it in real time via socket.io.
 * `type` controls which notification sound plays on the frontend
 * (see js/notifications.js SOUND_MAP).
 */
async function notify(io, { recipientId, recipientRole, type, title, message }) {
  const [result] = await pool.query(
    `INSERT INTO notifications (recipient_id, recipient_role, type, title, message) VALUES (?, ?, ?, ?, ?)`,
    [recipientId, recipientRole, type, title, message]
  );
  const payload = {
    id: result.insertId,
    recipientId,
    recipientRole,
    type,
    title,
    message,
    is_read: 0,
    created_at: new Date().toISOString()
  };
  io.to(`room:${recipientId}`).emit('notification', payload);
  return payload;
}

module.exports = { notify };
