const express = require('express');
const { randomUUID } = require('node:crypto');
const { db, getNextOrderNumber } = require('../db');
const { broadcastOrderUpdate } = require('../events');

const router = express.Router();

const FRONTEND_TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || '/track';

// Normalize Pakistani phone number (e.g. "03001234567" -> "923001234567")
function formatPhoneForWhatsApp(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('03') && digits.length === 11) {
    return '92' + digits.substring(1);
  }
  if (digits.startsWith('92') && digits.length === 12) {
    return digits;
  }
  return digits;
}

// Build prefilled WhatsApp message
function buildWhatsAppMessage(order) {
  const trackingUrl = `${FRONTEND_TRACKING_BASE_URL}?token=${order.tracking_token}`;
  return (
    `*Assalam-o-Alaikum ${order.customer_name}!* 🍔\n` +
    `Thank you for ordering from *Chill Night Food Point*.\n\n` +
    `📌 *Order #${order.order_number}* is *${order.status}*.\n` +
    `💰 Total Bill: *Rs. ${Math.round(order.total_amount)}*\n` +
    `💳 Payment: *${order.payment_status}* (${order.payment_method})\n\n` +
    `⏱️ *Track your order live here:*\n` +
    `${trackingUrl}\n\n` +
    `_Chill Night Food Point — Fresh, Hot & Crispy!_`
  );
}

