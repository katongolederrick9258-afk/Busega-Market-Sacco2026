const jwt = require('jsonwebtoken');

module.exports = function initSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid session.'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, name } = socket.user;
    socket.join(`room:${id}`);
    if (role === 'admin' || role === 'mobiliser') socket.join('room:staff');
    console.log(`🔌 ${role} ${id} (${name}) connected via socket`);

    socket.on('disconnect', () => {
      console.log(`🔌 ${role} ${id} disconnected`);
    });
  });
};
