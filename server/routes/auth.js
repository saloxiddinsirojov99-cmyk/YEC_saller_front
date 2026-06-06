const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { verifyPassword, hashPassword } = require('../utils/crypto');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email va parol kiritilishi shart.' });
    }

    // Find user using Prisma
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { branch: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    // Verify password
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    // Sign token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.name || null
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branch_id: user.branch_id,
          branch_name: user.branch?.name || null
        }
      },
      message: 'Tizimga muvaffaqiyatli kirildi.'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Barcha maydonlar kiritilishi shart.' });
    }

    if (role !== 'admin' && role !== 'seller') {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri rol tanlandi.' });
    }

    // Check if email unique
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ushbu email bilan ro\'yxatdan o\'tilgan.' });
    }

    const passwordHash = hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role,
        branch_id: branch_id ? parseInt(branch_id) : null
      },
      include: {
        branch: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.name || null
      },
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tildi.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Ro\'yxatdan o\'tishda xatolik yuz berdi.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Chiqish muvaffaqiyatli amalga oshirildi.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.name || null
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;