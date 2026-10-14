const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'chill_night.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high reliability and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL,
      tracking_token TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      order_type TEXT NOT NULL CHECK (order_type IN ('DELIVERY', 'TAKEAWAY')),
      delivery_address TEXT,
      status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
      cancellation_reason TEXT,
      prep_time_minutes INTEGER NOT NULL DEFAULT 20,
      delivery_time_minutes INTEGER NOT NULL DEFAULT 20,
      estimated_ready_at TEXT NOT NULL,
      estimated_delivery_at TEXT,
      completed_at TEXT,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'ONLINE')),
      payment_status TEXT NOT NULL CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
      amount_paid REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT,
      name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON order_status_history(order_id);
  `);

  // Seed default settings if empty
  const now = new Date().toISOString();
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(k, String(v), now);
  }

  // Seed default categories and menu items if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    seedDefaultMenu();
  }

  // Seed sample initial order if no orders exist, so dashboard and tracking are immediately testable
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (orderCount === 0) {
    const readyTime = new Date(Date.now() + 18 * 60 * 1000).toISOString();
    const deliveryTime = new Date(Date.now() + 35 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO orders (
        id, order_number, tracking_token, customer_name, customer_phone,
        order_type, delivery_address, status, prep_time_minutes, delivery_time_minutes,
        estimated_ready_at, estimated_delivery_at, subtotal, delivery_fee,
        discount_amount, total_amount, payment_method, payment_status,
        amount_paid, remaining_amount, notes, created_at, updated_at
      ) VALUES (
        'ord_init101', 1001, 'trk_demo_1001', 'Muhammad Tayyab', '03009876543',
        'DELIVERY', 'House 42, Street 7, Sector F-10/2, Islamabad',
        'PREPARING', 20, 20,
        ?, ?, 1440, 150,
        0, 1590, 'CASH', 'UNPAID',
        0, 1590, 'Extra garlic sauce & fresh napkins', ?, ?
      )
    `).run(readyTime, deliveryTime, now, now);

    db.prepare(`
      INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price, quantity, subtotal, notes)
      VALUES
        ('oi_1', 'ord_init101', 'item_1', 'Chill Zinger Burger', 580, 2, 1160, 'Spicy mayo'),
        ('oi_2', 'ord_init101', 'item_10', 'Mint Margarita', 280, 1, 280, 'Extra chilled')
    `).run();

    db.prepare(`
      INSERT INTO order_status_history (id, order_id, status, note, timestamp)
      VALUES
        ('osh_1', 'ord_init101', 'CONFIRMED', 'Order received and confirmed', ?),
        ('osh_2', 'ord_init101', 'PREPARING', 'In the kitchen cooking fresh', ?)
    `).run(now, now);
  }
}

const DEFAULT_SETTINGS = {
  shop_name: 'Chill Night Food Point',
  shop_phone: '0329 1314400',
  alt_phone: '',
  address: 'Food Street, Sector F-10, Islamabad',
  city: 'Islamabad',
  currency: 'PKR (Rs.)',
  opening_time: '16:00',
  closing_time: '03:00',
  default_prep_time: '20',
  default_delivery_time: '20',
  default_delivery_fee: '150',
  min_order_amount: '0',
  default_order_type: 'TAKEAWAY',
  default_order_filter: 'ALL',
  confirm_destructive_actions: 'true',
  order_alert_sound: 'true',
  last_backup_time: '',
  backup_reminder_days: '7',
  public_url: '',
};

