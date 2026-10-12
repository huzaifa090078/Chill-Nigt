require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');
const { loginHandler } = require('./auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const trackingRoutes = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize database tables and seeds
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging for audit trail
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chill Night Food Point Backend',
    timestamp: new Date().toISOString(),
  });
});

// Auth Route
app.post('/api/auth/login', loginHandler);

// Modules
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/track', trackingRoutes);

// Static hosting for customer tracking web app
const path = require('node:path');
const fs = require('node:fs');
const trackerDistPath = path.join(__dirname, '..', '..', 'web-tracker', 'dist');
if (fs.existsSync(trackerDistPath)) {
  app.use(express.static(trackerDistPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(trackerDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Chill Night Server running at http://0.0.0.0:${PORT}`);
    console.log(`📡 Public tracking available at http://0.0.0.0:${PORT}/api/track/:token`);
  });
}

module.exports = app;
