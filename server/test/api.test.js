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
    assert.equal(tracking.orderCode, `CNFP-${testOrder.order_number}`);
    assert.equal(tracking.customerName, 'Hamza Tariq');
    // Masked phone format (e.g. "0312 ••••• 89")
    assert.ok(tracking.customerPhoneMasked.includes('•••••'));
    assert.equal(tracking.status, 'DELIVERED');
    assert.equal(tracking.totalAmount, 1590);
    assert.equal(tracking.restaurant.name, 'Chill Night Food Point');
    assert.equal(tracking.restaurant.phone, '0329 1314400');
    assert.equal(tracking.restaurant.phoneDial, '03291314400');
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

  test('10. WhatsApp Message & Security: Validates items, total, ETA and tracking URL isolation', async () => {
    const listRes = await fetch(`${baseUrl}/api/orders`);
    const orders = await listRes.json();
    const testOrder = orders.find(o => o.customer_name === 'Hamza Tariq');

    const detailRes = await fetch(`${baseUrl}/api/orders/${testOrder.id}`);
    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();

    // Verify WhatsApp message content contains restaurant name, order number, items, total, and tracking link
    assert.ok(detail.whatsappText.includes('Chill Night Food Point'));
    assert.ok(detail.whatsappText.includes('Assalam-o-Alaikum! 🍔'));
    assert.ok(detail.whatsappText.includes('Aapka order confirm ho gaya hai.'));
    assert.ok(detail.whatsappText.includes(`*Order #CNFP-${testOrder.order_number}*`));
    assert.ok(detail.whatsappText.includes('🍔 Chill Zinger Burger (Extra spicy) × 2 — Rs. 1160'));
    assert.ok(detail.whatsappText.includes('🛵 Delivery Fee: Rs. 150'));
    assert.ok(detail.whatsappText.includes('*Total: Rs. 1590*'));
    assert.ok(detail.whatsappText.includes('⏱️ Estimated delivery time: '));
    assert.ok(detail.whatsappText.includes('📍 *LIVE ORDER TRACKING:*\nTap the link below to track your order in real time:\n\n'));
    assert.ok(detail.whatsappText.includes(`token=${testOrder.tracking_token}`));
    assert.ok(detail.whatsappText.includes('_Chill Night Food Point — 0329 1314400_'));
    assert.ok(detail.whatsappUrl.startsWith('https://api.whatsapp.com/send?phone=923123456789&text='));

    // Verify WhatsApp URL decoded text exactly matches detail.whatsappText
    const urlObj = new URL(detail.whatsappUrl);
    assert.equal(urlObj.searchParams.get('phone'), '923123456789');
    assert.equal(urlObj.searchParams.get('text'), detail.whatsappText);

    // Security check: Invalid token must return 400 or 404, never sensitive data
    const invalidTokenRes = await fetch(`${baseUrl}/api/track/invalid-token-without-prefix`);
    assert.equal(invalidTokenRes.status, 400);

    const nonExistentTokenRes = await fetch(`${baseUrl}/api/track/trk_nonexistent1234567890`);
    assert.equal(nonExistentTokenRes.status, 404);
  });

  test('11. WhatsApp Message Formatting: Validates Takeaway order, variants, PAID status, and exact structure', async () => {
    // Create a Takeaway order with pizza variant and paid status
    const takeawayPayload = {
      customerName: 'Ayesha Khan',
      customerPhone: '03009876543',
      orderType: 'TAKEAWAY',
      items: [
        { menuItemId: 'item_7', quantity: 1, notes: 'Crispy thin crust' }
      ],
      prepTimeMinutes: 20,
      paymentMethod: 'ONLINE',
      amountPaid: 1250, // Full price of Fajita Passion Pizza (Medium 10")
      notes: 'Customer will pick up at counter'
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(takeawayPayload)
    });
    assert.equal(res.status, 201);
    const order = await res.json();

    assert.equal(order.customer_name, 'Ayesha Khan');
    assert.equal(order.order_type, 'TAKEAWAY');
    assert.equal(order.payment_status, 'PAID');
    assert.equal(order.order_code, `CNFP-${order.order_number}`);

    // Verify WhatsApp text
    const text = order.whatsappText;
    assert.ok(text.startsWith('Assalam-o-Alaikum! 🍔\n\nAapka order confirm ho gaya hai.\n\n*Order #CNFP-'));
    assert.ok(text.includes('🍕 Fajita Passion Pizza (Medium 10") (Crispy thin crust) × 1 — Rs. 1250'));
    // Delivery fee line should NOT be present for takeaway
    assert.ok(!text.includes('🛵 Delivery Fee:'));
    assert.ok(text.includes('*Total: Rs. 1250*'));
    assert.ok(text.includes('⏱️ Estimated ready time: 20 minutes'));
    assert.ok(text.includes('📍 *LIVE ORDER TRACKING:*\nTap the link below to track your order in real time:\n\n'));
    assert.ok(text.includes(`token=${order.tracking_token}`));
    assert.ok(text.endsWith('_Chill Night Food Point — 0329 1314400_'));

    // Verify WhatsApp URL
    assert.ok(order.whatsappUrl.startsWith('https://api.whatsapp.com/send?phone=923009876543&text='));
    const urlObj = new URL(order.whatsappUrl);
    assert.equal(urlObj.searchParams.get('phone'), '923009876543');
    assert.equal(urlObj.searchParams.get('text'), text);
  });

  test('12. Settings, Backup & Danger Zone: Profile update, export/import and safe reset', async () => {
    // 1. Get current settings
    const getRes = await fetch(`${baseUrl}/api/settings`);
    assert.equal(getRes.status, 200);
    const settings = await getRes.json();
    assert.ok(settings.shop_name);
    assert.ok(settings.shop_phone);

    // 2. Update settings
    const putRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_name: 'Chill Night Food Point (Main Branch)',
        shop_phone: '0329 1314400',
        alt_phone: '0300 1234567',
        default_delivery_fee: 120,
        default_order_type: 'DELIVERY'
      })
    });
    assert.equal(putRes.status, 200);
    const updated = await putRes.json();
    assert.equal(updated.shop_name, 'Chill Night Food Point (Main Branch)');
    assert.equal(updated.alt_phone, '0300 1234567');
    assert.equal(updated.default_delivery_fee, '120');

    // 3. Export backup
    const exportRes = await fetch(`${baseUrl}/api/settings/backup/export`);
    assert.equal(exportRes.status, 200);
    const backup = await exportRes.json();
    assert.equal(backup.appName, 'Chill Night Food Point');
    assert.equal(backup.version, '1.0');
    assert.ok(Array.isArray(backup.data.categories));
    assert.ok(Array.isArray(backup.data.menuItems));
    assert.ok(Array.isArray(backup.data.orders));
    assert.ok(backup.data.orders.length > 0);

    // 4. Reset orders only
    const resetOrdersRes = await fetch(`${baseUrl}/api/settings/reset/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: true })
    });
    assert.equal(resetOrdersRes.status, 200);
    const listAfterReset = await (await fetch(`${baseUrl}/api/orders`)).json();
    assert.equal(listAfterReset.length, 0);

    // 5. Restore backup
    const importRes = await fetch(`${baseUrl}/api/settings/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup)
    });
    assert.equal(importRes.status, 200);
    const importData = await importRes.json();
    assert.equal(importData.success, true);

    const listAfterRestore = await (await fetch(`${baseUrl}/api/orders`)).json();
    assert.equal(listAfterRestore.length, backup.data.orders.length);

    // 6. Reset all - guard with confirmationText
    const badResetRes = await fetch(`${baseUrl}/api/settings/reset/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationText: 'WRONG' })
    });
    assert.equal(badResetRes.status, 400);

    // Successful reset all with 'RESET'
    const goodResetRes = await fetch(`${baseUrl}/api/settings/reset/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationText: 'RESET' })
    });
    assert.equal(goodResetRes.status, 200);

    const ordersFinal = await (await fetch(`${baseUrl}/api/orders`)).json();
    assert.equal(ordersFinal.length, 0);

    const categoriesFinal = await (await fetch(`${baseUrl}/api/menu/categories`)).json();
    assert.ok(categoriesFinal.length > 0); // Seeded default menu
  });
});
