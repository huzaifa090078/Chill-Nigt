import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Search } from 'lucide-react';
import { Category, MenuItem } from '../../types';
import * as api from '../../services/api';

interface MenuViewProps {
  categories: Category[];
  menuItems: MenuItem[];
  onRefresh: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({ categories, menuItems, onRefresh }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCatId, setFormCatId] = useState('');

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCatId === 'ALL' || item.category_id === selectedCatId;
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });

  const openAddModal = () => {
    setFormName('');
    setFormPrice('');
    setFormDesc('');
    setFormCatId(categories[0]?.id || '');
    setIsAddOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(String(item.price));
    setFormDesc(item.description);
    setFormCatId(item.category_id);
  };

  const handleToggleStock = async (item: MenuItem) => {
    try {
      const newStatus = item.is_available === 1 ? 0 : 1;
      await api.toggleItemAvailability(item.id, newStatus);
      onRefresh();
    } catch {
      alert('Failed to update stock');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.updateMenuItem(editingItem.id, {
          categoryId: formCatId,
          name: formName.trim(),
          price: Number(formPrice),
          description: formDesc.trim(),
        });
        setEditingItem(null);
      } else {
        await api.addMenuItem({
          categoryId: formCatId,
          name: formName.trim(),
          price: Number(formPrice),
          description: formDesc.trim(),
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      alert('Failed to save menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;
    try {
      await api.deleteMenuItem(id);
      onRefresh();
    } catch {
      alert('Failed to delete item');
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-black text-white">Menu Management</h2>
          <p className="text-[11px] text-slate-400 truncate">Categories, prices, and stock</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Search & Categories Tabs */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            onClick={() => setSelectedCatId('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              selectedCatId === 'ALL'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCatId === c.id
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List: 1-Column Clean Mobile Cards */}
      <div className="space-y-2.5">
        {filteredItems.map((item) => {
          const isAvailable = item.is_available === 1;

          return (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-2xl p-3.5 space-y-2.5 transition ${
                isAvailable ? 'border-slate-800 shadow-sm' : 'border-rose-950/40 opacity-70 bg-slate-900/60'
              }`}
            >
              {/* Top: Category tag, Name, and Price */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {item.category_name}
                  </span>
                  <h4 className="font-extrabold text-sm sm:text-base text-white truncate">{item.name}</h4>
                  {item.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <span className="font-mono font-black text-xs sm:text-sm text-orange-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 shrink-0">
                  Rs. {Math.round(item.price)}
                </span>
              </div>

              {/* Bottom: Stock Status Toggle and Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {/* Stock Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStock(item)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
                    isAvailable
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  {isAvailable ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>{isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                </button>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl transition"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Item Modal */}
      {(isAddOpen || editingItem) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-2 mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-black text-white text-base">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={formCatId}
                  onChange={(e) => setFormCatId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Crispy Zinger Burger"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Price (PKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 580"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, toppings or special notes..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs transition"
                >
                  {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
