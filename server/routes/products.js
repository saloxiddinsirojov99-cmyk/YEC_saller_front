const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { query } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Multer config for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../client/public/uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Faqat rasm fayllari (jpg, png, gif, webp) yuklash mumkin.'));
  }
});

// Auto-generate product code
async function generateProductCode() {
  const last = await query.get('SELECT code FROM products WHERE code != "" ORDER BY id DESC LIMIT 1');
  let num = 1;
  if (last && last.code) {
    const match = last.code.match(/\d+/);
    if (match) num = parseInt(match[0]) + 1;
  }
  return 'G-' + String(num).padStart(4, '0');
}

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Exclude image BLOB from list for performance, include image_url if exists
    let sql = 'SELECT id, name, code, description, price, image_url, is_active, created_at FROM products';
    let params = [];

    if (req.user.role !== 'admin') {
      sql += ' WHERE is_active = 1';
    }
    
    sql += ' ORDER BY name ASC';
    
    const products = await query.all(sql, params);
    res.json(products);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/products (Admin only) - with image upload
router.post('/', authenticateToken, requireRole(['admin']), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Mahsulot nomi va narxi kiritilishi shart.' });
    }

    // Auto-generate code
    const code = await generateProductCode();
    
    // Get image URL if file uploaded
    let imageUrl = '';
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }

    const result = await query.run(
      'INSERT INTO products (name, code, description, price, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, description || '', price, imageUrl, is_active !== undefined ? is_active : 1]
    );

    res.status(201).json({
      id: result.id,
      name,
      code,
      description,
      price,
      image_url: imageUrl,
      is_active: is_active !== undefined ? is_active : 1
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// PUT /api/products/:id (Admin only) - with optional image upload
router.put('/:id', authenticateToken, requireRole(['admin']), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;
    const { id } = req.params;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Mahsulot nomi va narxi kiritilishi shart.' });
    }

    // Get existing product
    const existing = await query.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Mahsulot topilmadi.' });
    }

    let imageUrl = existing.image_url || '';
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }

    const result = await query.run(
      'UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, is_active = ? WHERE id = ?',
      [name, description || '', price, imageUrl, is_active !== undefined ? is_active : existing.is_active, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mahsulot topilmadi.' });
    }

    const updated = await query.get('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/products/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query.run('DELETE FROM products WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mahsulot topilmadi.' });
    }

    res.json({ success: true, message: 'Mahsulot o\'chirildi.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;