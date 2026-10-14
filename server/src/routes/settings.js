const express = require('express');
const {
  db,
  getSettings,
  updateSettings,
  resetOrders,
  resetMenu,
  resetAllData,
  seedDefaultMenu,
} = require('../db');

const router = express.Router();

// GET all settings
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT update settings
router.put('/', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload' });
    }

    // Validation
    if (payload.shop_name !== undefined && !String(payload.shop_name).trim()) {
      return res.status(400).json({ error: 'Shop name cannot be empty' });
    }
    if (payload.shop_phone !== undefined && !String(payload.shop_phone).trim()) {
      return res.status(400).json({ error: 'Shop WhatsApp / contact number is required' });
    }

    const updated = updateSettings(payload);
    res.json(updated);
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// GET export full application backup JSON
router.get('/backup/export', (req, res) => {
  try {
    const settings = getSettings();
    const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
    const menu_items = db.prepare('SELECT * FROM menu_items').all();
    const orders = db.prepare('SELECT * FROM orders ORDER BY order_number ASC').all();
    const order_items = db.prepare('SELECT * FROM order_items').all();
    const order_status_history = db.prepare('SELECT * FROM order_status_history ORDER BY timestamp ASC').all();

    const nowIso = new Date().toISOString();
    updateSettings({ last_backup_time: nowIso });

    const backupPayload = {
      app: 'Chill Night Food Point',
      appName: 'Chill Night Food Point',
      version: '1.0',
      exportedAt: nowIso,
      metadata: {
        categoriesCount: categories.length,
        menuItemsCount: menu_items.length,
        ordersCount: orders.length,
        orderItemsCount: order_items.length,
        statusHistoryCount: order_status_history.length,
      },
      data: {
        settings,
        categories,
        menu_items,
        menuItems: menu_items,
        orders,
        order_items,
        orderItems: order_items,
        order_status_history,
      },
    };

    const filename = `chill_night_backup_${nowIso.replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err) {
    console.error('Error exporting backup:', err);
    res.status(500).json({ error: 'Failed to generate application backup' });
  }
});

// POST import and restore application backup JSON
router.post('/backup/import', (req, res) => {
  try {
    let backup = req.body;
    // Allow wrapping in { backup: ... } or raw payload
    if (backup && backup.backup) {
      backup = backup.backup;
    }

    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({ error: 'Invalid backup file format: must be valid JSON' });
    }

    const appIdentifier = backup.app || backup.appName;
    if (appIdentifier !== 'Chill Night Food Point') {
      return res.status(400).json({
        error: `Invalid backup file: Expected app "Chill Night Food Point", but received "${appIdentifier || 'Unknown'}"`,
      });
    }

    if (!backup.data || typeof backup.data !== 'object') {
      return res.status(400).json({ error: 'Malformed backup file: missing data block' });
    }

    const {
      settings = {},
      categories = [],
      menu_items = backup.data.menuItems || [],
      orders = [],
      order_items = backup.data.orderItems || [],
      order_status_history = [],
    } = backup.data;

    // Transactional restore
    db.exec('BEGIN TRANSACTION;');
    try {
      // Clear current data
      db.exec('DELETE FROM order_status_history;');
      db.exec('DELETE FROM order_items;');
      db.exec('DELETE FROM orders;');
      db.exec('DELETE FROM menu_items;');
      db.exec('DELETE FROM categories;');
      db.exec('DELETE FROM settings;');

      // Restore settings
      const nowIso = new Date().toISOString();
      const insertSetting = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
      for (const [k, v] of Object.entries(settings)) {
        insertSetting.run(k, String(v), nowIso);
      }

      // Restore categories
      const insertCat = db.prepare(`
        INSERT INTO categories (id, name, display_order, is_active, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const c of categories) {
        insertCat.run(c.id, c.name, c.display_order ?? 0, c.is_active ?? 1, c.created_at || nowIso);
      }

      // Restore menu items
      const insertItem = db.prepare(`
        INSERT INTO menu_items (id, category_id, name, description, price, is_available, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of menu_items) {
        insertItem.run(
          it.id,
          it.category_id,
          it.name,
          it.description || '',
          it.price,
          it.is_available ?? 1,
          it.created_at || nowIso,
          it.updated_at || nowIso
        );
      }

      // Restore orders
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          id, order_number, tracking_token, customer_name, customer_phone,
          order_type, delivery_address, status, cancellation_reason,
          prep_time_minutes, delivery_time_minutes, estimated_ready_at, estimated_delivery_at,
          completed_at, subtotal, delivery_fee, discount_amount, total_amount,
          payment_method, payment_status, amount_paid, remaining_amount, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const o of orders) {
        insertOrder.run(
          o.id,
          o.order_number,
          o.tracking_token,
          o.customer_name,
          o.customer_phone,
          o.order_type,
          o.delivery_address,
          o.status,
          o.cancellation_reason,
          o.prep_time_minutes || 20,
          o.delivery_time_minutes || 20,
          o.estimated_ready_at,
          o.estimated_delivery_at,
          o.completed_at,
          o.subtotal,
          o.delivery_fee,
          o.discount_amount || 0,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.amount_paid || 0,
          o.remaining_amount || 0,
          o.notes || '',
          o.created_at || nowIso,
          o.updated_at || nowIso
        );
      }

      // Restore order items
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price, quantity, subtotal, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const oi of order_items) {
        insertOrderItem.run(
          oi.id,
          oi.order_id,
          oi.menu_item_id,
          oi.name,
          oi.unit_price,
          oi.quantity,
          oi.subtotal,
          oi.notes || ''
        );
      }

      // Restore history
      const insertHistory = db.prepare(`
        INSERT INTO order_status_history (id, order_id, status, note, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const h of order_status_history) {
        insertHistory.run(h.id, h.order_id, h.status, h.note || '', h.timestamp || nowIso);
      }

      db.exec('COMMIT;');

      res.json({
        success: true,
        message: 'Application data restored successfully from backup',
        restored: {
          categoriesCount: categories.length,
          menuItemsCount: menu_items.length,
          ordersCount: orders.length,
        },
      });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ error: `Restore failed: ${err.message || 'Corrupt or incompatible backup file'}` });
  }
});

