const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/orders - List orders with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, branch_id, status, unpaid, seller_id, date_from, date_to, delivery_from, delivery_to, phone, customer } = req.query;
    
    let sql = `
      SELECT o.*, b.name as branch_name, u.name as seller_name 
      FROM orders o
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN users u ON o.seller_id = u.id
      WHERE 1=1
    `;
    let params = [];

    // Role-based scoping: Seller only sees their own branch orders
    if (req.user.role !== 'admin') {
      sql += ' AND o.branch_id = ?';
      params.push(req.user.branch_id || 0);
    } else if (branch_id) {
      sql += ' AND o.branch_id = ?';
      params.push(parseInt(branch_id));
    }

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (unpaid === '1') {
      sql += ' AND o.paid_amount < o.total_amount';
    }

    if (seller_id) {
      sql += ' AND o.seller_id = ?';
      params.push(parseInt(seller_id));
    }

    if (date_from) {
      sql += ' AND o.order_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND o.order_date <= ?';
      params.push(date_to);
    }

    if (delivery_from) {
      sql += ' AND o.delivery_date >= ?';
      params.push(delivery_from);
    }

    if (delivery_to) {
      sql += ' AND o.delivery_date <= ?';
      params.push(delivery_to);
    }

    if (phone) {
      sql += ' AND (o.customer_phone LIKE ? OR o.customer_phone2 LIKE ?)';
      const phoneWild = `%${phone}%`;
      params.push(phoneWild, phoneWild);
    }

    if (customer) {
      sql += ' AND o.customer_name LIKE ?';
      params.push(`%${customer}%`);
    }

    if (search) {
      sql += ' AND (o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.order_number LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY o.id DESC';

    const orders = await query.all(sql, params);
    res.json(orders);
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// GET /api/orders/:id - Get detailed order with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let orderSql = `
      SELECT o.*, b.name as branch_name, b.address as branch_address, b.phone as branch_phone, u.name as seller_name 
      FROM orders o
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN users u ON o.seller_id = u.id
      WHERE o.id = ?
    `;
    const order = await query.get(orderSql, [id]);

    if (!order) {
      return res.status(404).json({ error: 'Buyurtma topilmadi.' });
    }

    if (req.user.role !== 'admin' && order.branch_id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Ushbu buyurtmani ko\'rishga huquqingiz yo\'q.' });
    }

    const items = await query.all(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
      [id]
    );

    order.items = items;
    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/orders - Create new order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_phone2,
      customer_address,
      delivery_date,
      paid_amount,
      note,
      items
    } = req.body;

    if (!customer_name || !customer_phone || !customer_phone2 || !delivery_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Mijoz ma\'lumotlari, yetkazish sanasi va mahsulotlar kiritilishi shart.' });
    }

    let total_amount = 0;
    for (const item of items) {
      if (!item.product_name || item.quantity <= 0 || item.price < 0) {
        return res.status(400).json({ error: 'Mahsulot ma\'lumotlari to\'g\'ri kiritilmagan.' });
      }
      total_amount += item.quantity * item.price;
    }

    // If width and height provided, auto-calculate quantity
    for (const item of items) {
      if (item.width && item.height && !item.quantity) {
        item.quantity = item.width * item.height;
      }
    }

    // Generate order number
    const maxRow = await query.get('SELECT MAX(CAST(order_number AS INTEGER)) as max_num FROM orders');
    let nextNum = 1;
    if (maxRow && maxRow.max_num !== null && !isNaN(maxRow.max_num)) {
      nextNum = maxRow.max_num + 1;
    }
    const finalOrderNumber = String(nextNum).padStart(3, '0');

    // Insert Order (no explicit transaction - simpler and more reliable with SQLite)
    const orderResult = await query.run(
      `INSERT INTO orders (
        order_number, branch_id, seller_id, customer_name, customer_phone,
        customer_phone2, customer_address, order_date, delivery_date, total_amount, paid_amount, note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalOrderNumber,
        req.user.branch_id || null,
        req.user.id,
        customer_name.trim(),
        customer_phone,
        customer_phone2,
        customer_address ? customer_address.trim() : '',
        new Date().toISOString().split('T')[0],
        delivery_date,
        total_amount,
        paid_amount || 0,
        note ? note.trim() : '',
        'pending'
      ]
    );
    
    const orderId = orderResult.id;

    // Insert items
    for (const item of items) {
      const itemQty = item.width && item.height ? item.width * item.height : item.quantity;
      await query.run(
        `INSERT INTO order_items (order_id, product_id, product_name, product_code, width, height, quantity, price, discount_percent, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id || null,
          item.product_name,
          item.product_code || '',
          item.width || 0,
          item.height || 0,
          itemQty,
          item.price,
          item.discount_percent || 0,
          item.note ? item.note.trim() : ''
        ]
      );
    }

    // Fetch full order for receipt
    const fullOrder = await query.get(
      `SELECT o.*, b.name as branch_name, u.name as seller_name 
       FROM orders o
       LEFT JOIN branches b ON o.branch_id = b.id
       LEFT JOIN users u ON o.seller_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    const orderItems = await query.all(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
      [orderId]
    );

    fullOrder.items = orderItems;
    fullOrder.order_items = orderItems;

    res.status(201).json(fullOrder);
  } catch (err) {
    console.error('Create order error:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed: orders.order_number')) {
      return res.status(500).json({ error: 'Buyurtma raqamini generatsiya qilishda xatolik yuz berdi. Iltimos qaytadan urining.' });
    }
    res.status(500).json({ error: 'Buyurtma yaratishda xatolik: ' + err.message });
  }
});

