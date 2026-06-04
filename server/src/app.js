'use strict';

const path = require('path');

// Load .env from project root: server/src/ -> server/ -> coin-identifier-app/
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// Also try one level up in case running from a different cwd
if (!process.env.JWT_SECRET) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// ----------------------------------------------------------------
// Socket.io
// ----------------------------------------------------------------
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? true  // allow all origins in production (served from same domain)
  : ['http://localhost:5173', 'http://localhost:3001'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`Socket ${socket.id} joined room user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Helper to emit notifications to a specific user
function emitNotification(userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}

// Attach io and emitter to app for use in routes
app.set('io', io);
app.set('emitNotification', emitNotification);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Raw body needed for Stripe webhook — register before JSON body parser
app.use('/api/subscribe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Serve React production build in production
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// ----------------------------------------------------------------
// Multer configuration (for file uploads)
// ----------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const { v4: uuidv4 } = require('uuid');
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

app.set('upload', upload);

// ----------------------------------------------------------------
// Routes
// ----------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/collection', require('./routes/collection'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/user', require('./routes/user'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/crh', require('./routes/crh'));

// Leaderboard shortcut (served by user router)
app.get('/api/leaderboard', (req, res, next) => {
  req.url = '/leaderboard';
  require('./routes/user')(req, res, next);
});

// Image upload endpoint
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url, filename: req.file.filename });
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// AI connectivity diagnostic
app.get('/api/health/ai', async (_req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say ok' }],
    });
    res.json({ status: 'ok', keyPrefix: key.slice(0, 10) + '...', response: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message, keyPrefix: key.slice(0, 10) + '...' });
  }
});

// In production, serve index.html for all non-API routes (SPA fallback)
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ----------------------------------------------------------------
// Start server
// ----------------------------------------------------------------
const PORT = process.env.PORT || 3001;

// Initialize DB (runs schema creation + seeding) then start listening
require('./db/database');
console.log('Database initialized');

server.listen(PORT, () => {
  console.log(`CoinVault API server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };
