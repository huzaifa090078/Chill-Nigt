const { db, initDatabase, getNextOrderNumber } = require('./src/db');
initDatabase();

const orderCount = db.prepare('SELECT count(*) as count FROM orders').get().count;
if (orderCount === 0) {
  const now = new Date();
  const readyTime = new Date(now.getTime() + 18 * 60 * 1000).toISOString();
  const deliveryTime = new Date(now.getTime() + 35 * 60 * 1000).toISOString();
  const orderId = 'ord_demo101';
  const trackingToken = 'trk_chillnight_demo';
  const orderNum = getNextOrderNumber();

  db.prepare(`
    INSERT INTO orders (
      id, order_number, tracking_token, customer_name, customer_phone,
      order_type, delivery_address, status, prep_time_minutes, delivery_time_minutes,
      estimated_ready_at, estimated_delivery_at, subtotal, delivery_fee,
      discount_amount, total_amount, payment_method, payment_status,
      amount_paid, remaining_amount, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, 'PREPARING', 20, 20,
      ?, ?, 1440, 150,
      0, 1590, 'CASH', 'UNPAID',
      0, 1590, 'Extra garlic mayo & fresh fries', ?, ?
    )
  `).run(
    orderId,
    orderNum,
    trackingToken,
    'Muhammad Tayyab',
    '+92 300 9876543',
    'DELIVERY',
    'House 42, Street 7, Sector F-10/2, Islamabad',
    readyTime,
    deliveryTime,
    now.toISOString(),
    now.toISOString()
  );

  db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price, quantity, subtotal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('oi_1', orderId, 'item_1', 'Chill Zinger Burger', 580, 2, 1160, 'Spicy mayo');

  db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price, quantity, subtotal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('oi_2', orderId, 'item_10', 'Mint Margarita', 280, 1, 280, 'Extra chilled');

  console.log('Seeded demo order with token:', trackingToken);
} else {
  const existing = db.prepare('SELECT tracking_token FROM orders LIMIT 1').get();
  console.log('Existing demo order token:', existing.tracking_token);
}
