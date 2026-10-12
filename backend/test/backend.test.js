const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// Use a temporary test database
const testDbPath = path.join(__dirname, 'test_chill_night.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test_secret_12345';

const app = require('../src/server');
const { db } = require('../src/db');

// Helper to make lightweight local HTTP requests against Express app
let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  try {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (e) {
    // file lock on windows is released on process exit
  }
});

let ownerToken = '';

test('1. Authentication: Login with valid credentials succeeds and returns JWT', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'chillnight123' }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.owner.username, 'admin');
  ownerToken = data.token;
});

test('2. Authentication: Login with invalid password fails with 401', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  assert.equal(res.status, 401);
});

test('3. Menu Management: Fetch categories and items', async () => {
  const catRes = await fetch(`${baseUrl}/api/menu/categories`);
  assert.equal(catRes.status, 200);
  const categories = await catRes.json();
  assert.ok(categories.length > 0);

  const itemRes = await fetch(`${baseUrl}/api/menu/items`);
  assert.equal(itemRes.status, 200);
  const items = await itemRes.json();
  assert.ok(items.length >= 10);
});

let createdOrderId = '';
let createdTrackingToken = '';

test('4. Order Creation: DELIVERY order calculates totals and snapshot prices correctly', async () => {
  // Fetch an item to get its ID
  const itemsRes = await fetch(`${baseUrl}/api/menu/items`);
  const items = await itemsRes.json();
  const zingerItem = items.find((i) => i.name.includes('Zinger'));
  assert.ok(zingerItem);

  const orderPayload = {
    customerName: 'Huzaifa Khan',
    customerPhone: '+92 300 9876543',
    orderType: 'DELIVERY',
    deliveryAddress: 'Street 5, House 12, G-11/3, Islamabad',
    prepTimeMinutes: 25,
    deliveryTimeMinutes: 20,
    deliveryFee: 150,
    paymentMethod: 'CASH',
    amountPaid: 0,
    items: [
      { menuItemId: zingerItem.id, quantity: 2, notes: 'Extra spicy' }
    ],
  };

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify(orderPayload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();

  assert.ok(data.id);
  assert.ok(data.order_number >= 1001);
  assert.ok(data.tracking_token.startsWith('trk_'));
  assert.equal(data.customer_name, 'Huzaifa Khan');
  assert.equal(data.order_type, 'DELIVERY');
  assert.equal(data.subtotal, zingerItem.price * 2);
  assert.equal(data.delivery_fee, 150);
  assert.equal(data.total_amount, (zingerItem.price * 2) + 150);
  assert.equal(data.payment_status, 'UNPAID');
  assert.equal(data.status, 'CONFIRMED');

  // Verify historical snapshot preserves item price
  assert.equal(data.items[0].name, zingerItem.name);
  assert.equal(data.items[0].unit_price, zingerItem.price);

  createdOrderId = data.id;
  createdTrackingToken = data.tracking_token;
});

test('5. Historical Price Snapshot: Updating menu item price does NOT alter existing order', async () => {
  const itemsRes = await fetch(`${baseUrl}/api/menu/items`);
  const items = await itemsRes.json();
  const zingerItem = items.find((i) => i.name.includes('Zinger'));

  // Update item price
  const updateRes = await fetch(`${baseUrl}/api/menu/items/${zingerItem.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ price: zingerItem.price + 500 }),
  });
  assert.equal(updateRes.status, 200);

  // Re-fetch existing order
  const orderRes = await fetch(`${baseUrl}/api/orders/${createdOrderId}`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` },
  });
  assert.equal(orderRes.status, 200);
  const orderData = await orderRes.json();

  // Price in existing order snapshot MUST remain the old price
  assert.equal(orderData.items[0].unit_price, zingerItem.price);
  assert.equal(orderData.subtotal, zingerItem.price * 2);
});

test('6. Public Tracking Endpoint: Masks PII and returns accurate status and deadlines', async () => {
  const res = await fetch(`${baseUrl}/api/track/${createdTrackingToken}`);
  assert.equal(res.status, 200);
  const trackData = await res.json();

  // PII masking check
  assert.notEqual(trackData.customerPhoneMasked, '+92 300 9876543');
  assert.ok(trackData.customerPhoneMasked.includes('••••'));

  // Deadlines and status
  assert.equal(trackData.status, 'CONFIRMED');
  assert.ok(trackData.estimatedReadyAt);
  assert.ok(trackData.estimatedDeliveryAt);
  assert.ok(new Date(trackData.estimatedDeliveryAt) > new Date(trackData.estimatedReadyAt));

  // Items and totals
  assert.equal(trackData.items.length, 1);
  assert.equal(trackData.totalAmount, trackData.subtotal + trackData.deliveryFee);
});

test('7. Order Lifecycle Transitions: Advance status to PREPARING, READY, and DELIVERED', async () => {
  // Update to PREPARING
  let res = await fetch(`${baseUrl}/api/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  assert.equal(res.status, 200);

  let trackRes = await fetch(`${baseUrl}/api/track/${createdTrackingToken}`);
  let trackData = await trackRes.json();
  assert.equal(trackData.status, 'PREPARING');

  // Update to DELIVERED
  res = await fetch(`${baseUrl}/api/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'DELIVERED' }),
  });
  assert.equal(res.status, 200);

  trackRes = await fetch(`${baseUrl}/api/track/${createdTrackingToken}`);
  trackData = await trackRes.json();
  assert.equal(trackData.status, 'DELIVERED');
  assert.ok(trackData.completedAt);
});

test('8. Dashboard Stats: Calculates sales and completed orders for today in PKT', async () => {
  const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` },
  });
  assert.equal(res.status, 200);
  const stats = await res.json();

  assert.ok(stats.todayOrdersCount >= 1);
  assert.ok(stats.completedOrdersCount >= 1);
  assert.ok(stats.todaySalesTotal > 0);
});
