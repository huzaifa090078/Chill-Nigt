import React from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { DashboardStats, Order, formatOrderNumber } from '../../types';
import { OrderStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateNewOrder: () => void;
  onSelectOrder: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onNavigateNewOrder,
  onSelectOrder,
}) => {
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Hero Welcome & Prominent New Order CTA */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
              <Flame className="w-3.5 h-3.5 fill-orange-500 shrink-0" />
              <span>Live Kitchen POS</span>
            </div>
            <h2 className="text-base font-black text-white tracking-tight">
              Chill Night Food Point
            </h2>
            <p className="text-[11px] text-slate-400">
              Sector F-10 • {stats?.todayDatePkt || 'Today'} (PKT)
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition active:scale-95 disabled:opacity-50 shrink-0"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Business Metrics Grid: 2x2 Mobile App Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Metric 1: Today's Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-sm hover:border-slate-750 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-white leading-none">
              {loading ? '...' : stats?.todayOrdersCount ?? 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Confirmed today</p>
          </div>
        </div>

        {/* Metric 2: Pending Orders in Kitchen */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-sm hover:border-slate-750 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-amber-400 leading-none">
              {loading ? '...' : stats?.pendingOrdersCount ?? 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">In kitchen / rider</p>
          </div>
        </div>

        {/* Metric 3: Completed Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-sm hover:border-slate-750 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Delivered</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-emerald-400 leading-none">
              {loading ? '...' : stats?.completedOrdersCount ?? 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Fulfilled today</p>
          </div>
        </div>

        {/* Metric 4: Real Sales Calculated from Database */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-sm hover:border-slate-750 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Today's Sales</span>
            <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-orange-400 leading-none font-mono truncate">
              Rs. {loading ? '...' : (stats?.todaySalesTotal ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-400 mt-1 font-semibold truncate">Authoritative total</p>
          </div>
        </div>
      </div>

      {/* Kitchen Status Progression Bar */}
      {stats && stats.statusBreakdown && stats.statusBreakdown.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Today's Order Status Breakdown
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.statusBreakdown.map((item) => (
              <div
                key={item.status}
                className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs"
              >
                <OrderStatusBadge status={item.status} />
                <span className="font-extrabold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Orders</h3>
            <p className="text-xs text-slate-400">Live feed from database</p>
          </div>
          <span className="text-xs text-orange-400 font-bold">
            Showing latest {stats?.recentOrders?.length ?? 0}
          </span>
        </div>

        {loading && !stats ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading live orders...</div>
        ) : !stats || stats.recentOrders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-slate-400 text-sm">No orders recorded yet today.</p>
            <button
              onClick={onNavigateNewOrder}
              className="px-4 py-2 bg-orange-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-orange-600 transition"
            >
              Take First Order
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="group cursor-pointer bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 transition space-y-2 shadow-sm"
              >
                {/* Top Row: #Number, Customer Name, Badge, Total Amount */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-850 border border-slate-800 text-orange-400 font-mono font-bold text-xs shrink-0">
                      {formatOrderNumber(order.order_number)}
                    </span>
                    <h4 className="font-extrabold text-xs text-white group-hover:text-orange-400 transition truncate">
                      {order.customer_name}
                    </h4>
                  </div>
                  <span className="font-black text-xs text-orange-400 font-mono shrink-0">
                    Rs. {Math.round(order.total_amount).toLocaleString()}
                  </span>
                </div>

                {/* Sub Row: Order Type, Phone, Delivery Address snippet */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                  <span className="px-1.5 py-0.2 rounded bg-slate-850 text-slate-300 font-bold text-[10px] shrink-0">
                    {order.order_type === 'DELIVERY' ? '🛵 Delivery' : '🛍️ Takeaway'}
                  </span>
                  <span className="truncate">{order.customer_phone}</span>
                  {order.delivery_address && (
                    <span className="text-slate-500 truncate">• {order.delivery_address}</span>
                  )}
                </div>

                {/* Bottom Row: Status Badge & Payment Badge */}
                <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between">
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
      </div>
    </div>
  );
};
