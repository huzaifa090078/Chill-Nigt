import React, { useState, useEffect, useCallback } from 'react';
import { NavTab, Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewOrderView } from './components/orders/NewOrderView';
import { OrdersView } from './components/orders/OrdersView';
import { MenuView } from './components/menu/MenuView';
import { PaymentsView } from './components/payments/PaymentsView';
import { CustomerTrackingView } from './components/tracking/CustomerTrackingView';
import {
  Category,
  MenuItem,
  Order,
  DashboardStats,
  PaymentStats,
} from './types';
import * as api from './services/api';

export const App: React.FC = () => {
  // Check if viewing customer tracking page
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qToken = urlParams.get('token');
    if (qToken) {
      setTrackingToken(qToken);
      return;
    }

    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.startsWith('trk_')) {
      setTrackingToken(lastPart);
    }
  }, []);

  // Owner App State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Load Menu data
  const loadMenu = useCallback(async () => {
    try {
      const [cats, items] = await Promise.all([api.getCategories(), api.getMenuItems()]);
      setCategories(cats);
      setMenuItems(items);
    } catch (err) {
      console.error('Menu load error:', err);
    }
  }, []);

  // Load Dashboard stats
  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Load Orders
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const list = await api.getOrders();
      setOrders(list);
    } catch (err) {
      console.error('Orders load error:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Load Payment stats
  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const pStats = await api.getPaymentStats();
      setPaymentStats(pStats);
    } catch (err) {
      console.error('Payments load error:', err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Refresh all
  const refreshAll = useCallback(() => {
    loadDashboard();
    loadOrders();
    loadMenu();
    loadPayments();
  }, [loadDashboard, loadOrders, loadMenu, loadPayments]);

  useEffect(() => {
    if (!trackingToken) {
      refreshAll();
    }
  }, [trackingToken, refreshAll]);

  // If customer tracking URL is active, render tracking view
  if (trackingToken) {
    return (
      <CustomerTrackingView
        token={trackingToken}
        onBackToApp={() => {
          setTrackingToken(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header and Mobile Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'dashboard') loadDashboard();
          if (tab === 'orders') loadOrders();
          if (tab === 'menu') loadMenu();
          if (tab === 'payments') loadPayments();
        }}
        pendingCount={stats?.pendingOrdersCount ?? 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loading={loadingDashboard}
            onRefresh={loadDashboard}
            onNavigateNewOrder={() => setActiveTab('new-order')}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setActiveTab('orders');
            }}
          />
        )}

        {activeTab === 'new-order' && (
          <NewOrderView
            categories={categories}
            menuItems={menuItems}
            onOrderCreated={() => {
              refreshAll();
            }}
            onViewOrder={(order) => {
              setSelectedOrder(order);
              setActiveTab('orders');
            }}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            loading={loadingOrders}
            onRefresh={loadOrders}
            selectedOrder={selectedOrder}
            onSelectOrder={setSelectedOrder}
          />
        )}

        {activeTab === 'menu' && (
          <MenuView
            categories={categories}
            menuItems={menuItems}
            onRefresh={loadMenu}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView
            stats={paymentStats}
            loading={loadingPayments}
            onRefresh={loadPayments}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setActiveTab('orders');
            }}
          />
        )}
      </main>
    </div>
  );
};
