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
  const dbConfigured = !!process.env.DATABASE_URL;
  let dbStatus = 'not_configured';
  if (dbConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (_) {
      dbStatus = 'error';
    }
  }
  res.json({ status: 'OK', dbStatus, env: process.env.VERCEL ? 'vercel' : 'local' });
});

module.exports = app;
