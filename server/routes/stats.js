const express = require('express');
const router = express.Router();
const { getQuery } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/stats/dashboard
// Admin: returns overall data (all branches, all time)
// Seller: returns today-only data for their branch
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const q = getQuery();
    const isAdmin = req.user.role === 'admin';
    const branchId = req.user.branch_id;

    if (isAdmin) {
      // ── ADMIN: Overall data ──
      // 1. Order counts (Daily, Weekly, Monthly)
      const dailyCount = await q.get(
        "SELECT COUNT(*) as count FROM orders WHERE order_date = date('now', 'localtime') AND status != 'cancelled'"
      );
      const weeklyCount = await q.get(
        "SELECT COUNT(*) as count FROM orders WHERE order_date >= date('now', '-6 days', 'localtime') AND status != 'cancelled'"
      );
      const monthlyCount = await q.get(
        "SELECT COUNT(*) as count FROM orders WHERE order_date >= date('now', '-29 days', 'localtime') AND status != 'cancelled'"
      );

      // 2. Total sales volume
      const totalSales = await q.get(
        "SELECT SUM(total_amount) as sum FROM orders WHERE status != 'cancelled'"
      );

      // 3. Sales by branch showroom
      const branchSales = await q.all(
        `SELECT b.id, b.name as branch_name, COALESCE(SUM(o.total_amount), 0) as sales_sum, COUNT(o.id) as order_count
         FROM branches b
         LEFT JOIN orders o ON o.branch_id = b.id AND o.status != 'cancelled'
         GROUP BY b.id`
      );

      // 4. Top selling carpet products
      const topProducts = await q.all(
        `SELECT product_name, SUM(quantity) as total_qty, SUM(quantity * price) as revenue
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'cancelled'
         GROUP BY product_name
         ORDER BY total_qty DESC
         LIMIT 5`
      );

      // 5. Unpaid orders list
      const unpaidOrders = await q.all(
        `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.total_amount, o.paid_amount,
                (o.total_amount - o.paid_amount) as debt_amount, o.order_date, b.name as branch_name
         FROM orders o
         LEFT JOIN branches b ON o.branch_id = b.id
         WHERE o.paid_amount < o.total_amount AND o.status != 'cancelled'
         ORDER BY debt_amount DESC`
      );

      res.json({
        role: 'admin',
        counts: {
          daily: dailyCount.count,
          weekly: weeklyCount.count,
          monthly: monthlyCount.count
        },
        total_sales: totalSales.sum || 0,
        branch_sales: branchSales,
        top_products: topProducts,
        unpaid_orders: unpaidOrders
      });

    } else {
      // ── SELLER: Today-only, own branch ──
      const branchFilter = branchId ? 'AND o.branch_id = ?' : '';

      // 1. Today's order count
      const todayCount = await q.get(
        `SELECT COUNT(*) as count FROM orders o 
         WHERE o.order_date = date('now', 'localtime') 
           AND o.status != 'cancelled' ${branchFilter}`,
        branchId ? [branchId] : []
      );

      // 2. Today's total sales
      const todaySales = await q.get(
        `SELECT COALESCE(SUM(o.total_amount), 0) as sum FROM orders o 
         WHERE o.order_date = date('now', 'localtime') 
           AND o.status != 'cancelled' ${branchFilter}`,
        branchId ? [branchId] : []
      );

      // 3. Today's unpaid debt (sum of remaining amounts for today's orders)
      const todayDebt = await q.get(
        `SELECT COALESCE(SUM(o.total_amount - o.paid_amount), 0) as sum FROM orders o 
         WHERE o.order_date = date('now', 'localtime') 
           AND o.paid_amount < o.total_amount 
           AND o.status != 'cancelled' ${branchFilter}`,
        branchId ? [branchId] : []
      );

      // 4. Today's unpaid orders list (for detail view)
      const todayUnpaidOrders = await q.all(
        `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, 
                o.total_amount, o.paid_amount,
                (o.total_amount - o.paid_amount) as debt_amount, o.order_date
         FROM orders o
         WHERE o.order_date = date('now', 'localtime')
           AND o.paid_amount < o.total_amount 
           AND o.status != 'cancelled' ${branchFilter}
         ORDER BY debt_amount DESC`,
        branchId ? [branchId] : []
      );

      res.json({
        role: 'seller',
        today: {
          orders_count: todayCount.count,
          sales_amount: todaySales.sum,
          debt_amount: todayDebt.sum
        },
        today_unpaid_orders: todayUnpaidOrders
      });
    }
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;