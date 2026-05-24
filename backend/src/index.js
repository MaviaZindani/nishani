require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const { initSocket } = require('./socket');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Uploaded images / videos.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'nishani-api' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));

// Unknown API route.
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler — translates common failures into clean JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || /Unsupported file type/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Express is wrapped in an HTTP server so Socket.IO can share the port.
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => {
  console.log(`Nishani API + realtime running on http://localhost:${PORT}`);
});
