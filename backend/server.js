const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const sanitize = require('mongo-sanitize');

const env = require('./config/env');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const accessLogRoutes = require('./routes/accessLogRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const threatIntelRoutes = require('./routes/threatIntelRoutes');

const app = express();

// ---------- Security Middleware ----------
app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Global rate limiter — protects all routes from brute force / abuse.
// Stricter limiters are applied per-route in later phases (e.g. login, OTP).
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// ---------- Body & Cookie Parsing ----------
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ---------- XSS Protection ----------
// Sanitizes req.body, req.query, req.params of any HTML/script tags.
app.use(xss());

// ---------- NoSQL Injection Protection ----------
// Strips any keys starting with '$' or containing '.' from user input,
// preventing MongoDB operator injection (e.g. { email: { $gt: '' } }).
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  // req.query is read-only in modern Express; sanitize in place instead
  // of reassigning the object itself.
  if (req.query) {
    const cleanQuery = sanitize(req.query);
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, cleanQuery);
  }
  next();
});

// ---------- Health Check ----------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZTNA backend is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------- Root ----------
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zero Trust Network Access (ZTNA) API',
    version: '1.0.0',
  });
});

// ---------- Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/access-logs', accessLogRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/threat-intel', threatIntelRoutes);

// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ---------- Global Error Handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ---------- Start Server ----------
const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`[Server] ZTNA backend running on port ${env.PORT} (${env.NODE_ENV})`);
  });
};

startServer();

module.exports = app;
