require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getQuery, seedDatabase } = require('../db/database');

const authRoutes = require('../routes/auth');
const branchRoutes = require('../routes/branches');
const userRoutes = require('../routes/users');
const productRoutes = require('../routes/products');
const orderRoutes = require('../routes/orders');
const statsRoutes = require('../routes/stats');

const app = express();

// CORS - allow frontend domains
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) 
  : [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'https://yec-sallers.vercel.app',
      'https://yec-saller-front.vercel.app'
    ];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (server-to-server, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // For production, also allow any Vercel deployment
    if (origin && (origin.includes('vercel.app') || origin.includes('localhost'))) {
      return callback(null, true);
    }
    callback(null, true); // Allow all in production for now
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser
app.use(express.json());

// Database initialisation on first request
// Vercel serverless'da bu har bir cold start'da ishlaydi
let seeded = false;
app.use(async (req, res, next) => {
  if (!seeded) {
    seeded = true;
    try {
      console.log('Initializing database on first request...');
      // Faqat query ob'ektini yaratish (lazy init)
      // PostgreSQL bo'lsa, schema yaratiladi
      // SQLite bo'lsa, fayl yaratiladi
      getQuery();
      
      // Seed default ma'lumotlarni
      console.log('Seeding database on first request...');
      await seedDatabase();
      console.log('Seed completed on first request.');
    } catch (err) {
      console.error('Database init/seed error on startup:', err.message);
      // Seeddagi xato server ishlashini to'xtatmasligi kerak
    }
  }
  next();
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasDB = !!process.env.DATABASE_URL;
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
    database: hasDB ? 'postgresql' : 'sqlite'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'So\'ralgan resurs topilmadi.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express global error:', err);
  res.status(500).json({ error: 'Ichki server xatoligi yuz berdi.' });
});

// Vercel serverless uchun export
module.exports = app;