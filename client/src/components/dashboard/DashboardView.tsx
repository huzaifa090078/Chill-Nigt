import React from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Phone,
  MapPin,
  Flame,
} from 'lucide-react';
import { DashboardStats, Order } from '../../types';
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
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4 fill-orange-500" />
              Live Order Management
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Chill Night Food Point
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Sector F-10, Islamabad • Date: {stats?.todayDatePkt || 'Today'} (PKT)
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition active:scale-95 disabled:opacity-50"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              onClick={onNavigateNewOrder}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black rounded-2xl shadow-lg shadow-orange-500/25 transition active:scale-95 text-sm"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Business Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Metric 1: Today's Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white mt-2">
            {loading ? '...' : stats?.todayOrdersCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed & Processing</p>
        </div>

        {/* Metric 2: Pending Orders in Kitchen */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Orders</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-400 mt-2">
            {loading ? '...' : stats?.pendingOrdersCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active in kitchen / rider</p>
        </div>

        {/* Metric 3: Completed Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Delivered Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
            {loading ? '...' : stats?.completedOrdersCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Successfully fulfilled</p>
        </div>

        {/* Metric 4: Real Sales Calculated from Database */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white mt-2">
            Rs. {loading ? '...' : (stats?.todaySalesTotal ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1 font-semibold">Authoritative total</p>
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
                className="group cursor-pointer bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono font-bold text-xs text-orange-400 shrink-0">
                    <span className="text-[9px] text-slate-400">#</span>
                    <span>{order.order_number}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white group-hover:text-orange-400 transition">
                        {order.customer_name}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {order.order_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {order.customer_phone}
                      </span>
                      {order.delivery_address && (
                        <span className="hidden md:flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 text-orange-400 shrink-0" /> {order.delivery_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <div className="text-left sm:text-right">
                    <p className="font-extrabold text-sm text-white font-mono">
                      Rs. {Math.round(order.total_amount).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 sm:justify-end mt-0.5">
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition hidden sm:block" />
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
