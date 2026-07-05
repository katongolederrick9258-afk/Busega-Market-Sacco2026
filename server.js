require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const mobiliserRoutes = require('./routes/mobiliser');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const initSockets = require('./sockets');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});
app.set('io', io);

// ---------- Middleware ----------
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the frontend (single deployable service on Render)
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/mobiliser', mobiliserRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Fallback to login page for any unknown non-API route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

initSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Busega SACCO server running on port ${PORT}`);
});
