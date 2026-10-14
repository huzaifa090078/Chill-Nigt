import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  ArrowRight,
  ExternalLink,
  Send,
  X,
  CreditCard,
  Ban,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Order, OrderStatus, PaymentMethod, formatOrderNumber } from '../../types';
import { OrderStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';
import * as api from '../../services/api';
import { WhatsAppMessagePreview } from './WhatsAppMessagePreview';

interface OrdersViewProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  selectedOrder: Order | null;
  onSelectOrder: (order: Order | null) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  loading,
  onRefresh,
  selectedOrder,
  onSelectOrder,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentPaidInput, setPaymentPaidInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod>('CASH');
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  // Ensure full order details (items, whatsappUrl, calculated live deadlines) are loaded
  React.useEffect(() => {
    if (selectedOrder?.id && (!selectedOrder.items || !selectedOrder.whatsappUrl)) {
      api.getOrderById(selectedOrder.id)
        .then((fullOrder) => {
          onSelectOrder(fullOrder);
        })
        .catch((err) => {
          console.error('Failed to load full order details:', err);
        });
    }
  }, [selectedOrder?.id]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = selectedStatus === 'ALL' || order.status === selectedStatus;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        order.customer_name.toLowerCase().includes(term) ||
        order.customer_phone.includes(term) ||
        String(order.order_number).includes(term) ||
        formatOrderNumber(order.order_number).toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [orders, selectedStatus, searchQuery]);

  // Handle status advance
  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const updated = await api.updateOrderStatus(selectedOrder.id, newStatus);
      onSelectOrder(updated);
      onRefresh();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel order
  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const updated = await api.updateOrderStatus(
        selectedOrder.id,
        'CANCELLED',
        cancelReason || 'Cancelled by restaurant'
      );
      onSelectOrder(updated);
      onRefresh();
      setCancelModalOpen(false);
      setCancelReason('');
    } catch (err) {
      alert('Failed to cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle payment record
  const handleRecordPayment = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const paidNum = Number(paymentPaidInput) || 0;
      const updated = await api.updateOrderPayment(selectedOrder.id, paymentMethodInput, paidNum);
      onSelectOrder(updated);
      onRefresh();
      setPaymentModalOpen(false);
    } catch (err) {
      alert('Failed to update payment');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusFilters = [
    { key: 'ALL', label: 'All Orders' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PREPARING', label: 'In Kitchen' },
    { key: 'READY', label: 'Ready' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5">
        <div>
          <h2 className="text-xl font-black text-white">All Orders ({filteredOrders.length})</h2>
          <p className="text-xs text-slate-400">Search, filter, update live status and send customer receipts</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Search Input & Status Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {statusFilters.map((s) => (
            <button
              key={s.key}
              onClick={() => setSelectedStatus(s.key)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedStatus === s.key
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Grid */}
      {loading && orders.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading orders feed...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-2">
          <p className="text-slate-400 text-sm">No orders matching your search or filter.</p>
          <button
            onClick={() => {
              setSelectedStatus('ALL');
              setSearchQuery('');
            }}
            className="text-xs text-orange-400 hover:underline font-bold"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="group cursor-pointer bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 transition shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-10 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center font-mono font-bold text-xs text-orange-400 shrink-0">
                    <span className="text-[7px] text-slate-500 leading-none">CNFP</span>
                    <span className="leading-tight text-xs font-black">{order.order_number}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-white group-hover:text-orange-400 transition truncate">
                        {order.customer_name}
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold shrink-0">
                        {order.order_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                      <span>{order.customer_phone}</span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-xs text-orange-400 font-mono">
                    Rs. {Math.round(order.total_amount).toLocaleString()}
                  </p>
                </div>
              </div>

              {order.delivery_address && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/60 truncate">
                  <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                  <span className="truncate">{order.delivery_address}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <OrderStatusBadge status={order.status} />
                <div className="flex items-center gap-1.5">
                  <PaymentStatusBadge status={order.payment_status} />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= ORDER DETAILS DRAWER / MODAL ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl max-w-lg w-full max-h-[88vh] overflow-y-auto custom-scrollbar p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-2 mb-2" />

            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-mono font-bold text-xs">
                    {formatOrderNumber(selectedOrder.order_number)}
                  </span>
                  <h3 className="font-black text-lg text-white">{selectedOrder.customer_name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed at: {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onSelectOrder(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Quick Advance Buttons */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Status</span>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              {/* Status Action Buttons */}
              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  {selectedOrder.status === 'CONFIRMED' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('PREPARING')}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition"
                    >
                      🍳 Mark In Kitchen (PREPARING)
                    </button>
                  )}
                  {selectedOrder.status === 'PREPARING' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedOrder.order_type === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY')}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-xl text-xs transition"
                    >
                      {selectedOrder.order_type === 'DELIVERY' ? '🛵 Mark Out For Delivery' : '🛍️ Mark Ready for Pickup'}
                    </button>
                  )}
                  {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('DELIVERED')}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivered</span>
                    </button>
                  )}
                  {selectedOrder.status === 'READY' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('DELIVERED')}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Picked Up</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Items Snapshot Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-850 p-3 text-xs">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item) => (
                    <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-orange-400 font-mono text-[10px]">
                            {item.quantity}x
                          </span>
                          <span>{item.name}</span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-slate-400 italic pl-5">"{item.notes}"</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-white">
                        Rs. {Math.round(item.subtotal)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs py-1">Item details loading...</p>
                )}
              </div>
            </div>

            {/* Bill & Payment Status Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-white">Rs. {selectedOrder.subtotal}</span>
              </div>
              {selectedOrder.order_type === 'DELIVERY' && (
                <div className="flex justify-between text-slate-400">
                  <span>Delivery Fee</span>
                  <span className="font-mono text-white">Rs. {selectedOrder.delivery_fee}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                <span>Total Bill</span>
                <span className="font-mono text-orange-400">Rs. {selectedOrder.total_amount}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-400">
                  Payment: <strong className="text-white">{selectedOrder.payment_method}</strong> ({selectedOrder.payment_status})
                </span>
                <button
                  onClick={() => {
                    setPaymentPaidInput(String(selectedOrder.total_amount));
                    setPaymentMethodInput(selectedOrder.payment_method);
                    setPaymentModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                >
                  <CreditCard className="w-3 h-3 text-orange-400" />
                  <span>Update Payment</span>
                </button>
              </div>
            </div>

            {/* Customer Contact & Delivery Info */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono font-semibold text-white">{selectedOrder.customer_phone}</span>
              </div>
              {selectedOrder.delivery_address && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 shrink-0">Address:</span>
                  <span className="text-right text-slate-200">{selectedOrder.delivery_address}</span>
                </div>
              )}
              {selectedOrder.notes && (
                <div className="flex justify-between items-start pt-1 border-t border-slate-850">
                  <span className="text-slate-400 shrink-0">Notes:</span>
                  <span className="text-right text-amber-400 italic">{selectedOrder.notes}</span>
                </div>
              )}
            </div>

            {/* WhatsApp Message Preview Section */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowWhatsAppPreview(prev => !prev)}
                className="w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-between transition border border-emerald-500/25"
              >
                <div className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>{showWhatsAppPreview ? 'Hide WhatsApp Message Preview' : 'View Customer WhatsApp Message Preview'}</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  {showWhatsAppPreview ? '▲ Hide' : '▼ View'}
                </span>
              </button>

              {showWhatsAppPreview && (
                <div className="mt-2.5 animate-in fade-in duration-200">
                  <WhatsAppMessagePreview order={selectedOrder} items={selectedOrder.items} />
                </div>
              )}
            </div>

            {/* Action Bar (WhatsApp & Live Tracker) */}
            <div className="space-y-2 pt-2">
              {selectedOrder.whatsappUrl && (
                <a
                  href={selectedOrder.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Share Live Tracking on WhatsApp</span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`/track?token=${selectedOrder.tracking_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Customer Tracker</span>
                </a>

                {selectedOrder.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="py-2.5 bg-slate-800 hover:bg-rose-950/40 text-rose-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-800 hover:border-rose-900"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {paymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4 animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5">
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />
            <h4 className="font-black text-white text-base">Record Payment</h4>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['CASH', 'CARD', 'ONLINE'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethodInput(m)}
                      className={`py-2 rounded-xl font-bold transition active:scale-95 ${
                        paymentMethodInput === m ? 'bg-orange-500 text-slate-950' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Amount Paid (Rs.)</label>
                <input
                  type="number"
                  value={paymentPaidInput}
                  onChange={(e) => setPaymentPaidInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs active:scale-95 transition"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating}
                onClick={handleRecordPayment}
                className="flex-1 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4 animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5">
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />
            <h4 className="font-black text-rose-400 text-base">Cancel Order {formatOrderNumber(selectedOrder.order_number)}</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to cancel this order? This will notify the customer on their live tracking link.
            </p>
            <input
              type="text"
              placeholder="Cancellation reason (e.g. Out of delivery range)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs active:scale-95 transition"
              >
                Go Back
              </button>
              <button
                disabled={isUpdating}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs active:scale-95 transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
