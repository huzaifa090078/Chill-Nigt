const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/stats', (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(total_amount), 0) as grand_total_sales,
        COALESCE(SUM(amount_paid), 0) as total_collected,
        COALESCE(SUM(remaining_amount), 0) as total_outstanding,
        COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as paid_orders_count,
        COUNT(CASE WHEN payment_status IN ('UNPAID', 'PARTIALLY_PAID') THEN 1 END) as pending_orders_count
      FROM orders
      WHERE status != 'CANCELLED'
    `).get();

    const methods = db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount_paid), 0) as total_collected
      FROM orders
      WHERE status != 'CANCELLED'
      GROUP BY payment_method
    `).all();

    const recentPending = db.prepare(`
      SELECT id, order_number, customer_name, customer_phone, order_type,
             status, total_amount, payment_method, payment_status,
             amount_paid, remaining_amount, created_at
      FROM orders
      WHERE payment_status IN ('UNPAID', 'PARTIALLY_PAID') AND status != 'CANCELLED'
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    res.json({
      grandTotalSales: Math.round(totals.grand_total_sales),
      totalCollected: Math.round(totals.total_collected),
      totalOutstanding: Math.round(totals.total_outstanding),
      paidOrdersCount: totals.paid_orders_count,
      pendingOrdersCount: totals.pending_orders_count,
      methodsBreakdown: methods,
      pendingOrders: recentPending,
    });
  } catch (err) {
    console.error('Error in payments stats:', err);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

module.exports = router;
