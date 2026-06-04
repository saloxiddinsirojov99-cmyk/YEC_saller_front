const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { hashPassword } = require('../utils/crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendUserNotificationEmail } = require('../utils/email');

// All endpoints in this file are restricted to Admins
router.use(authenticateToken, requireRole(['admin']));

// GET /api/users - List all users with branch details
router.get('/', async (req, res) => {
  try {
    const users = await query.all(
      `SELECT u.id, u.name, u.email, u.role, u.branch_id, u.created_at, b.name as branch_name 
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       ORDER BY u.name ASC`
    );
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/users - Create new seller/admin
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Ism, email, parol va rol kiritilishi shart.' });
    }

    if (role !== 'admin' && role !== 'seller') {
      return res.status(400).json({ error: 'Noto\'g\'ri rol tanlandi.' });
    }

    // Check if email unique
    const existingUser = await query.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ushbu email li foydalanuvchi allaqachon mavjud.' });
    }

    const passwordHash = hashPassword(password);
    const result = await query.run(
      'INSERT INTO users (name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)',
      [name, email.trim().toLowerCase(), passwordHash, role, branch_id || null]
    );

    const newUser = {
      id: result.id,
      name,
      email: email.trim().toLowerCase(),
      role,
      branch_id: branch_id || null,
      created_at: new Date()
    };

    // Send email notification (non-blocking — never fails the request)
    sendUserNotificationEmail({
      action: 'created',
      user: { id: result.id, name, email: email.trim().toLowerCase(), role },
      tempPassword: password
    }).catch(err => console.error('Email send failed (non-critical):', err.message));

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;
    const { id } = req.params;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Ism, email va rol kiritilishi shart.' });
    }

    // Get old user data for comparison
    const oldUser = await query.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!oldUser) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    // Check if email unique to another user
    const existingUser = await query.get('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim().toLowerCase(), id]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ushbu email boshqa foydalanuvchiga tegishli.' });
    }

    let passwordSql = '';
    let params = [name, email.trim().toLowerCase(), role, branch_id || null];
    
    if (password) {
      const passwordHash = hashPassword(password);
      passwordSql = ', password_hash = ?';
      params.push(passwordHash);
    }
    
    params.push(id);

    const result = await query.run(
      `UPDATE users 
       SET name = ?, email = ?, role = ?, branch_id = ? ${passwordSql} 
       WHERE id = ?`,
      params
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    // Track changed fields for email
    const changedFields = [];
    if (oldUser.name !== name) changedFields.push('Ism');
    if (oldUser.email !== email.trim().toLowerCase()) changedFields.push('Email');
    if (oldUser.role !== role) changedFields.push('Rol');
    if (oldUser.branch_id !== (branch_id || null)) changedFields.push('Filial');
    if (password) changedFields.push('Parol');

    const updatedUser = {
      id: parseInt(id),
      name,
      email: email.trim().toLowerCase(),
      role,
      branch_id: branch_id || null
    };

    // Send email notification (non-blocking — never fails the request)
    if (changedFields.length > 0) {
      sendUserNotificationEmail({
        action: 'updated',
        user: { id: parseInt(id), name, email: email.trim().toLowerCase(), role },
        changedFields
      }).catch(err => console.error('Email send failed (non-critical):', err.message));
    }

    res.json(updatedUser);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'O\'zingizning profilingizni o\'chira olmaysiz.' });
    }

    const result = await query.run('DELETE FROM users WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    res.json({ success: true, message: 'Foydalanuvchi o\'chirildi.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;