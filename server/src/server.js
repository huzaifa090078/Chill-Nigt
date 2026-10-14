require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');

const dashboardRoutes = require('./routes/dashboard');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const trackingRoutes = require('./routes/tracking');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize tables and default seed data
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for audit trail
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chill Night Food Point Server',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/settings', settingsRoutes);

// Static hosting for production-built client
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍔 Chill Night Server listening on http://0.0.0.0:${PORT}`);
    console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
    console.log(`📡 Customer Tracking: http://localhost:${PORT}/api/track/:token`);
  });
}

module.exports = app;