// GET all orders with filtering and search
router.get('/', (req, res) => {
  const { status, search, limit = 100, offset = 0 } = req.query;

  try {
    let query = `
      SELECT o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_items_count
      FROM orders o
    `;
    const conditions = [];
    const params = [];

    if (status && status !== 'ALL') {
      conditions.push('o.status = ?');
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(o.customer_name LIKE ? OR o.customer_phone LIKE ? OR CAST(o.order_number AS TEXT) LIKE ?)');
      params.push(term, term, term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET single order with item snapshots and status history
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY timestamp ASC').all(id);

    const whatsappText = buildWhatsAppMessage(order);
    const waPhone = formatPhoneForWhatsApp(order.customer_phone);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(whatsappText)}`;

    res.json({
      ...order,
      items,
      history,
      trackingUrl: `${FRONTEND_TRACKING_BASE_URL}?token=${order.tracking_token}`,
      whatsappText,
      whatsappUrl,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// POST create new order
router.post('/', (req, res) => {
  const {
    customerName,
    customerPhone,
    orderType = 'TAKEAWAY',
    deliveryAddress,
    items,
    prepTimeMinutes = 20,
    deliveryTimeMinutes = 20,
    deliveryFee = 0,
    discountAmount = 0,
    paymentMethod = 'CASH',
    amountPaid = 0,
    notes = '',
  } = req.body;

  // Validations
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!customerPhone || !customerPhone.trim()) {
    return res.status(400).json({ error: 'Customer phone number is required' });
  }

  const normalizedOrderType = orderType.toUpperCase();
  if (!['DELIVERY', 'TAKEAWAY'].includes(normalizedOrderType)) {
    return res.status(400).json({ error: 'Order type must be DELIVERY or TAKEAWAY' });
  }

  if (normalizedOrderType === 'DELIVERY' && (!deliveryAddress || !deliveryAddress.trim())) {
    return res.status(400).json({ error: 'Delivery address is required for home delivery orders' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one menu item is required' });
  }

  // Authoritative recalculation of all subtotals from database menu prices
  const orderItemsSnapshots = [];
  let calculatedSubtotal = 0;

  for (const itemReq of items) {
    const { menuItemId, quantity, notes: itemNotes = '' } = itemReq;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(menuItemId);
    if (!menuItem) {
      return res.status(400).json({ error: `Menu item with ID ${menuItemId} does not exist` });
    }

    const itemSubtotal = menuItem.price * qty;
    calculatedSubtotal += itemSubtotal;

    orderItemsSnapshots.push({
      id: 'oi_' + randomUUID().substring(0, 8),
      menu_item_id: menuItem.id,
      name: menuItem.name, // Snapshot name at order placement
      unit_price: menuItem.price, // Snapshot unit price at order placement
      quantity: qty,
      subtotal: itemSubtotal,
      notes: itemNotes.trim(),
    });
  }

  const finalDeliveryFee = normalizedOrderType === 'DELIVERY' ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const finalDiscount = Math.max(0, Number(discountAmount) || 0);
  const totalAmount = Math.max(0, calculatedSubtotal + finalDeliveryFee - finalDiscount);

  const numPaid = Math.max(0, Number(amountPaid) || 0);
  const remainingAmount = Math.max(0, totalAmount - numPaid);

  let paymentStatus = 'UNPAID';
  if (numPaid >= totalAmount) {
    paymentStatus = 'PAID';
  } else if (numPaid > 0) {
    paymentStatus = 'PARTIALLY_PAID';
  }

  const validPaymentMethod = ['CASH', 'CARD', 'ONLINE'].includes(paymentMethod.toUpperCase())
    ? paymentMethod.toUpperCase()
    : 'CASH';

  // Target UTC Deadlines
  const now = new Date();
  const prepMins = Math.max(5, Number(prepTimeMinutes) || 20);
  const delMins = Math.max(5, Number(deliveryTimeMinutes) || 20);

  const estimatedReadyTime = new Date(now.getTime() + prepMins * 60 * 1000);
  const estimatedDeliveryTime = normalizedOrderType === 'DELIVERY'
    ? new Date(now.getTime() + (prepMins + delMins) * 60 * 1000)
    : null;

  const orderId = 'ord_' + randomUUID().substring(0, 8);
  const trackingToken = 'trk_' + randomUUID().replace(/-/g, '');
  const orderNumber = getNextOrderNumber();

  // Commit order, items, and status history inside an atomic transaction
  try {
    db.exec('BEGIN TRANSACTION;');

    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        id, order_number, tracking_token, customer_name, customer_phone,
        order_type, delivery_address, status, prep_time_minutes, delivery_time_minutes,
        estimated_ready_at, estimated_delivery_at, subtotal, delivery_fee,
        discount_amount, total_amount, payment_method, payment_status,
        amount_paid, remaining_amount, notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, 'CONFIRMED', ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    insertOrderStmt.run(
      orderId,
      orderNumber,
      trackingToken,
      customerName.trim(),
      customerPhone.trim(),
      normalizedOrderType,
      normalizedOrderType === 'DELIVERY' ? deliveryAddress.trim() : null,
      prepMins,
      delMins,
      estimatedReadyTime.toISOString(),
      estimatedDeliveryTime ? estimatedDeliveryTime.toISOString() : null,
      calculatedSubtotal,
      finalDeliveryFee,
      finalDiscount,
      totalAmount,
      validPaymentMethod,
      paymentStatus,
      numPaid,
      remainingAmount,
      notes.trim(),
      now.toISOString(),
      now.toISOString()
    );

    const insertOrderItemStmt = db.prepare(`
      INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price, quantity, subtotal, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const snap of orderItemsSnapshots) {
      insertOrderItemStmt.run(
        snap.id,
        orderId,
        snap.menu_item_id,
        snap.name,
        snap.unit_price,
        snap.quantity,
        snap.subtotal,
        snap.notes
      );
    }

    db.prepare(`
      INSERT INTO order_status_history (id, order_id, status, note, timestamp)
      VALUES (?, ?, 'CONFIRMED', 'Order created in POS', ?)
    `).run('osh_' + randomUUID().substring(0, 8), orderId, now.toISOString());

    db.exec('COMMIT;');

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const whatsappText = buildWhatsAppMessage(createdOrder);
    const waPhone = formatPhoneForWhatsApp(createdOrder.customer_phone);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(whatsappText)}`;

    res.status(201).json({
      ...createdOrder,
      items: orderItemsSnapshots,
      trackingUrl: `${FRONTEND_TRACKING_BASE_URL}?token=${trackingToken}`,
      whatsappText,
      whatsappUrl,
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH status change
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason, note = '' } = req.body;

  const validStatuses = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const normStatus = status.toUpperCase();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const now = new Date().toISOString();
  const completedAt = (normStatus === 'DELIVERED' || normStatus === 'CANCELLED') ? now : existing.completed_at;

  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      UPDATE orders
      SET status = ?, cancellation_reason = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      normStatus,
      cancellationReason ? cancellationReason.trim() : existing.cancellation_reason,
      completedAt,
      now,
      id
    );

    db.prepare(`
      INSERT INTO order_status_history (id, order_id, status, note, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'osh_' + randomUUID().substring(0, 8),
      id,
      normStatus,
      note ? note.trim() : `Status changed to ${normStatus}`,
      now
    );

    db.exec('COMMIT;');

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    // Live SSE broadcast to customer tracking screen
    broadcastOrderUpdate(updated.tracking_token, {
      event: 'STATUS_UPDATED',
      status: updated.status,
      completedAt: updated.completed_at,
      cancellationReason: updated.cancellation_reason,
    });

    res.json(updated);
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PATCH payment update
router.patch('/:id/payment', (req, res) => {
  const { id } = req.params;
  const { paymentMethod, amountPaid } = req.body;

  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const newMethod = paymentMethod ? paymentMethod.toUpperCase() : existing.payment_method;
  const newPaid = amountPaid !== undefined ? Math.max(0, Number(amountPaid)) : existing.amount_paid;
  const newRemaining = Math.max(0, existing.total_amount - newPaid);

  let newPaymentStatus = 'UNPAID';
  if (newPaid >= existing.total_amount) {
    newPaymentStatus = 'PAID';
  } else if (newPaid > 0) {
    newPaymentStatus = 'PARTIALLY_PAID';
  }

  const now = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE orders
      SET payment_method = ?, amount_paid = ?, remaining_amount = ?, payment_status = ?, updated_at = ?
      WHERE id = ?
    `).run(newMethod, newPaid, newRemaining, newPaymentStatus, now, id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    broadcastOrderUpdate(updated.tracking_token, {
      event: 'PAYMENT_UPDATED',
      paymentMethod: updated.payment_method,
      paymentStatus: updated.payment_status,
      amountPaid: updated.amount_paid,
      remainingAmount: updated.remaining_amount,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

module.exports = router;
