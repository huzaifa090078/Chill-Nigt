import React, { useState } from 'react';
import {
  DollarSign,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { PaymentStats, Order, PaymentMethod } from '../../types';
import { PaymentStatusBadge } from '../common/StatusBadge';
import * as api from '../../services/api';

interface PaymentsViewProps {
  stats: PaymentStats | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectOrder: (order: Order) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  stats,
  loading,
  onRefresh,
  onSelectOrder,
}) => {
  const [collectOrder, setCollectOrder] = useState<Order | null>(null);
  const [methodInput, setMethodInput] = useState<PaymentMethod>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenCollect = (order: Order) => {
    setCollectOrder(order);
    setMethodInput(order.payment_method);
    setAmountInput(String(order.total_amount));
  };

  const handleSavePayment = async () => {
    if (!collectOrder) return;
    setIsUpdating(true);
    try {
      await api.updateOrderPayment(collectOrder.id, methodInput, Number(amountInput) || 0);
      setCollectOrder(null);
      onRefresh();
    } catch {
      alert('Failed to save payment');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5">
        <div>
          <h2 className="text-xl font-black text-white">Payment Collections & Receivables</h2>
          <p className="text-xs text-slate-400">Track total revenue, cash collections, and pending customer bills</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Orders Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            Rs. {loading ? '...' : (stats?.grandTotalSales ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total placed bills</p>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            Rs. {loading ? '...' : (stats?.totalCollected ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats?.paidOrdersCount ?? 0} orders completely settled
          </p>
        </div>

        {/* Total Outstanding */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2 font-mono">
            Rs. {loading ? '...' : (stats?.totalOutstanding ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats?.pendingOrdersCount ?? 0} orders pending payment
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      {stats && stats.methodsBreakdown && stats.methodsBreakdown.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Collections by Payment Method
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.methodsBreakdown.map((m) => (
              <div key={m.payment_method} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">{m.payment_method}</p>
                  <p className="text-base font-black text-white font-mono mt-0.5">
                    Rs. {Math.round(m.total_collected).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-orange-400 font-bold bg-slate-900 px-2 py-1 rounded-lg">
                  {m.count} orders
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Pending Payment Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Orders Pending Payment</h3>
            <p className="text-xs text-slate-400">Cash on delivery and unpaid balances awaiting collection</p>
          </div>
          <span className="text-xs text-amber-400 font-bold">
            {stats?.pendingOrders?.length ?? 0} pending
          </span>
        </div>

        {!stats || stats.pendingOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            🎉 All orders are fully settled and paid!
          </div>
        ) : (
          <div className="space-y-2.5">
            {stats.pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center font-mono font-bold text-xs text-orange-400 shrink-0">
                    <span className="text-[9px] text-slate-500">#</span>
                    <span>{order.order_number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{order.customer_name}</h4>
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {order.customer_phone}
                      </span>
                      <span>Method: <strong className="text-white">{order.payment_method}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-400">Remaining Balance</p>
                    <p className="text-base font-black text-amber-400 font-mono">
                      Rs. {Math.round(order.remaining_amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectOrder(order)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition flex items-center gap-1"
                      title="View order details"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleOpenCollect(order)}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition active:scale-95"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      {collectOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4 animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5">
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />
            <h4 className="font-black text-white text-base">
              Collect Bill #{collectOrder.order_number}
            </h4>
            <p className="text-xs text-slate-400">
              Customer: <strong className="text-white">{collectOrder.customer_name}</strong> • Total Bill: <strong className="text-orange-400 font-mono">Rs. {collectOrder.total_amount}</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['CASH', 'CARD', 'ONLINE'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethodInput(m)}
                      className={`py-1.5 rounded-xl font-bold ${
                        methodInput === m ? 'bg-orange-500 text-slate-950' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Amount Collected (Rs.)</label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setCollectOrder(null)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating}
                onClick={handleSavePayment}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