// POST reset order history (Danger Zone)
router.post('/reset/orders', (req, res) => {
  try {
    const { confirmation } = req.body || {};
    if (!confirmation) {
      return res.status(400).json({ error: 'Explicit confirmation is required to reset order history' });
    }
    const result = resetOrders();
    res.json(result);
  } catch (err) {
    console.error('Error resetting orders:', err);
    res.status(500).json({ error: 'Failed to reset orders' });
  }
});

// POST reset menu items & categories (Danger Zone)
router.post('/reset/menu', (req, res) => {
  try {
    const { confirmation, reseedDefaults = false } = req.body || {};
    if (!confirmation) {
      return res.status(400).json({ error: 'Explicit confirmation is required to reset menu items' });
    }
    const result = resetMenu();
    if (reseedDefaults) {
      seedDefaultMenu();
      result.message += ' Default menu and categories reseeded.';
    }
    res.json(result);
  } catch (err) {
    console.error('Error resetting menu:', err);
    res.status(500).json({ error: 'Failed to reset menu' });
  }
});

// POST reset all application data (Danger Zone: requires 'RESET')
router.post('/reset/all', (req, res) => {
  try {
    const { confirmationText } = req.body;
    if (confirmationText !== 'RESET') {
      return res.status(400).json({
        error: 'Security verification failed: You must type RESET exactly to confirm resetting all application data',
      });
    }
    const result = resetAllData();
    res.json(result);
  } catch (err) {
    console.error('Error resetting all app data:', err);
    res.status(500).json({ error: 'Failed to reset application data' });
  }
});

module.exports = router;
