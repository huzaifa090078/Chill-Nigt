import React, { useState, useEffect, useCallback } from 'react';
import { NavTab, AppHeader, BottomNav } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewOrderView } from './components/orders/NewOrderView';
import { OrdersView } from './components/orders/OrdersView';
import { MenuView } from './components/menu/MenuView';
import { PaymentsView } from './components/payments/PaymentsView';
import { CustomerTrackingView } from './components/tracking/CustomerTrackingView';
import { SettingsView } from './components/settings/SettingsView';
import {
  Category,
  MenuItem,
  Order,
  DashboardStats,
  PaymentStats,
} from './types';
import * as api from './services/api';

export const App: React.FC = () => {
  // Theme state: 'dark' | 'light' with persistent localStorage and system fallback
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('chill_night_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });

  useEffect(() => {
    const rootEl = document.documentElement;
    if (theme === 'light') {
      rootEl.classList.add('light');
      rootEl.classList.remove('dark');
    } else {
      rootEl.classList.add('dark');
      rootEl.classList.remove('light');
    }
    localStorage.setItem('chill_night_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
      <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex justify-center items-start py-4 px-2">
        <div className="w-full max-w-2xl min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col relative overflow-x-hidden">
          <CustomerTrackingView
            token={trackingToken}
            onBackToApp={() => {
              setTrackingToken(null);
              window.history.pushState({}, '', '/');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-200 dark:bg-[#070b14] flex justify-center transition-colors">
      {/* Mobile App View: Phone width (460px) WITHOUT any fake phone borders or hardware bezel */}
      <div className="w-full max-w-[460px] min-h-screen min-h-[100dvh] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative shadow-2xl transition-colors">
        {/* Top Header */}
        <AppHeader
          onNewOrder={() => setActiveTab('new-order')}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main Content Area (pb-32 clears floating bottom dock) */}
        <main className="flex-1 w-full p-3.5 pb-32 space-y-4">
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

          {activeTab === 'settings' && (
            <SettingsView
              currentTheme={theme}
              onThemeChange={(newTheme) => setTheme(newTheme)}
              onDataRestored={refreshAll}
            />
          )}
        </main>

        {/* Pinned Bottom Navigation Bar */}
        <BottomNav
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
      </div>
    </div>
  );
};
