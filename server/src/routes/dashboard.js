const express = require('express');
const { db, formatOrderNumber } = require('../db');

const router = express.Router();

router.get('/stats', (req, res) => {
  try {
    // Calculate start of today in Pakistan Standard Time (UTC+5)
    const now = new Date();
    const pktOffsetMs = 5 * 60 * 60 * 1000;
    const pktNow = new Date(now.getTime() + pktOffsetMs);

    const year = pktNow.getUTCFullYear();
    const month = String(pktNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(pktNow.getUTCDate()).padStart(2, '0');

    // Midnight in PKT expressed in UTC ISO string
    const pktMidnightString = `${year}-${month}-${day}T00:00:00.000Z`;
    const startOfPktDayUtc = new Date(new Date(pktMidnightString).getTime() - pktOffsetMs).toISOString();

    // 1. Today's orders count and total sales from real non-cancelled orders
    const todayOrders = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE created_at >= ? AND status != 'CANCELLED'
    `).get(startOfPktDayUtc);

    // 2. Pending orders count (actively in kitchen or in transit)
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status IN ('CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY')
    `).get();

    // 3. Completed orders count (DELIVERED today)
    const completedOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'DELIVERED' AND (completed_at >= ? OR created_at >= ?)
    `).get(startOfPktDayUtc, startOfPktDayUtc);

    // 4. Cancelled orders today
    const cancelledOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'CANCELLED' AND created_at >= ?
    `).get(startOfPktDayUtc);

    // 5. Status breakdown
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE created_at >= ?
      GROUP BY status
    `).all(startOfPktDayUtc);

    // 6. Recent 10 orders with item count
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.tracking_token, o.customer_name, o.customer_phone,
             o.order_type, o.delivery_address, o.status, o.total_amount,
             o.payment_method, o.payment_status, o.amount_paid, o.remaining_amount,
             o.created_at, o.estimated_ready_at, o.estimated_delivery_at,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_items_count
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      todayDatePkt: `${year}-${month}-${day}`,
      todayOrdersCount: todayOrders.count,
      pendingOrdersCount: pendingOrders.count,
      completedOrdersCount: completedOrders.count,
      cancelledOrdersCount: cancelledOrders.count,
      todaySalesTotal: Math.round(todayOrders.total_sales),
      statusBreakdown: statusCounts,
      recentOrders: recentOrders.map(o => ({
        ...o,
        order_code: formatOrderNumber(o.order_number),
        order_number_formatted: formatOrderNumber(o.order_number),
      })),
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
});

module.exports = router;
