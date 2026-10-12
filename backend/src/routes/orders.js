const express = require('express');
const { randomUUID } = require('node:crypto');
const { db, getNextOrderNumber } = require('../db');
const { authenticateOwner } = require('../auth');
const { broadcastOrderUpdate } = require('../events');

const router = express.Router();

const FRONTEND_TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || 'http://localhost:5173/track';

// Helper to format WhatsApp text
function buildWhatsAppMessage(order, restaurantName = 'Chill Night Food Point') {
  const trackingUrl = `${FRONTEND_TRACKING_BASE_URL}?token=${order.tracking_token}`;
  return (
    `*Assalam-o-Alaikum ${order.customer_name}!* 🍔\n` +
    `Thank you for ordering from *${restaurantName}*.\n\n` +
    `📌 *Order #${order.order_number}* is *${order.status}*.\n` +
    `💰 Total Bill: *Rs. ${Math.round(order.total_amount)}*\n` +
    `💳 Payment: *${order.payment_status}* (${order.payment_method})\n\n` +
    `⏱️ *Track your order live here:*\n` +
    `${trackingUrl}\n\n` +
    `_Chill Night Food Point — Fresh & Crispy!_`
  );
}

// GET all orders (search, status filter)
router.get('/', authenticateOwner, (req, res) => {
  const { status, search, limit = 50, offset = 0 } = req.query;

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
});

// GET single order by ID with item snapshots
router.get('/:id', authenticateOwner, (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  const whatsappText = buildWhatsAppMessage(order);
  const cleanPhone = order.customer_phone.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(whatsappText)}`;

  res.json({
    ...order,
    items,
    trackingUrl: `${FRONTEND_TRACKING_BASE_URL}?token=${order.tracking_token}`,
    whatsappText,
    whatsappUrl,
  });
});

// POST create order
router.post('/', authenticateOwner, (req, res) => {
  const {
    clientSubmissionId,
    customerName,
    customerPhone,
    orderType,
    deliveryAddress,
    items,
    prepTimeMinutes = 20,
    deliveryTimeMinutes = 20,
    deliveryFee = 0,
    paymentMethod = 'CASH',
    amountPaid = 0,
    notes = '',
  } = req.body;

  // Validation
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!customerPhone || !customerPhone.trim()) {
    return res.status(400).json({ error: 'Customer phone number is required' });
  }
  if (!orderType || !['DELIVERY', 'TAKEAWAY'].includes(orderType.toUpperCase())) {
    return res.status(400).json({ error: 'Valid orderType (DELIVERY or TAKEAWAY) is required' });
  }

  const normalizedOrderType = orderType.toUpperCase();
  if (normalizedOrderType === 'DELIVERY' && (!deliveryAddress || !deliveryAddress.trim())) {
    return res.status(400).json({ error: 'Delivery address is required for home delivery orders' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required in the order' });
  }

  // Idempotency check: if clientSubmissionId already exists, return existing order
  if (clientSubmissionId) {
    const existing = db.prepare('SELECT id FROM orders WHERE client_submission_id = ?').get(clientSubmissionId);
    if (existing) {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);
      const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(existing.id);
      return res.json({
        ...order,
        items: orderItems,
        trackingUrl: `${FRONTEND_TRACKING_BASE_URL}?token=${order.tracking_token}`,
      });
    }
  }

  // Authoritative price calculation and historical snapshot creation
  const orderItemsSnapshots = [];
  let calculatedSubtotal = 0;

  for (const requestedItem of items) {
    const { menuItemId, quantity, notes: itemNotes = '' } = requestedItem;
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
      name: menuItem.name, // historical snapshot
      unit_price: menuItem.price, // historical snapshot
      quantity: qty,
      subtotal: itemSubtotal,
      notes: itemNotes.trim(),
    });
  }

  const finalDeliveryFee = normalizedOrderType === 'DELIVERY' ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const totalAmount = calculatedSubtotal + finalDeliveryFee;
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

  // UTC Deadlines
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

  // Commit order & items in transaction
  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (
      id, order_number, client_submission_id, tracking_token,
      customer_name, customer_phone, order_type, delivery_address,
      status, prep_time_minutes, delivery_time_minutes,
      estimated_ready_at, estimated_delivery_at,
      subtotal, delivery_fee, discount_amount, total_amount,
      payment_method, payment_status, amount_paid, remaining_amount,
      notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      'CONFIRMED', ?, ?,
      ?, ?,
      ?, ?, 0, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  const insertOrderItemStmt = db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price, quantity, subtotal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrderStmt.run(
    orderId,
    orderNumber,
    clientSubmissionId || null,
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
    totalAmount,
    validPaymentMethod,
    paymentStatus,
    numPaid,
    remainingAmount,
    notes.trim(),
    now.toISOString(),
    now.toISOString()
  );

  for (const item of orderItemsSnapshots) {
    insertOrderItemStmt.run(
      item.id,
      orderId,
      item.menu_item_id,
      item.name,
      item.unit_price,
      item.quantity,
      item.subtotal,
      item.notes
    );
  }

  const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const whatsappText = buildWhatsAppMessage(createdOrder);
  const cleanPhone = createdOrder.customer_phone.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(whatsappText)}`;

  res.status(201).json({
    ...createdOrder,
    items: orderItemsSnapshots,
    trackingUrl: `${FRONTEND_TRACKING_BASE_URL}?token=${trackingToken}`,
    whatsappText,
    whatsappUrl,
  });
});

// PATCH status change
router.patch('/:id/status', authenticateOwner, (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

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

  db.prepare(`
    UPDATE orders
    SET status = ?, cancellation_reason = ?, completed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(normStatus, cancellationReason ? cancellationReason.trim() : existing.cancellation_reason, completedAt, now, id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

  // Broadcast to customer tracking page via SSE
  broadcastOrderUpdate(updated.tracking_token, {
    event: 'STATUS_UPDATED',
    status: updated.status,
    completedAt: updated.completed_at,
    cancellationReason: updated.cancellation_reason,
  });

  res.json(updated);
});

// PATCH payment update
router.patch('/:id/payment', authenticateOwner, (req, res) => {
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
});

// PATCH revise estimated time (e.g. +10 mins delay)
router.patch('/:id/estimate', authenticateOwner, (req, res) => {
  const { id } = req.params;
  const { addMinutes = 10 } = req.body;

  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const mins = Number(addMinutes);
  const currentReadyTime = new Date(existing.estimated_ready_at).getTime();
  const newReady = new Date(currentReadyTime + mins * 60 * 1000).toISOString();

  let newDelivery = null;
  if (existing.estimated_delivery_at) {
    const currentDeliveryTime = new Date(existing.estimated_delivery_at).getTime();
    newDelivery = new Date(currentDeliveryTime + mins * 60 * 1000).toISOString();
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders
    SET estimated_ready_at = ?, estimated_delivery_at = ?, updated_at = ?
    WHERE id = ?
  `).run(newReady, newDelivery, now, id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

  broadcastOrderUpdate(updated.tracking_token, {
    event: 'ESTIMATE_UPDATED',
    estimatedReadyAt: updated.estimated_ready_at,
    estimatedDeliveryAt: updated.estimated_delivery_at,
  });

  res.json(updated);
});

module.exports = router;
