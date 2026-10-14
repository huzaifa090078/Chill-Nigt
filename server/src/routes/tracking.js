const express = require('express');
const { db, getSettings, formatOrderNumber } = require('../db');
const { addTrackingClient } = require('../events');

const router = express.Router();

function maskPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '***';
  const visibleStart = cleaned.slice(0, 4);
  const visibleEnd = cleaned.slice(-2);
  return `${visibleStart} ••••• ${visibleEnd}`;
}

// GET public order tracking details
router.get('/:token', (req, res) => {
  const { token } = req.params;
  if (!token || !token.startsWith('trk_')) {
    return res.status(400).json({ error: 'Invalid tracking token format' });
  }

  try {
    const order = db.prepare('SELECT * FROM orders WHERE tracking_token = ?').get(token);
    if (!order) {
      return res.status(404).json({ error: 'Order not found or tracking link expired' });
    }

    const items = db.prepare(`
      SELECT name, unit_price, quantity, subtotal, notes
      FROM order_items
      WHERE order_id = ?
    `).all(order.id);

    const history = db.prepare(`
      SELECT status, note, timestamp
      FROM order_status_history
      WHERE order_id = ?
      ORDER BY timestamp ASC
    `).all(order.id);

    const settings = getSettings();
    const shopPhone = settings.shop_phone || process.env.RESTAURANT_PHONE || '0329 1314400';
    const cleanPhone = shopPhone.replace(/[^0-9+]/g, '');

    res.json({
      orderNumber: order.order_number,
      orderCode: formatOrderNumber(order.order_number),
      orderNumberFormatted: formatOrderNumber(order.order_number),
      trackingToken: order.tracking_token,
      customerName: order.customer_name,
      customerPhoneMasked: maskPhoneNumber(order.customer_phone),
      orderType: order.order_type,
      deliveryAddress: order.order_type === 'DELIVERY' ? order.delivery_address : null,
      status: order.status,
      cancellationReason: order.cancellation_reason,
      estimatedReadyAt: order.estimated_ready_at,
      estimatedDeliveryAt: order.estimated_delivery_at,
      completedAt: order.completed_at,
      createdAt: order.created_at,
      serverTimeUtc: new Date().toISOString(),
      displayTimezone: 'Asia/Karachi',
      items,
      history,
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      discountAmount: order.discount_amount,
      totalAmount: order.total_amount,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      amountPaid: order.amount_paid,
      remainingAmount: order.remaining_amount,
      restaurant: {
        name: settings.shop_name || 'Chill Night Food Point',
        phone: shopPhone,
        phoneFormatted: shopPhone,
        phoneDial: cleanPhone,
        address: settings.address || 'Food Street, Sector F-10, Islamabad',
        city: settings.city || 'Islamabad',
        currency: settings.currency || 'PKR (Rs.)',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracking details' });
  }
});

// SSE endpoint for live updates
router.get('/:token/live', (req, res) => {
  const { token } = req.params;
  if (!token || !token.startsWith('trk_')) {
    return res.status(400).send('Invalid tracking token');
  }

  try {
    const order = db.prepare('SELECT id FROM orders WHERE tracking_token = ?').get(token);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Initial connection ping
    res.write(`data: ${JSON.stringify({ event: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    addTrackingClient(token, res);
  } catch (err) {
    res.status(500).send('SSE error');
  }
});

module.exports = router;
