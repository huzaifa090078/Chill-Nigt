const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// Use unique timestamped test database file
const testDbPath = path.join(__dirname, `test_${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
process.env.PORT = '4005';

const app = require('../src/server');
const { initDatabase } = require('../src/db');

let server;
let baseUrl;

before(async () => {
  initDatabase();

  await new Promise((resolve) => {
    server = app.listen(4005, '127.0.0.1', () => {
      baseUrl = 'http://127.0.0.1:4005';
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Allow SQLite locks to clear before file cleanup
  setTimeout(() => {
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');
      if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
    } catch (e) {}
  }, 500);
});

describe('🍔 Chill Night Food Point — Backend Test Suite', () => {

  test('1. System Health: /api/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
  });

  test('2. Menu Management: Retrieves categories and menu items', async () => {
    const catRes = await fetch(`${baseUrl}/api/menu/categories`);
    assert.equal(catRes.status, 200);
    const cats = await catRes.json();
    assert.ok(Array.isArray(cats));
    assert.ok(cats.length >= 5);

    const itemsRes = await fetch(`${baseUrl}/api/menu/items`);
    assert.equal(itemsRes.status, 200);
    const items = await itemsRes.json();
    assert.ok(Array.isArray(items));
    assert.ok(items.length >= 10);
  });

  test('3. Order Creation: Authoritative price calculation and historical snapshots', async () => {
    const payload = {
      customerName: 'Hamza Tariq',
      customerPhone: '03123456789',
      orderType: 'DELIVERY',
      deliveryAddress: 'Sector F-10/4, Street 15, House 9, Islamabad',
      items: [
        { menuItemId: 'item_1', quantity: 2, notes: 'Extra spicy' }, // 580 * 2 = 1160
        { menuItemId: 'item_10', quantity: 1, notes: 'No crushed ice' } // 280 * 1 = 280
      ],
      prepTimeMinutes: 25,
      deliveryTimeMinutes: 15,
      deliveryFee: 150,
      paymentMethod: 'CASH',
      amountPaid: 0,
      notes: 'Please ring bell twice'
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const order = await res.json();

    assert.ok(order.id);
    assert.ok(order.tracking_token.startsWith('trk_'));
    assert.equal(order.customer_name, 'Hamza Tariq');
    assert.equal(order.order_type, 'DELIVERY');
    assert.equal(order.status, 'CONFIRMED');
    assert.equal(order.subtotal, 1440); // 1160 + 280
    assert.equal(order.delivery_fee, 150);
    assert.equal(order.total_amount, 1590);
    assert.equal(order.payment_status, 'UNPAID');
    assert.equal(order.remaining_amount, 1590);
    assert.ok(order.whatsappUrl.includes('923123456789')); // Formatted for WhatsApp

    // Verify snapshots
    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].name, 'Chill Zinger Burger');
    assert.equal(order.items[0].unit_price, 580);
  });

  test('4. Historical Price Isolation: Future menu edits do NOT alter past orders', async () => {
    // 1. Fetch created order
    const listRes = await fetch(`${baseUrl}/api/orders`);
    const orders = await listRes.json();
    const testOrder = orders.find(o => o.customer_name === 'Hamza Tariq');
    assert.ok(testOrder);
    assert.equal(testOrder.total_amount, 1590);

    // 2. Change price of item_1 from 580 to 999
    const updateRes = await fetch(`${baseUrl}/api/menu/items/item_1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 999 })
    });
    assert.equal(updateRes.status, 200);

    // 3. Verify order still has original historical snapshot price
    const orderRes = await fetch(`${baseUrl}/api/orders/${testOrder.id}`);
    const updatedOrder = await orderRes.json();
    assert.equal(updatedOrder.total_amount, 1590);
    assert.equal(updatedOrder.items[0].unit_price, 580);
    assert.equal(updatedOrder.items[0].subtotal, 1160);
  });

  test('5. Order Lifecycle Transitions: Updates status and records status history', async () => {
    const listRes = await fetch(`${baseUrl}/api/orders`);
    const orders = await listRes.json();
    const testOrder = orders.find(o => o.customer_name === 'Hamza Tariq');

    // Advance to PREPARING
    const resPrep = await fetch(`${baseUrl}/api/orders/${testOrder.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PREPARING', note: 'Kitchen started frying' })
    });
    assert.equal(resPrep.status, 200);
    const dataPrep = await resPrep.json();
    assert.equal(dataPrep.status, 'PREPARING');

    // Advance to DELIVERED
    const resDel = await fetch(`${baseUrl}/api/orders/${testOrder.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DELIVERED', note: 'Customer accepted order' })
    });
    assert.equal(resDel.status, 200);
    const dataDel = await resDel.json();
    assert.equal(dataDel.status, 'DELIVERED');
    assert.ok(dataDel.completed_at);

    // Verify history audit trail
    const detailRes = await fetch(`${baseUrl}/api/orders/${testOrder.id}`);
    const detail = await detailRes.json();
    assert.ok(detail.history.length >= 3);
  });

  test('6. Payment Processing: Updates payment method, amount paid, and status', async () => {
    const listRes = await fetch(`${baseUrl}/api/orders`);
    const orders = await listRes.json();
    const testOrder = orders.find(o => o.customer_name === 'Hamza Tariq');

    const resPay = await fetch(`${baseUrl}/api/orders/${testOrder.id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'CASH', amountPaid: 1590 })
    });
    assert.equal(resPay.status, 200);
    const paidOrder = await resPay.json();
    assert.equal(paidOrder.payment_status, 'PAID');
    assert.equal(paidOrder.amount_paid, 1590);
    assert.equal(paidOrder.remaining_amount, 0);
  });

  test('7. Public Customer Tracking Endpoint: Masks PII and returns accurate status', async () => {
    const listRes = await fetch(`${baseUrl}/api/orders`);
    const orders = await listRes.json();
    const testOrder = orders.find(o => o.customer_name === 'Hamza Tariq');

    const trackRes = await fetch(`${baseUrl}/api/track/${testOrder.tracking_token}`);
    assert.equal(trackRes.status, 200);
    const tracking = await trackRes.json();

    assert.equal(tracking.orderNumber, testOrder.order_number);
    assert.equal(tracking.customerName, 'Hamza Tariq');
    // Masked phone format (e.g. "0312 ••••• 89")
    assert.ok(tracking.customerPhoneMasked.includes('•••••'));
    assert.equal(tracking.status, 'DELIVERED');
    assert.equal(tracking.totalAmount, 1590);
    assert.equal(tracking.restaurant.name, 'Chill Night Food Point');
  });

  test('8. Dashboard Metrics: Calculates sales and completed orders from real data', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`);
    assert.equal(res.status, 200);
    const stats = await res.json();

    assert.ok(stats.todayOrdersCount >= 1);
    assert.ok(stats.completedOrdersCount >= 1);
    assert.ok(stats.todaySalesTotal >= 1590);
    assert.ok(Array.isArray(stats.recentOrders));
    assert.ok(stats.recentOrders.length >= 1);
  });

  test('9. Payments Metrics: Aggregates revenue, collections, and receivables', async () => {
    const res = await fetch(`${baseUrl}/api/payments/stats`);
    assert.equal(res.status, 200);
    const stats = await res.json();

    assert.ok(stats.grandTotalSales >= 1590);
    assert.ok(stats.totalCollected >= 1590);
    assert.ok(stats.paidOrdersCount >= 1);
  });
});
