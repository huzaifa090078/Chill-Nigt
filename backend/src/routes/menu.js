const express = require('express');
const { randomUUID } = require('node:crypto');
const { db } = require('../db');
const { authenticateOwner } = require('../auth');

const router = express.Router();

// GET all categories (public or authenticated)
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC, name ASC').all();
  res.json(categories);
});

// POST new category (owner only)
router.post('/categories', authenticateOwner, (req, res) => {
  const { name, displayOrder = 0 } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const id = 'cat_' + randomUUID().substring(0, 8);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO categories (id, name, display_order, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(id, name.trim(), Number(displayOrder) || 0, now);

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json(created);
});

// GET all menu items
router.get('/items', (req, res) => {
  const { categoryId } = req.query;
  let query = `
    SELECT m.*, c.name as category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
  `;
  const params = [];

  if (categoryId) {
    query += ' WHERE m.category_id = ?';
    params.push(categoryId);
  }

  query += ' ORDER BY c.display_order ASC, m.name ASC';
  const items = db.prepare(query).all(...params);
  res.json(items);
});

// POST new menu item (owner only)
router.post('/items', authenticateOwner, (req, res) => {
  const { categoryId, name, description = '', price, isAvailable = 1 } = req.body;
  if (!categoryId || !name || price === undefined) {
    return res.status(400).json({ error: 'Category ID, name and price are required' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!cat) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  const id = 'item_' + randomUUID().substring(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO menu_items (id, category_id, name, description, price, is_available, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, categoryId, name.trim(), description.trim(), numPrice, isAvailable ? 1 : 0, now, now);

  const created = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?
  `).get(id);

  res.status(201).json(created);
});

// PUT update menu item (owner only)
router.put('/items/:id', authenticateOwner, (req, res) => {
  const { id } = req.params;
  const { categoryId, name, description = '', price, isAvailable } = req.body;

  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  const numPrice = price !== undefined ? Number(price) : existing.price;
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  const catId = categoryId || existing.category_id;
  const itemName = name !== undefined ? name.trim() : existing.name;
  const itemDesc = description !== undefined ? description.trim() : existing.description;
  const itemAvail = isAvailable !== undefined ? (isAvailable ? 1 : 0) : existing.is_available;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE menu_items
    SET category_id = ?, name = ?, description = ?, price = ?, is_available = ?, updated_at = ?
    WHERE id = ?
  `).run(catId, itemName, itemDesc, numPrice, itemAvail, now, id);

  const updated = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?
  `).get(id);

  res.json(updated);
});

// PATCH toggle item availability (owner only)
router.patch('/items/:id/availability', authenticateOwner, (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  const newStatus = isAvailable !== undefined ? (isAvailable ? 1 : 0) : (existing.is_available ? 0 : 1);
  const now = new Date().toISOString();

  db.prepare('UPDATE menu_items SET is_available = ?, updated_at = ? WHERE id = ?')
    .run(newStatus, now, id);

  res.json({ id, is_available: newStatus });
});

// DELETE menu item (owner only)
router.delete('/items/:id', authenticateOwner, (req, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  res.json({ success: true, message: 'Menu item deleted' });
});

module.exports = router;
