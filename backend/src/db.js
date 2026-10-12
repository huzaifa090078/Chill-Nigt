const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'chill_night.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for performance and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS owners (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      restaurant_name TEXT NOT NULL DEFAULT 'Chill Night Food Point',
      phone TEXT NOT NULL DEFAULT '+92 300 1234567',
      address TEXT NOT NULL DEFAULT 'Main Market, Islamabad',
      created_at TEXT NOT NULL
    );

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
      client_submission_id TEXT UNIQUE,
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

    CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);

  // Seed default owner if none exists
  const ownerCount = db.prepare('SELECT COUNT(*) as count FROM owners').get().count;
  if (ownerCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('chillnight123', salt);
    const insertOwner = db.prepare(`
      INSERT INTO owners (id, username, password_hash, restaurant_name, phone, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertOwner.run(
      'owner_default',
      'admin',
      hash,
      'Chill Night Food Point',
      '+92 300 7654321',
      'Food Street, Sector F-10, Islamabad',
      new Date().toISOString()
    );
  }

  // Seed default menu categories and items if none exist
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const seedCategories = [
      { id: 'cat_burgers', name: 'Burgers & Sandwiches', order: 1 },
      { id: 'cat_shawarma', name: 'Shawarma & Wraps', order: 2 },
      { id: 'cat_pizza', name: 'Pizzas & Calzones', order: 3 },
      { id: 'cat_sides', name: 'Fries & Sides', order: 4 },
      { id: 'cat_beverages', name: 'Beverages & Shakes', order: 5 },
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, display_order, is_active, created_at)
      VALUES (?, ?, ?, 1, ?)
    `);

    for (const c of seedCategories) {
      insertCat.run(c.id, c.name, c.order, new Date().toISOString());
    }

    const seedItems = [
      { id: 'item_1', catId: 'cat_burgers', name: 'Chill Zinger Burger', desc: 'Crispy fried chicken breast, spicy mayo & fresh lettuce', price: 580 },
      { id: 'item_2', catId: 'cat_burgers', name: 'Double Patty Beef Burger', desc: 'Smash beef patties with cheddar cheese & secret sauce', price: 850 },
      { id: 'item_3', catId: 'cat_burgers', name: 'Chicken Chapli Burger', desc: 'Authentic spiced chicken chapli patty with mint chutney', price: 490 },
      { id: 'item_4', catId: 'cat_shawarma', name: 'Special Chicken Shawarma', desc: 'Marinated shredded chicken wrapped with garlic mayo & pickles', price: 350 },
      { id: 'item_5', catId: 'cat_shawarma', name: 'Cheese Shawarma Platter', desc: 'Open shawarma with melted cheese, fries and pita bread', price: 620 },
      { id: 'item_6', catId: 'cat_pizza', name: 'Chicken Tikka Pizza (Small)', desc: 'Smoky tikka chicken, onions, peppers & mozzarella', price: 690 },
      { id: 'item_7', catId: 'cat_pizza', name: 'Fajita Passion Pizza (Medium)', desc: 'Spiced fajita chicken, black olives, capsicum & cheese', price: 1250 },
      { id: 'item_8', catId: 'cat_sides', name: 'Loaded Pizza Fries', desc: 'Crispy potato fries loaded with cheese, chicken chunks & olives', price: 550 },
      { id: 'item_9', catId: 'cat_sides', name: 'Classic Masala Fries', desc: 'Fresh potato crinkle fries with traditional chaat masala', price: 260 },
      { id: 'item_10', catId: 'cat_beverages', name: 'Mint Margarita', desc: 'Fresh mint, lemon juice, soda and crushed ice', price: 280 },
      { id: 'item_11', catId: 'cat_beverages', name: 'Soft Drink (Can 350ml)', desc: 'Chilled Pepsi, 7Up, or Mirinda', price: 140 },
      { id: 'item_12', catId: 'cat_beverages', name: 'Oreo Thick Shake', desc: 'Rich ice cream shake with crushed Oreo cookies', price: 420 },
    ];

    const insertItem = db.prepare(`
      INSERT INTO menu_items (id, category_id, name, description, price, is_available, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const item of seedItems) {
      insertItem.run(item.id, item.catId, item.name, item.desc, item.price, now, now);
    }
  }
}

// Function to allocate the next sequential order number
function getNextOrderNumber() {
  const result = db.prepare('SELECT MAX(order_number) as maxNum FROM orders').get();
  return (result && result.maxNum) ? result.maxNum + 1 : 1001;
}

module.exports = {
  db,
  initDatabase,
  getNextOrderNumber,
};
