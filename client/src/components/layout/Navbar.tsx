import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  UtensilsCrossed,
  CreditCard,
  Settings,
  Flame,
  Sun,
  Moon,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'new-order' | 'orders' | 'menu' | 'payments' | 'settings';

interface HeaderProps {
  onNewOrder: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const AppHeader: React.FC<HeaderProps> = ({
  onNewOrder,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 px-3.5 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] shrink-0 transition-colors">
      <div className="flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-sm tracking-tight text-slate-900 dark:text-white truncate">
                Chill Night
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Kitchen Online" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Food Point • POS</p>
          </div>
        </div>

        {/* Action Header Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          <button
            onClick={onNewOrder}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-orange-500/20 transition"
            title="Create new order"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Order</span>
          </button>
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-order' as NavTab, label: 'New Order', icon: PlusCircle },
    { id: 'orders' as NavTab, label: 'Orders', icon: ReceiptText, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'menu' as NavTab, label: 'Menu', icon: UtensilsCrossed },
    { id: 'payments' as NavTab, label: 'Payments', icon: CreditCard },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] inset-x-3.5 max-w-[436px] mx-auto z-40 pointer-events-none">
      <nav className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 px-2 py-1.5 rounded-3xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_36px_-5px_rgba(0,0,0,0.6)] ring-1 ring-black/5 dark:ring-white/5 transition-all">
        <div className="flex items-center justify-around w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 min-h-[46px] py-0.5 px-1 rounded-2xl transition-all active:scale-90 relative ${
                  isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {/* Active Pill Indicator */}
                <div
                  className={`flex items-center justify-center px-3.5 py-1 rounded-xl transition-all duration-200 relative ${
                    isActive ? 'bg-orange-500/15' : 'bg-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-orange-500 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 right-2 bg-orange-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] mt-0.5 tracking-tight transition-all ${
                    isActive ? 'font-black text-orange-500' : 'font-semibold text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
