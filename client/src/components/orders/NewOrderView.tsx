import React, { useState, useMemo } from 'react';
import {
  Plus,
  Minus,
  Send,
  ExternalLink,
  CheckCircle2,
  Search,
  ArrowRight,
  X,
  ShoppingBag,
} from 'lucide-react';
import { Category, MenuItem, Order, OrderType, PaymentMethod } from '../../types';
import * as api from '../../services/api';

interface NewOrderViewProps {
  categories: Category[];
  menuItems: MenuItem[];
  onOrderCreated: (order: Order) => void;
  onViewOrder: (order: Order) => void;
}

export const NewOrderView: React.FC<NewOrderViewProps> = ({
  categories,
  menuItems,
  onOrderCreated,
  onViewOrder,
}) => {
  // Cart state: itemId -> { quantity, notes }
  const [cart, setCart] = useState<Record<string, { quantity: number; notes: string }>>({});
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Checkout Drawer State
  const [isMobileCheckoutOpen, setIsMobileCheckoutOpen] = useState(false);

  // Customer & Delivery form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('20');
  const [deliveryTimeMinutes, setDeliveryTimeMinutes] = useState('20');
  const [deliveryFee, setDeliveryFee] = useState('150');
  const [orderNotes, setOrderNotes] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState('0');

  // Submission state & modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCat = selectedCatId === 'ALL' || item.category_id === selectedCatId;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCatId, searchQuery]);

  // Calculations
  const itemsMap = useMemo(() => new Map(menuItems.map((m) => [m.id, m])), [menuItems]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const [id, entry] of Object.entries(cart)) {
      const item = itemsMap.get(id);
      if (item) sum += item.price * entry.quantity;
    }
    return sum;
  }, [cart, itemsMap]);

  const finalDeliveryFee = orderType === 'DELIVERY' ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const totalBill = subtotal + finalDeliveryFee;
  const totalItemsCount = Object.values(cart).reduce((a, b) => a + b.quantity, 0);

  // Cart operations
  const addToCart = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId] || { quantity: 0, notes: '' };
      return {
        ...prev,
        [itemId]: { ...current, quantity: current.quantity + 1 },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      if (current.quantity > 1) {
        return {
          ...prev,
          [itemId]: { ...current, quantity: current.quantity - 1 },
        };
      }
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: { ...current, notes },
      };
    });
  };

  const clearCart = () => {
    setCart({});
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setOrderNotes('');
    setAmountPaid('0');
  };

  // Submit order handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Customer name is required');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Customer phone number is required');
      return;
    }
    if (Object.keys(cart).length === 0) {
      setErrorMsg('Cart is empty. Please add at least 1 food item.');
      return;
    }
    if (orderType === 'DELIVERY' && !deliveryAddress.trim()) {
      setErrorMsg('Delivery address is required for home delivery orders');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = Object.entries(cart).map(([itemId, entry]) => ({
        menuItemId: itemId,
        quantity: entry.quantity,
        notes: entry.notes,
      }));

      const newOrder = await api.createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderType,
        deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
        items: itemsPayload,
        prepTimeMinutes: Number(prepTimeMinutes) || 20,
        deliveryTimeMinutes: Number(deliveryTimeMinutes) || 20,
        deliveryFee: finalDeliveryFee,
        paymentMethod,
        amountPaid: Number(amountPaid) || 0,
        notes: orderNotes.trim(),
      });

      setCreatedOrder(newOrder);
      onOrderCreated(newOrder);
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5">
        <div>
          <h2 className="text-xl font-black text-white">Create New POS Order</h2>
          <p className="text-xs text-slate-400">Select items, enter customer details and generate instant tracking link</p>
        </div>
        {totalItemsCount > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 self-start sm:self-auto"
          >
            Clear Cart
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Left = Menu Catalog, Right = Order Summary & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ================= LEFT COLUMN: MENU CATALOG ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Categories Bar */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search burgers, shawarma, pizzas, drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
              <button
                onClick={() => setSelectedCatId('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedCatId === 'ALL'
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Menu
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

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const inCart = cart[item.id];
              const qty = inCart ? inCart.quantity : 0;
              const isAvailable = item.is_available === 1;

              return (
                <div
                  key={item.id}
                  className={`bg-slate-900 border rounded-2xl p-3.5 flex flex-col justify-between transition ${
                    qty > 0 ? 'border-orange-500/50 shadow-md shadow-orange-500/5' : 'border-slate-800'
                  } ${!isAvailable ? 'opacity-60' : ''}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-white">{item.name}</h4>
                      <span className="font-extrabold text-sm text-orange-400 font-mono shrink-0">
                        Rs. {Math.round(item.price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {item.category_name || 'Chill Night'}
                    </span>

                    {!isAvailable ? (
                      <span className="text-[11px] font-bold text-rose-400">Out of Stock</span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => addToCart(item.id)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition active:scale-95 shadow-sm shadow-orange-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-1.5 py-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-xs text-orange-400 w-5 text-center">
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-6 h-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 flex items-center justify-center font-bold transition active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CART & CUSTOMER CHECKOUT ================= */}
        {/* Mobile Slide-up Bottom Sheet Backdrop */}
        {isMobileCheckoutOpen && (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileCheckoutOpen(false)}
          />
        )}

        <div
          className={`
            ${isMobileCheckoutOpen
              ? 'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto bg-slate-900 border-t border-slate-800 rounded-t-[2rem] shadow-2xl p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200'
              : 'hidden lg:block'
            }
            lg:col-span-5 space-y-4
          `}
        >
          {/* Mobile Handle Pill */}
          <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />
            <button
              type="button"
              onClick={() => setIsMobileCheckoutOpen(false)}
              className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitOrder} className="bg-transparent lg:bg-slate-900 lg:border lg:border-slate-800 lg:rounded-3xl lg:p-5 lg:shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base">Order Cart</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400">
                  {totalItemsCount} items
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            {/* Cart Items List */}
            {Object.keys(cart).length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <p>🛒 Your cart is currently empty.</p>
                <p>Select items from the menu to build the order.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {Object.entries(cart).map(([itemId, entry]) => {
                  const item = itemsMap.get(itemId);
                  if (!item) return null;

                  return (
                    <div key={itemId} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs text-white">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Rs. {item.price} × {entry.quantity} = Rs. {item.price * entry.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(itemId)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-xs text-orange-400 px-1">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(itemId)}
                            className="w-5 h-5 rounded bg-orange-500 text-slate-950 flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Custom Item Note (e.g. extra spicy) */}
                      <input
                        type="text"
                        placeholder="Item note (e.g. extra sauce, no mayo)"
                        value={entry.notes}
                        onChange={(e) => updateItemNotes(itemId, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Customer Details Form */}
            <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Customer & Delivery Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Bilal"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Customer Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 03001234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Order Type Toggle */}
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('DELIVERY')}
                    className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === 'DELIVERY'
                        ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🛵 Home Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('TAKEAWAY')}
                    className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === 'TAKEAWAY'
                        ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🛍️ Takeaway</span>
                  </button>
                </div>
              </div>

              {/* Delivery Address if Delivery */}
              {orderType === 'DELIVERY' && (
                <div className="space-y-2">
                  <label className="block text-[11px] text-slate-400 font-semibold">Delivery Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="House, Street, Sector / Area"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Delivery Fee (Rs.):</span>
                      <input
                        type="number"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-white text-center font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Transit Mins:</span>
                      <input
                        type="number"
                        value={deliveryTimeMinutes}
                        onChange={(e) => setDeliveryTimeMinutes(e.target.value)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-white text-center font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preparation Time Chips */}
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Estimated Kitchen Prep Time</label>
                <div className="flex items-center gap-1.5">
                  {['15', '20', '30', '45'].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setPrepTimeMinutes(mins)}
                      className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                        prepTimeMinutes === mins
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method & Amount Paid */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <label className="block text-[11px] text-slate-400 font-semibold">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CASH', 'CARD', 'ONLINE'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 rounded-xl font-bold transition text-[11px] ${
                        paymentMethod === m
                          ? 'bg-orange-500 text-slate-950'
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Paid Now (Rs.)</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(String(totalBill))}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[11px] mt-4"
                  >
                    Full Paid
                  </button>
                </div>
              </div>
            </div>

            {/* Bill Summary Breakdown */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Food Items ({totalItemsCount})</span>
                <span className="font-mono text-white font-semibold">Rs. {subtotal.toLocaleString()}</span>
              </div>
              {orderType === 'DELIVERY' && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-mono text-white font-semibold">Rs. {finalDeliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>Total Bill</span>
                <span className="font-mono text-orange-400">Rs. {totalBill.toLocaleString()}</span>
              </div>
            </div>

            {/* Place Order CTA Button */}
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(cart).length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-xl shadow-orange-500/25 transition text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Generating Order & Tracking Link...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm & Place Order (Rs. {totalBill.toLocaleString()})</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Floating Bottom Bar for Mobile Screen (< lg) */}
      {totalItemsCount > 0 && !isMobileCheckoutOpen && (
        <div className="lg:hidden fixed bottom-[68px] inset-x-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setIsMobileCheckoutOpen(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 p-3.5 rounded-2xl font-black text-sm flex items-center justify-between shadow-xl shadow-orange-500/30 active:scale-95 transition"
          >
            <div className="flex items-center gap-2">
              <div className="bg-slate-950/20 p-1.5 rounded-xl">
                <ShoppingBag className="w-4 h-4 text-slate-950" />
              </div>
              <span>{totalItemsCount} item{totalItemsCount > 1 ? 's' : ''} added</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-slate-950 text-sm">Rs. {totalBill.toLocaleString()}</span>
              <span className="text-xs bg-slate-950 text-orange-400 px-2 py-1 rounded-xl flex items-center gap-1 font-bold">
                Review <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ================= ORDER CREATED SUCCESS MODAL ================= */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-2 mb-2" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-white">
                Order #{createdOrder.order_number} Confirmed!
              </h3>
              <p className="text-xs text-slate-400">
                Customer: <strong className="text-white">{createdOrder.customer_name}</strong> • Total: <strong className="text-orange-400 font-mono">Rs. {createdOrder.total_amount}</strong>
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Customer Tracking Link:</span>
              <p className="text-sky-400 font-mono text-[11px] truncate">
                {window.location.origin}/track?token={createdOrder.tracking_token}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {createdOrder.whatsappUrl && (
                <a
                  href={createdOrder.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Confirmation on WhatsApp</span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const ord = createdOrder;
                    setCreatedOrder(null);
                    onViewOrder(ord);
                  }}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Manage Order
                </button>
                <a
                  href={`/track?token=${createdOrder.tracking_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tracker</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
