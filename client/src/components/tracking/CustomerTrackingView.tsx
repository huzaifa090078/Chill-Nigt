import React, { useState, useEffect } from 'react';
import {
  Clock,
  Utensils,
  CheckCircle2,
  Truck,
  Phone,
  MapPin,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { CustomerTrackingResponse, OrderStatus } from '../../types';
import * as api from '../../services/api';

interface CustomerTrackingViewProps {
  token: string;
  onBackToApp?: () => void;
}

export const CustomerTrackingView: React.FC<CustomerTrackingViewProps> = ({ token, onBackToApp }) => {
  const [data, setData] = useState<CustomerTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isConnectedLive, setIsConnectedLive] = useState(false);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTrackingDetails(token);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load order details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTracking();
  }, [token]);

  // Live SSE connection for real-time order updates
  useEffect(() => {
    if (!token) return;

    const sse = new EventSource(`/api/track/${token}/live`);

    sse.onopen = () => setIsConnectedLive(true);

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'STATUS_UPDATED') {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  status: payload.status,
                  completedAt: payload.completedAt,
                  cancellationReason: payload.cancellationReason,
                }
              : prev
          );
        } else if (payload.event === 'PAYMENT_UPDATED') {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  paymentMethod: payload.paymentMethod,
                  paymentStatus: payload.paymentStatus,
                  amountPaid: payload.amountPaid,
                  remainingAmount: payload.remainingAmount,
                }
              : prev
          );
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    sse.onerror = () => setIsConnectedLive(false);

    return () => sse.close();
  }, [token]);

  // Countdown timer against UTC target deadline
  useEffect(() => {
    if (!data) return;

    const updateTimer = () => {
      if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
        setRemainingSeconds(0);
        return;
      }

      const deadlineUtc =
        data.orderType === 'DELIVERY' && data.estimatedDeliveryAt
          ? data.estimatedDeliveryAt
          : data.estimatedReadyAt;

      if (!deadlineUtc) return;

      const targetMs = new Date(deadlineUtc).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
      setRemainingSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-xs font-semibold">Connecting to Chill Night Live Kitchen...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black text-white">Order Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Invalid or expired tracking link.'}</p>
          <button
            onClick={fetchTracking}
            className="w-full py-2.5 bg-orange-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs text-slate-400 hover:text-white font-semibold"
            >
              ← Back to Owner App
            </button>
          )}
        </div>
      </div>
    );
  }

  const isTakeaway = data.orderType === 'TAKEAWAY';
  const steps = isTakeaway
    ? [
        { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
        { key: 'PREPARING', label: 'In Kitchen Cooking', icon: Utensils },
        { key: 'READY', label: 'Packed & Ready for Pickup', icon: ShoppingBag },
        { key: 'DELIVERED', label: 'Picked Up', icon: Sparkles },
      ]
    : [
        { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
        { key: 'PREPARING', label: 'In Kitchen Cooking', icon: Utensils },
        { key: 'OUT_FOR_DELIVERY', label: 'Rider on the Way', icon: Truck },
        { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
      ];

  const statusOrderMap: Record<OrderStatus, number> = {
    CONFIRMED: 0,
    PREPARING: 1,
    READY: isTakeaway ? 2 : 1,
    OUT_FOR_DELIVERY: isTakeaway ? 2 : 2,
    DELIVERED: 3,
    CANCELLED: -1,
  };

  const currentStepIndex = statusOrderMap[data.status] ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍔</span>
            <div>
              <h1 className="text-sm font-black text-white">Chill Night Food Point</h1>
              <p className="text-[10px] text-slate-400">Order #{data.orderNumber} • {data.orderType}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {isConnectedLive ? 'Live Sync' : 'Connecting'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Countdown Card */}
        {data.status === 'CANCELLED' ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5 text-center space-y-2">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-black text-rose-300">Order Cancelled</h3>
            <p className="text-xs text-rose-400">
              {data.cancellationReason || 'This order was cancelled by the restaurant.'}
            </p>
          </div>
        ) : data.status === 'DELIVERED' ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 text-center space-y-2">
            <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-black text-emerald-400">
              {isTakeaway ? 'Order Picked Up!' : 'Order Delivered!'}
            </h3>
            <p className="text-xs text-emerald-300">
              Thank you for choosing Chill Night Food Point! Enjoy your meal 🍔
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 text-center shadow-xl space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Estimated {isTakeaway ? 'Pickup' : 'Arrival'} Countdown</span>
            </div>

            <div className="text-4xl font-black font-mono text-white tracking-tight py-1">
              {remainingSeconds > 0 ? (
                <>
                  <span>{String(minutes).padStart(2, '0')}</span>
                  <span className="text-orange-500 animate-pulse">:</span>
                  <span>{String(seconds).padStart(2, '0')}</span>
                </>
              ) : (
                <span className="text-emerald-400 text-2xl">
                  {data.status === 'READY' ? 'Ready Now!' : 'Arriving Any Minute!'}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Expected by:{' '}
              <strong className="text-white">
                {new Date(data.estimatedDeliveryAt || data.estimatedReadyAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                PKT
              </strong>
            </p>
          </div>
        )}

        {/* Status Stepper Progression */}
        {data.status !== 'CANCELLED' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Status</h3>
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isPassed
                          ? 'bg-emerald-500 text-slate-950'
                          : isCurrent
                          ? 'bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isPassed ? 'text-white' : isCurrent ? 'text-orange-400' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Your Order Items ({data.items.length})
          </h3>
          <div className="divide-y divide-slate-800 text-xs">
            {data.items.map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-orange-400 font-mono text-[10px]">
                      {item.quantity}x
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.notes && <p className="text-[10px] text-slate-400 italic pl-5">"{item.notes}"</p>}
                </div>
                <span className="font-mono font-bold text-white">Rs. {Math.round(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Food Subtotal</span>
            <span className="font-mono text-white">Rs. {data.subtotal}</span>
          </div>
          {data.orderType === 'DELIVERY' && (
            <div className="flex justify-between text-slate-400">
              <span>Delivery Fee</span>
              <span className="font-mono text-white">Rs. {data.deliveryFee}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
            <span>Total Bill</span>
            <span className="font-mono text-orange-400">Rs. {data.totalAmount}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">Payment: <strong className="text-white">{data.paymentMethod}</strong></span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400">
              {data.paymentStatus}
            </span>
          </div>
        </div>

        {/* Delivery Address if present */}
        {data.deliveryAddress && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-bold text-white">Delivery Address</span>
            </div>
            <p className="text-slate-300 pl-5">{data.deliveryAddress}</p>
          </div>
        )}

        {/* Restaurant Contact Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-2">
          <p className="text-xs text-slate-400">Need help or special instructions?</p>
          <a
            href={`tel:${data.restaurant.phone}`}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Call Restaurant ({data.restaurant.phone})</span>
          </a>
        </div>
      </main>
    </div>
  );
};
