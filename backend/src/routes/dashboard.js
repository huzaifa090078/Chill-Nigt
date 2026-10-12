const express = require('express');
const { db } = require('../db');
const { authenticateOwner } = require('../auth');

const router = express.Router();

router.get('/stats', authenticateOwner, (req, res) => {
  // Compute start of day in Pakistan Standard Time (UTC + 5 hours)
  const now = new Date();
  const pktOffsetMs = 5 * 60 * 60 * 1000;
  const pktNow = new Date(now.getTime() + pktOffsetMs);

  const year = pktNow.getUTCFullYear();
  const month = String(pktNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pktNow.getUTCDate()).padStart(2, '0');

  // Start of today in UTC: (YYYY-MM-DD 00:00:00 PKT) - 5 hours
  const pktMidnightString = `${year}-${month}-${day}T00:00:00.000Z`;
  const startOfPktDayUtc = new Date(new Date(pktMidnightString).getTime() - pktOffsetMs).toISOString();

  // 1. Today's orders count
  const todayOrders = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_sales
    FROM orders
    WHERE created_at >= ? AND status != 'CANCELLED'
  `).get(startOfPktDayUtc);

  // 2. Pending orders count (Confirmed, Preparing, Ready, Out for Delivery)
  const pendingOrders = db.prepare(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status IN ('CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY')
  `).get();

  // 3. Completed orders count (Delivered today)
  const completedOrders = db.prepare(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status = 'DELIVERED' AND (completed_at >= ? OR created_at >= ?)
  `).get(startOfPktDayUtc, startOfPktDayUtc);

  // 4. Status breakdown
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE created_at >= ?
    GROUP BY status
  `).all(startOfPktDayUtc);

  // 5. Recent 10 orders
  const recentOrders = db.prepare(`
    SELECT id, order_number, customer_name, customer_phone, order_type,
           status, total_amount, payment_status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  res.json({
    todayDatePkt: `${year}-${month}-${day}`,
    todayOrdersCount: todayOrders.count,
    pendingOrdersCount: pendingOrders.count,
    completedOrdersCount: completedOrders.count,
    todaySalesTotal: Math.round(todayOrders.total_sales),
    statusBreakdown: statusCounts,
    recentOrders,
  });
});

module.exports = router;
