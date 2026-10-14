import React, { useState, useEffect } from 'react';
import {
  Store,
  Phone,
  MapPin,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  MessageCircle,
  Sliders,
} from 'lucide-react';
import { ShopSettings, BackupPayload } from '../../types';
import * as api from '../../services/api';

interface SettingsViewProps {
  currentTheme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  onDataRestored: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  onThemeChange,
  onDataRestored,
}) => {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'orders' | 'appearance' | 'backup' | 'danger'>('profile');

  // Status and feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Shop Profile
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [currency, setCurrency] = useState('PKR (Rs.)');
  const [openingTime, setOpeningTime] = useState('16:00');
  const [closingTime, setClosingTime] = useState('03:00');
  const [minOrderAmount, setMinOrderAmount] = useState('0');

  // Form states for Orders & WhatsApp
  const [defaultOrderType, setDefaultOrderType] = useState<'DELIVERY' | 'TAKEAWAY'>('TAKEAWAY');
  const [defaultPrepTime, setDefaultPrepTime] = useState('20');
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('20');
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState('150');
  const [defaultOrderFilter, setDefaultOrderFilter] = useState('ALL');
  const [confirmDestructive, setConfirmDestructive] = useState(true);
  const [orderAlertSound, setOrderAlertSound] = useState(true);

  // Modals for Danger Zone
  const [resetOrdersModal, setResetOrdersModal] = useState(false);
  const [resetMenuModal, setResetMenuModal] = useState(false);
  const [reseedMenuCheckbox, setReseedMenuCheckbox] = useState(true);
  const [resetAllModal, setResetAllModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  // Restore validation modal
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<BackupPayload | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getShopSettings();
      setSettings(data);
      setShopName(data.shop_name || 'Chill Night Food Point');
      setShopPhone(data.shop_phone || '0329 1314400');
      setAltPhone(data.alt_phone || '');
      setAddress(data.address || 'Food Street, Sector F-10, Islamabad');
      setCity(data.city || 'Islamabad');
      setCurrency(data.currency || 'PKR (Rs.)');
      setOpeningTime(data.opening_time || '16:00');
      setClosingTime(data.closing_time || '03:00');
      setMinOrderAmount(data.min_order_amount || '0');

      setDefaultOrderType(data.default_order_type || 'TAKEAWAY');
      setDefaultPrepTime(data.default_prep_time || '20');
      setDefaultDeliveryTime(data.default_delivery_time || '20');
      setDefaultDeliveryFee(data.default_delivery_fee || '150');
      setDefaultOrderFilter(data.default_order_filter || 'ALL');
      setConfirmDestructive(data.confirm_destructive_actions !== 'false');
      setOrderAlertSound(data.order_alert_sound !== 'false');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setFeedback({ type: 'error', message: 'Shop name cannot be empty.' });
      return;
    }
    if (!shopPhone.trim()) {
      setFeedback({ type: 'error', message: 'Shop WhatsApp/contact number is required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload: Partial<ShopSettings> = {
        shop_name: shopName.trim(),
        shop_phone: shopPhone.trim(),
        alt_phone: altPhone.trim(),
        address: address.trim(),
        city: city.trim(),
        currency: currency.trim(),
        opening_time: openingTime.trim(),
        closing_time: closingTime.trim(),
        min_order_amount: minOrderAmount.trim(),
        default_order_type: defaultOrderType,
        default_prep_time: defaultPrepTime.trim(),
        default_delivery_time: defaultDeliveryTime.trim(),
        default_delivery_fee: defaultDeliveryFee.trim(),
        default_order_filter: defaultOrderFilter,
        confirm_destructive_actions: String(confirmDestructive),
        order_alert_sound: String(orderAlertSound),
      };

      const updated = await api.updateShopSettings(payload);
      setSettings(updated);
      setFeedback({ type: 'success', message: 'Settings saved successfully! All order templates and customer pages updated.' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Sound test
  const playSampleSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  // Export Backup
  const handleExportBackup = async () => {
    setFeedback(null);
    try {
      const backup = await api.exportBackupData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `chill_night_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (settings) {
        setSettings({ ...settings, last_backup_time: new Date().toISOString() });
      }
      setFeedback({ type: 'success', message: 'Backup exported and downloaded successfully!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backup export failed';
      setFeedback({ type: 'error', message: msg });
    }
  };

  // Select file for restore
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.app !== 'Chill Night Food Point' || !parsed.data) {
          setFeedback({ type: 'error', message: 'Selected file is not a valid Chill Night Food Point backup.' });
          return;
        }
        setPendingBackupData(parsed);
        setRestoreModalOpen(true);
      } catch {
        setFeedback({ type: 'error', message: 'Could not read file: invalid JSON format.' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  // Confirm restore
  const handleConfirmRestore = async () => {
    if (!pendingBackupData) return;
    setRestoreLoading(true);
    try {
      const res = await api.importBackupData(pendingBackupData);
      setRestoreModalOpen(false);
      setPendingBackupData(null);
      setFeedback({ type: 'success', message: `${res.message}! Refreshing application state...` });
      await loadSettings();
      onDataRestored();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setRestoreLoading(false);
    }
  };

  // Reset Orders
  const handleResetOrders = async () => {
    setDangerLoading(true);
    try {
      const res = await api.resetOrdersData();
      setResetOrdersModal(false);
      setFeedback({ type: 'success', message: res.message });
      onDataRestored();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset orders';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDangerLoading(false);
    }
  };

  // Reset Menu
  const handleResetMenu = async () => {
    setDangerLoading(true);
    try {
      const res = await api.resetMenuData(reseedMenuCheckbox);
      setResetMenuModal(false);
      setFeedback({ type: 'success', message: res.message });
      onDataRestored();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset menu';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDangerLoading(false);
    }
  };

  // Reset All Data
  const handleResetAll = async () => {
    if (resetConfirmationText !== 'RESET') return;
    setDangerLoading(true);
    try {
      const res = await api.resetAllAppData('RESET');
      setResetAllModal(false);
      setResetConfirmationText('');
      setFeedback({ type: 'success', message: res.message });
      await loadSettings();
      onDataRestored();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset all data';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDangerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold">Loading shop settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">System Settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Shop profile, WhatsApp & data management</p>
          </div>
        </div>

        <button
          onClick={loadSettings}
          className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-500 transition active:scale-95 text-xs font-bold flex items-center gap-1"
          title="Refresh Settings"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Pills (Mobile horizontal scrollable tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs font-bold">
        {[
          { id: 'profile', label: 'Shop Profile', icon: Store },
          { id: 'orders', label: 'Order & WhatsApp', icon: MessageCircle },
          { id: 'appearance', label: 'Appearance', icon: Sun },
          { id: 'backup', label: 'Backup & Restore', icon: Download },
          { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 ${
                isActive
                  ? tab.id === 'danger'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= SECTION 1: SHOP PROFILE ================= */}
      {activeSection === 'profile' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-500" />
              <span>Shop Profile & Contact Details</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Details displayed to customers in order confirmations and tracking links
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Chill Night Food Point"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Shop WhatsApp / Calling Number *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    placeholder="e.g. 0329 1314400"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Used in WhatsApp footer & Live Track Call button</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Alternative Helpline (Optional)
                </label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="e.g. 051-1234567"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Shop Address
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Food Street, Sector F-10"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  City / Area
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Islamabad"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="PKR (Rs.)"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ================= SECTION 2: ORDER & WHATSAPP SETTINGS ================= */}
      {activeSection === 'orders' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span>Order Defaults & WhatsApp Messaging</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Configure default order values, timing and customer message formats
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Default Order Type */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1.5">
                Default Order Type for New Orders
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultOrderType('TAKEAWAY')}
                  className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    defaultOrderType === 'TAKEAWAY'
                      ? 'bg-orange-500 text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>🛍️ Takeaway</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultOrderType('DELIVERY')}
                  className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    defaultOrderType === 'DELIVERY'
                      ? 'bg-orange-500 text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>🛵 Home Delivery</span>
                </button>
              </div>
            </div>

            {/* Timings and Delivery Fee */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Default Kitchen Prep
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={defaultPrepTime}
                    onChange={(e) => setDefaultPrepTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-orange-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Rider Transit Time
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={defaultDeliveryTime}
                    onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-orange-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Delivery Fee (Rs.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={defaultDeliveryFee}
                    onChange={(e) => setDefaultDeliveryFee(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-orange-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">PKR</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Template Card Sample */}
            <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp Message Structure</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Contains order header (<span className="font-mono text-orange-400">#CNF-XXXX</span>), items breakdown with emojis, total, ETA, and clickable live order tracking link.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Preferences...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Order & WhatsApp Defaults</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ================= SECTION 3: APPEARANCE & APP PREFERENCES ================= */}
      {activeSection === 'appearance' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Appearance & User Preferences</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customize visual theme and operational prompts
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Theme Toggle */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-2">
                Application Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 border ${
                    currentTheme === 'light'
                      ? 'bg-white border-orange-500 text-orange-600 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 border ${
                    currentTheme === 'dark'
                      ? 'bg-slate-900 border-orange-500 text-orange-400 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Default Order Filter */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                Default Orders Tab Filter
              </label>
              <select
                value={defaultOrderFilter}
                onChange={(e) => setDefaultOrderFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">Show All Orders (Default)</option>
                <option value="CONFIRMED">Confirmed / New</option>
                <option value="PREPARING">In Kitchen Cooking</option>
                <option value="READY">Ready / Out for Delivery</option>
                <option value="DELIVERED">Completed / Delivered</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">Confirm Destructive Operations</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Ask for confirmation before cancelling orders or resetting data</p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmDestructive}
                  onChange={(e) => setConfirmDestructive(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">Order Alert Sound</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        playSampleSound();
                      }}
                      className="text-[10px] text-orange-500 hover:underline font-bold"
                    >
                      (Test Sound 🔔)
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Play subtle audio notification upon new order events</p>
                </div>
                <input
                  type="checkbox"
                  checked={orderAlertSound}
                  onChange={(e) => setOrderAlertSound(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition disabled:opacity-50"
          >
            {saving ? <span>Saving...</span> : <span>Save Preferences</span>}
          </button>
        </form>
      )}

      {/* ================= SECTION 4: BACKUP & RESTORE ================= */}
      {activeSection === 'backup' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-sky-500" />
                <span>Backup & Restore System</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Safely export your menu, orders, and shop profile to a portable JSON file
              </p>
            </div>

            {/* Status Details */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Last Backup Created:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {settings?.last_backup_time ? new Date(settings.last_backup_time).toLocaleString() : 'Never exported yet'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Supported Backup Format:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">JSON (v1.0.0, Chill Night)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Included Records:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Orders, Menu, Categories, Settings</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-3 px-4 bg-sky-500 hover:bg-sky-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export & Download Backup</span>
              </button>

              <label className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-sm transition cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import / Restore Backup</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 5: DANGER ZONE ================= */}
      {activeSection === 'danger' && (
        <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="border-b border-rose-500/20 pb-2">
            <h3 className="text-sm font-black text-rose-500 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Danger Zone — Data Management</span>
            </h3>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              Irreversible actions. Please download an Export Backup first before resetting data.
            </p>
          </div>

          <div className="space-y-3">
            {/* Reset Orders */}
            <div className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Reset Order History</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Clears past orders and status records. Menu items and profile remain intact.</p>
              </div>
              <button
                type="button"
                onClick={() => setResetOrdersModal(true)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30 font-bold rounded-xl text-xs transition active:scale-95 shrink-0"
              >
                Clear Orders
              </button>
            </div>

            {/* Reset Menu */}
            <div className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Reset Menu & Categories</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Clears menu food products. Historical order snapshots preserve past prices.</p>
              </div>
              <button
                type="button"
                onClick={() => setResetMenuModal(true)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30 font-bold rounded-xl text-xs transition active:scale-95 shrink-0"
              >
                Clear Menu
              </button>
            </div>

            {/* Reset All */}
            <div className="p-3.5 bg-rose-500/15 rounded-2xl border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-xs text-rose-600 dark:text-rose-400">Reset All Application Data</h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">Clears all orders, menu and settings, then restores initial default seed state.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetConfirmationText('');
                  setResetAllModal(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-md shadow-rose-600/30 shrink-0"
              >
                Reset All App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESTORE BACKUP CONFIRMATION ================= */}
      {restoreModalOpen && pendingBackupData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Confirm Backup Restore</h3>
              </div>
              <button onClick={() => setRestoreModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This will replace current app records with data from the backup file:
            </p>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <p className="text-slate-400">Exported: <span className="text-white">{new Date(pendingBackupData.exportedAt).toLocaleString()}</span></p>
              <p className="text-slate-400">Categories: <span className="text-emerald-400">{pendingBackupData.metadata.categoriesCount}</span></p>
              <p className="text-slate-400">Menu Items: <span className="text-emerald-400">{pendingBackupData.metadata.menuItemsCount}</span></p>
              <p className="text-slate-400">Orders: <span className="text-emerald-400">{pendingBackupData.metadata.ordersCount}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoreLoading}
                onClick={handleConfirmRestore}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition"
              >
                {restoreLoading ? 'Restoring...' : 'Restore Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET ORDERS ================= */}
      {resetOrdersModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2 text-rose-500">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-black text-white">Reset All Orders?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will permanently delete all order history, order items, and status updates. Your menu and profile settings will not be affected.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setResetOrdersModal(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                disabled={dangerLoading}
                onClick={handleResetOrders}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs"
              >
                {dangerLoading ? 'Clearing...' : 'Confirm Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET MENU ================= */}
      {resetMenuModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2 text-rose-500">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-black text-white">Reset Menu Products?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will remove all menu categories and items. Existing orders will preserve their historical price snapshots.
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={reseedMenuCheckbox}
                onChange={(e) => setReseedMenuCheckbox(e.target.checked)}
                className="w-4 h-4 accent-orange-500 rounded"
              />
              <span>Reseed default Chill Night menu items</span>
            </label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setResetMenuModal(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                disabled={dangerLoading}
                onClick={handleResetMenu}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs"
              >
                {dangerLoading ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET ALL APP DATA ================= */}
      {resetAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-t-[2rem] sm:rounded-3xl p-5 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h3 className="text-base font-black text-white">Full Application Reset</h3>
            </div>
            <p className="text-xs text-rose-300 leading-relaxed font-semibold">
              Warning: This will delete ALL orders, ALL customized menu items, and reset all settings to initial factory defaults.
            </p>
            <div className="space-y-1.5">
              <label className="block text-slate-400 text-xs font-bold">
                Type <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmationText}
                onChange={(e) => setResetConfirmationText(e.target.value)}
                placeholder="Type RESET here"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center tracking-widest font-black focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setResetAllModal(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmationText !== 'RESET' || dangerLoading}
                onClick={handleResetAll}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs transition"
              >
                {dangerLoading ? 'Resetting...' : 'CONFIRM RESET'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