// PUT /api/orders/:id - Update order (status, paid_amount, items, branch_id, etc.)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_amount, items, customer_name, customer_phone, customer_phone2, customer_address, delivery_date, note, branch_id } = req.body;

    const order = await query.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Buyurtma topilmadi.' });
    }

    if (req.user.role !== 'admin' && order.branch_id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Ushbu buyurtmani o\'zgartirishga huquqingiz yo\'q.' });
    }

    let fields = [];
    let params = [];

    if (status !== undefined) {
      if (!['pending', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Noto\'g\'ri status.' });
      }
      fields.push('status = ?');
      params.push(status);
    }

    if (paid_amount !== undefined) {
      if (paid_amount < 0) {
        return res.status(400).json({ error: 'To\'lov summasi manfiy bo\'lishi mumkin emas.' });
      }
      fields.push('paid_amount = ?');
      params.push(paid_amount);
    }

    if (customer_name !== undefined) {
      fields.push('customer_name = ?');
      params.push(customer_name);
    }

    if (customer_phone !== undefined) {
      fields.push('customer_phone = ?');
      params.push(customer_phone);
    }

    if (customer_phone2 !== undefined) {
      fields.push('customer_phone2 = ?');
      params.push(customer_phone2);
    }

    if (customer_address !== undefined) {
      fields.push('customer_address = ?');
      params.push(customer_address);
    }

    if (delivery_date !== undefined) {
      fields.push('delivery_date = ?');
      params.push(delivery_date);
    }

    if (note !== undefined) {
      fields.push('note = ?');
      params.push(note);
    }

    if (branch_id !== undefined) {
      fields.push('branch_id = ?');
      params.push(branch_id);
    }

    if (fields.length > 0) {
      params.push(id);
      await query.run(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    // Update items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      // Calculate new total
      let total_amount = 0;
      for (const item of items) {
        total_amount += (item.quantity || 0) * (item.price || 0);
      }

      // Delete old items and insert new ones
      await query.run('DELETE FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        const itemQty = item.width && item.height ? item.width * item.height : (item.quantity || 0);
        await query.run(
          `INSERT INTO order_items (order_id, product_id, product_name, product_code, width, height, quantity, price, discount_percent, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.product_id || null,
            item.product_name || '',
            item.product_code || '',
            item.width || 0,
            item.height || 0,
            itemQty,
            item.price || 0,
            item.discount_percent || 0,
            item.note || ''
          ]
        );
      }

      await query.run('UPDATE orders SET total_amount = ? WHERE id = ?', [total_amount, id]);
    }

    // Fetch updated order
    const updatedOrder = await query.get(
      `SELECT o.*, b.name as branch_name, u.name as seller_name 
       FROM orders o
       LEFT JOIN branches b ON o.branch_id = b.id
       LEFT JOIN users u ON o.seller_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    const orderItems = await query.all(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
      [id]
    );

    updatedOrder.items = orderItems;
    updatedOrder.order_items = orderItems;

    res.json(updatedOrder);
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/orders/:id - Delete order (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await query.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Buyurtma topilmadi.' });
    }

    // Only admin or the branch's seller can delete
    if (req.user.role !== 'admin' && order.branch_id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Ushbu buyurtmani o\'chirishga huquqingiz yo\'q.' });
    }

    // Delete order items first
    await query.run('DELETE FROM order_items WHERE order_id = ?', [id]);
    await query.run('DELETE FROM orders WHERE id = ?', [id]);

    res.json({ success: true, message: 'Buyurtma o\'chirildi.' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;