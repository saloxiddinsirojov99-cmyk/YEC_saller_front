require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { seedDatabase } = require('../db/database');

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

// Verilənlər bazasını əkin (ilk sorğuda default istifadəçilər yaradılır)
let seeded = false;
app.use(async (req, res, next) => {
  if (!seeded) {
    seeded = true;
    try {
      console.log('Seeding database on first request...');
      await seedDatabase();
      console.log('Seed completed on first request.');
    } catch (err) {
      console.error('Seed error on startup:', err.message);
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
  res.json({ status: 'OK', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express global error:', err);
  res.status(500).json({ error: 'Ichki server xatoligi yuz berdi.' });
});

// Vercel serverless üçün export
module.exports = app;
