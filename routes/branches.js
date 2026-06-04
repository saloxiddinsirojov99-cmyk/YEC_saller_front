const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/branches (All authenticated users can list branches for dropdowns)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = await query.all('SELECT * FROM branches ORDER BY name ASC');
    res.json(branches);
  } catch (err) {
    console.error('List branches error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/branches (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Filial nomi kiritilishi shart.' });
    }

    const result = await query.run(
      'INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)',
      [name, address, phone]
    );

    res.status(201).json({
      id: result.id,
      name,
      address,
      phone
    });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// PUT /api/branches/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Filial nomi kiritilishi shart.' });
    }

    const result = await query.run(
      'UPDATE branches SET name = ?, address = ?, phone = ? WHERE id = ?',
      [name, address, phone, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Filial topilmadi.' });
    }

    res.json({ id: parseInt(id), name, address, phone });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/branches/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query.run('DELETE FROM branches WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Filial topilmadi.' });
    }

    res.json({ success: true, message: 'Filial o\'chirildi.' });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;