function seedDefaultMenu() {
  const now = new Date().toISOString();
  const seedCategories = [
    { id: 'cat_burgers', name: 'Burgers & Sandwiches', order: 1 },
    { id: 'cat_shawarma', name: 'Shawarma & Platters', order: 2 },
    { id: 'cat_pizza', name: 'Pizzas & Calzones', order: 3 },
    { id: 'cat_sides', name: 'Fries & Loaded Sides', order: 4 },
    { id: 'cat_beverages', name: 'Beverages & Shakes', order: 5 },
  ];

  const insertCat = db.prepare(`
    INSERT OR REPLACE INTO categories (id, name, display_order, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `);

  for (const c of seedCategories) {
    insertCat.run(c.id, c.name, c.order, now);
  }

  const seedItems = [
    { id: 'item_1', catId: 'cat_burgers', name: 'Chill Zinger Burger', desc: 'Crispy deep-fried chicken thigh with spicy secret garlic mayo & fresh iceberg lettuce', price: 580 },
    { id: 'item_2', catId: 'cat_burgers', name: 'Double Smash Beef Burger', desc: 'Two juicy smash beef patties with double melted cheddar and caramelized onions', price: 850 },
    { id: 'item_3', catId: 'cat_burgers', name: 'Chicken Chapli Burger', desc: 'Spiced traditional chicken chapli patty served with mint chutney and onion rings', price: 490 },
    { id: 'item_4', catId: 'cat_shawarma', name: 'Special Chicken Shawarma', desc: 'Slow-roasted marinated chicken shreds with garlic tahini, pickled cucumber & fries', price: 350 },
    { id: 'item_5', catId: 'cat_shawarma', name: 'Cheese Shawarma Platter', desc: 'Open platter with grilled pita bread, cheesy chicken chunks, garlic sauce & potato wedges', price: 650 },
    { id: 'item_6', catId: 'cat_pizza', name: 'Smoky Tikka Pizza (Small 8")', desc: 'Tender chicken tikka, sweet red onions, capsicum, and 100% mozzarella cheese', price: 690 },
    { id: 'item_7', catId: 'cat_pizza', name: 'Fajita Passion Pizza (Medium 10")', desc: 'Spiced Mexican fajita chicken, black olives, sweet peppers, mushrooms & herb crust', price: 1250 },
    { id: 'item_8', catId: 'cat_sides', name: 'Loaded Pizza Fries', desc: 'Crispy crinkle-cut fries topped with melted mozzarella, chicken tikka chunks & spicy dip', price: 550 },
    { id: 'item_9', catId: 'cat_sides', name: 'Classic Masala Fries', desc: 'Golden crispy potato fries tossed in special aromatic chaat masala', price: 260 },
    { id: 'item_10', catId: 'cat_beverages', name: 'Mint Margarita', desc: 'Fresh mint leaves, lemon juice, soda and crushed ice refreshing cooler', price: 280 },
    { id: 'item_11', catId: 'cat_beverages', name: 'Oreo Thick Shake', desc: 'Rich vanilla ice cream blended with double stuffed Oreo cookies and chocolate drizzle', price: 420 },
    { id: 'item_12', catId: 'cat_beverages', name: 'Soft Drink (Can 350ml)', desc: 'Chilled Pepsi, 7Up, or Mirinda can', price: 140 },
  ];

  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO menu_items (id, category_id, name, description, price, is_available, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const item of seedItems) {
    insertItem.run(item.id, item.catId, item.name, item.desc, item.price, now, now);
  }
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

function updateSettings(newSettings) {
  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const nowIso = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const [k, v] of Object.entries(newSettings)) {
      if (v !== undefined && v !== null) {
        updateStmt.run(k, String(v), nowIso);
      }
    }
    db.exec('COMMIT;');
    return getSettings();
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function resetOrders() {
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM order_status_history;');
    db.exec('DELETE FROM order_items;');
    db.exec('DELETE FROM orders;');
    db.exec('COMMIT;');
    return { success: true, message: 'All order history and status records have been safely cleared.' };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function resetMenu() {
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM menu_items;');
    db.exec('DELETE FROM categories;');
    db.exec('COMMIT;');
    return { success: true, message: 'Menu products and categories have been cleared.' };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function resetAllData() {
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM order_status_history;');
    db.exec('DELETE FROM order_items;');
    db.exec('DELETE FROM orders;');
    db.exec('DELETE FROM menu_items;');
    db.exec('DELETE FROM categories;');
    db.exec('DELETE FROM settings;');

    const now = new Date().toISOString();
    const insertSetting = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(k, String(v), now);
    }

    seedDefaultMenu();

    db.exec('COMMIT;');
    return { success: true, message: 'All application data has been reset to defaults.' };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

const ORDER_PREFIX = 'CNFP';

function formatOrderNumber(orderNumber) {
  if (!orderNumber && orderNumber !== 0) return '';
  const numStr = String(orderNumber).replace(/^#?CNFP?-?/i, '');
  return `${ORDER_PREFIX}-${numStr}`;
}

function getNextOrderNumber() {
  const result = db.prepare('SELECT MAX(order_number) as maxNum FROM orders').get();
  return (result && result.maxNum) ? result.maxNum + 1 : 1001;
}

module.exports = {
  db,
  initDatabase,
  ORDER_PREFIX,
  formatOrderNumber,
  getNextOrderNumber,
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  resetOrders,
  resetMenu,
  resetAllData,
  seedDefaultMenu,
};
