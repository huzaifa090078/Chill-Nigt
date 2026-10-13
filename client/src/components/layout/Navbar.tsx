import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  UtensilsCrossed,
  CreditCard,
  Flame,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'new-order' | 'orders' | 'menu' | 'payments';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, pendingCount = 0 }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-order', label: 'New Order', icon: PlusCircle, isMainAction: true },
    { id: 'orders', label: 'Orders', icon: ReceiptText, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <>
      {/* Top Mobile & Desktop Brand Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                  Chill Night Food Point
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Kitchen Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">POS & Order Manager</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as NavTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-slate-950 text-orange-400' : 'bg-orange-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Action button on Mobile Header */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => onTabChange('new-order')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-orange-500/25 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Order</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Fixed App Navigation Bar (Native Mobile Feel) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-2xl transition-all active:scale-90 relative ${
                  isActive ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Pill Indicator (Native Mobile Tab Bar Style) */}
                <div
                  className={`flex items-center justify-center px-4 py-1 rounded-xl transition-all duration-200 relative ${
                    isActive ? 'bg-orange-500/15' : 'bg-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-orange-400 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 right-2 bg-orange-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] mt-0.5 tracking-tight transition-all ${
                    isActive ? 'font-black text-orange-400' : 'font-semibold text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
