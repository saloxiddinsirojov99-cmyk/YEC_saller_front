require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./server/lib/prisma');

// Import routers from server folder
const authRoutes = require('./server/routes/auth');
const branchRoutes = require('./server/routes/branches');
const userRoutes = require('./server/routes/users');
const productRoutes = require('./server/routes/products');
const orderRoutes = require('./server/routes/orders');
const statsRoutes = require('./server/routes/stats');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/api/db-health', async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(200).json({ status: 'OK', dbStatus: 'not_configured' });
    }
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'OK',
      dbStatus: 'connected',
      env: process.env.VERCEL ? 'vercel' : 'local',
    });
  } catch (err) {
    return res.status(503).json({
      status: 'ERROR',
      dbStatus: 'error',
      error: err.message,
    });
  }
// Full system status – includes DB health with correct HTTP semantics
app.get('/api/status', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'OK', db: 'ok' });
  } catch {
    return res.status(503).json({ status: 'ERROR', db: 'fail' });
  }
});

module.exports = app;
