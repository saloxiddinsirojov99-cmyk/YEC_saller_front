const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');
const { verifyPassword } = require('../utils/crypto');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kiritilishi shart.' });
    }

    // Find user
    const user = await query.get(
      `SELECT u.*, b.name as branch_name 
       FROM users u 
       LEFT JOIN branches b ON u.branch_id = b.id 
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    // Verify password
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    // Sign token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Chiqish muvaffaqiyatli amalga oshirildi.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await query.get(
      `SELECT u.id, u.name, u.email, u.role, u.branch_id, b.name as branch_name 
       FROM users u 
       LEFT JOIN branches b ON u.branch_id = b.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;