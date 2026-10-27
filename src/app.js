// src/app.js
// Creates express app, sets up middleware and routes

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
app.use(express.json({ limit: '30kb' }));

// Session (for superadmin dashboard auth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'superadmin-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
}));

// Rate limiting (example for API)
app.use('/api/', rateLimit({ windowMs: 4 * 60 * 1000, max: 700 }));

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

module.exports = app;
