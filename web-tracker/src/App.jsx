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

function formatPktTime(utcString) {
  if (!utcString) return '';
  const date = new Date(utcString);
  return date.toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function App() {
  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isConnectedLive, setIsConnectedLive] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    if (queryToken) {
      setToken(queryToken);
    } else {
      // Check path /track/:token
      const pathParts = window.location.pathname.split('/');
      const pathToken = pathParts[pathParts.length - 1];
      if (pathToken && pathToken.startsWith('trk_')) {
        setToken(pathToken);
      } else {
        setLoading(false);
        setError('No tracking token provided. Please open the link sent to your WhatsApp.');
      }
    }
  }, []);

  // Fetch order data
  const fetchOrder = async (trackingToken) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/track/${trackingToken}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Order not found or tracking link expired.');
        }
        throw new Error('Unable to load order details. Please try again.');
      }
      const data = await res.json();
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrder(token);
    }
  }, [token]);

  // Live SSE connection for real-time order updates
  useEffect(() => {
    if (!token) return;

    const sse = new EventSource(`/api/track/${token}/live`);

    sse.onopen = () => {
      setIsConnectedLive(true);
    };

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'STATUS_UPDATED') {
          setOrder((prev) => prev ? { ...prev, status: payload.status, completedAt: payload.completedAt, cancellationReason: payload.cancellationReason } : prev);
        } else if (payload.event === 'PAYMENT_UPDATED') {
          setOrder((prev) => prev ? {
            ...prev,
            paymentMethod: payload.paymentMethod,
            paymentStatus: payload.paymentStatus,
            amountPaid: payload.amountPaid,
            remainingAmount: payload.remainingAmount,
          } : prev);
        } else if (payload.event === 'ESTIMATE_UPDATED') {
          setOrder((prev) => prev ? {
            ...prev,
            estimatedReadyAt: payload.estimatedReadyAt,
            estimatedDeliveryAt: payload.estimatedDeliveryAt,
          } : prev);
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    sse.onerror = () => {
      setIsConnectedLive(false);
    };

    return () => {
      sse.close();
    };
  }, [token]);

  // Synchronized Target Deadline Countdown
  useEffect(() => {
    if (!order) return;

    const updateTimer = () => {
      if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
        setRemainingSeconds(0);
        return;
      }

      const deadlineUtc = order.orderType === 'DELIVERY' && order.estimatedDeliveryAt
        ? order.estimatedDeliveryAt
        : order.estimatedReadyAt;

      if (!deadlineUtc) return;

      const targetMs = new Date(deadlineUtc).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
      setRemainingSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#0b1120' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1.25rem', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>Connecting to Chill Night Live Kitchen...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0b1120' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '2rem', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <AlertCircle size={48} color="#ef4448" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>Unable to Track Order</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>{error || 'Invalid or missing tracking link.'}</p>
          <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Need help with your order?</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>Chill Night Food Point</p>
            <a href="tel:03291314400" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>
              <Phone size={16} /> Call 0329 1314400
            </a>
          </div>
          {token && (
            <button onClick={() => fetchOrder(token)} style={{ width: '100%', padding: '0.75rem', background: '#f97316', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <RefreshCw size={16} /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const isTakeaway = order.orderType === 'TAKEAWAY';
  const steps = isTakeaway
    ? [
        { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
        { key: 'PREPARING', label: 'In the Kitchen', icon: Utensils },
        { key: 'READY', label: 'Ready for Pickup', icon: ShoppingBag },
        { key: 'DELIVERED', label: 'Picked Up', icon: Sparkles },
      ]
    : [
        { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
        { key: 'PREPARING', label: 'Cooking Fresh', icon: Utensils },
        { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
        { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
      ];

  const statusOrderMap = {
    CONFIRMED: 0,
    PREPARING: 1,
    READY: isTakeaway ? 2 : 1,
    OUT_FOR_DELIVERY: isTakeaway ? 2 : 2,
    DELIVERED: 3,
    CANCELLED: -1,
  };

  const currentStepIndex = statusOrderMap[order.status] ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '1rem', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🍔</span>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>Chill Night Food Point</h1>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Order {order.orderCode || ('CNFP-' + order.orderNumber)} • {order.orderType}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: isConnectedLive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', border: `1px solid ${isConnectedLive ? '#22c55e' : '#eab308'}`, padding: '0.3rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, color: isConnectedLive ? '#4ade80' : '#facc15' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnectedLive ? '#22c55e' : '#eab308', display: 'inline-block' }} />
            {isConnectedLive ? 'Live Sync' : 'Connecting'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '480px', margin: '1rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Prominent Live Countdown Card */}
        {order.status === 'CANCELLED' ? (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <XCircle size={44} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fca5a5' }}>Order Cancelled</h2>
            <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.25rem' }}>{order.cancellationReason || 'This order was cancelled by the restaurant.'}</p>
          </div>
        ) : order.status === 'DELIVERED' ? (
          <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))', border: '1px solid #22c55e', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <Sparkles size={44} color="#22c55e" style={{ margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80' }}>
              {isTakeaway ? 'Order Picked Up!' : 'Order Delivered!'}
            </h2>
            <p style={{ color: '#86efac', fontSize: '0.85rem', marginTop: '0.25rem' }}>Thank you for ordering from Chill Night Food Point! Enjoy your meal 🍔</p>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f97316', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              <Clock size={16} /> Estimated {isTakeaway ? 'Ready' : 'Arrival'} Countdown
            </div>

            {/* Huge Countdown Display */}
            <div style={{ fontSize: '3.2rem', fontWeight: 800, color: '#f8fafc', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0.5rem 0' }}>
              {remainingSeconds > 0 ? (
                <>
                  <span>{String(minutes).padStart(2, '0')}</span>
                  <span style={{ color: '#f97316', animation: 'blink 1s infinite' }}>:</span>
                  <span>{String(seconds).padStart(2, '0')}</span>
                </>
              ) : (
                <span style={{ color: '#22c55e', fontSize: '2rem' }}>
                  {order.status === 'READY' ? 'Ready Now!' : order.status === 'OUT_FOR_DELIVERY' ? 'Arriving Any Minute!' : 'Finishing Up!'}
                </span>
              )}
            </div>
            <style>{`@keyframes blink { 50% { opacity: 0.3; } }`}</style>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
              Expected by: <strong style={{ color: '#f8fafc' }}>{formatPktTime(isTakeaway ? order.estimatedReadyAt : (order.estimatedDeliveryAt || order.estimatedReadyAt))} PKT</strong>
            </p>
          </div>
        )}

        {/* Status Stepper Progression */}
        {order.status !== 'CANCELLED' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Live Order Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {steps.map((s, idx) => {
                const IconComponent = s.icon;
                const isPassed = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                let iconBg = '#334155';
                let iconColor = '#64748b';
                let textColor = '#64748b';

                if (isPassed) {
                  iconBg = '#22c55e';
                  iconColor = '#ffffff';
                  textColor = '#f8fafc';
                } else if (isCurrent) {
                  iconBg = '#f97316';
                  iconColor = '#ffffff';
                  textColor = '#f97316';
                }

                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: isCurrent ? '0 0 12px rgba(249, 115, 22, 0.5)' : 'none' }}>
                      <IconComponent size={18} color={iconColor} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: isCurrent ? 700 : 500, color: textColor }}>
                        {s.label}
                      </p>
                      {isCurrent && (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {s.key === 'CONFIRMED' && 'Order acknowledged by kitchen.'}
                          {s.key === 'PREPARING' && 'Chef is cooking your fresh items.'}
                          {s.key === 'READY' && 'Packed hot and waiting at pickup counter.'}
                          {s.key === 'OUT_FOR_DELIVERY' && 'Rider is on the way to your address.'}
                          {s.key === 'DELIVERED' && 'Delivered successfully.'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Items & Quantities */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Order Items ({order.items.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: idx < order.items.length - 1 ? '1px solid #334155' : 'none' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#334155', color: '#f8fafc', fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '0.375rem' }}>
                      {item.quantity}x
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                      {item.name}
                    </span>
                  </div>
                  {item.notes && (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', paddingLeft: '1.75rem', fontStyle: 'italic' }}>
                      "{item.notes}"
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                  Rs. {Math.round(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill & Payment Information */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Bill & Payment</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Food Subtotal</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>Rs. {Math.round(order.subtotal)}</span>
            </div>

            {order.orderType === 'DELIVERY' && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Fee</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>Rs. {Math.round(order.deliveryFee)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #334155', fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
              <span>Total Bill</span>
              <span style={{ color: '#f97316' }}>Rs. {Math.round(order.totalAmount)}</span>
            </div>
          </div>

          {/* Payment Status Pill */}
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Payment Method: <strong style={{ color: '#cbd5e1' }}>{order.paymentMethod}</strong></p>
              {order.paymentStatus === 'PARTIALLY_PAID' && (
                <p style={{ fontSize: '0.75rem', color: '#eab308' }}>Paid: Rs. {Math.round(order.amountPaid)} • Balance: Rs. {Math.round(order.remainingAmount)}</p>
              )}
            </div>
            <span style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: order.paymentStatus === 'PAID' ? 'rgba(34, 197, 94, 0.2)' : order.paymentStatus === 'PARTIALLY_PAID' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: order.paymentStatus === 'PAID' ? '#4ade80' : order.paymentStatus === 'PARTIALLY_PAID' ? '#facc15' : '#f87171',
              border: `1px solid ${order.paymentStatus === 'PAID' ? '#22c55e' : order.paymentStatus === 'PARTIALLY_PAID' ? '#eab308' : '#ef4444'}`,
            }}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Customer & Delivery Details */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '1.25rem', fontSize: '0.85rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Order Details</h3>
          <p style={{ color: '#cbd5e1', marginBottom: '0.25rem' }}>Customer: <strong style={{ color: '#f8fafc' }}>{order.customerName}</strong></p>
          <p style={{ color: '#cbd5e1', marginBottom: '0.25rem' }}>Phone: <span style={{ color: '#94a3b8' }}>{order.customerPhoneMasked}</span></p>
          {order.deliveryAddress && (
            <p style={{ color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.5rem' }}>
              <MapPin size={16} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{order.deliveryAddress}</span>
            </p>
          )}
        </div>

        {/* Restaurant Contact Card */}
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Questions regarding your order?</p>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>{order.restaurant?.name || 'Chill Night Food Point'}</h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>{order.restaurant?.address}</p>
          <a
            href={`tel:${order.restaurant?.phone ? order.restaurant.phone.replace(/[^0-9+]/g, '') : '03291314400'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#f97316',
              color: '#ffffff',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
            }}
          >
            <Phone size={16} /> Call Restaurant
          </a>
        </div>
      </main>
    </div>
  );
}
