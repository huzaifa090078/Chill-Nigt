import { Clock, Send, MessageCircle } from 'lucide-react';
import { Order, OrderItem, formatOrderNumber } from '../../types';

interface WhatsAppMessagePreviewProps {
  order: Order;
  items?: OrderItem[];
  onClose?: () => void;
}

export function getItemEmoji(name = ''): string {
  const lower = (name || '').toLowerCase();
  if (lower.includes('burger') || lower.includes('patty') || lower.includes('bun') || lower.includes('zinger')) return '🍔';
  if (lower.includes('fry') || lower.includes('fries') || lower.includes('potato')) return '🍟';
  if (lower.includes('pizza') || lower.includes('slice') || lower.includes('calzone')) return '🍕';
  if (lower.includes('shawarma') || lower.includes('wrap') || lower.includes('roll') || lower.includes('platter')) return '🌯';
  if (lower.includes('shake') || lower.includes('ice cream') || lower.includes('dessert')) return '🍦';
  if (lower.includes('drink') || lower.includes('pepsi') || lower.includes('soda') || lower.includes('coke') || lower.includes('7up') || lower.includes('margarita') || lower.includes('water')) return '🥤';
  if (lower.includes('chicken') || lower.includes('wing') || lower.includes('nugget') || lower.includes('broast')) return '🍗';
  return '🍔';
}

export const WhatsAppMessagePreview: React.FC<WhatsAppMessagePreviewProps> = ({
  order,
  items = order.items || [],
}) => {
  const estimatedMins =
    order.order_type === 'DELIVERY'
      ? (order.prep_time_minutes || 20) + (order.delivery_time_minutes || 15)
      : order.prep_time_minutes || 20;
  const timeType = order.order_type === 'DELIVERY' ? 'delivery' : 'ready';

  const trackingUrl = `${window.location.origin}/track?token=${order.tracking_token}`;

  let effectiveWhatsappUrl = order.whatsappUrl || '';
  if (effectiveWhatsappUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    effectiveWhatsappUrl = effectiveWhatsappUrl.replace(/http%3A%2F%2Flocalhost%3A4000/g, encodeURIComponent(window.location.origin));
    effectiveWhatsappUrl = effectiveWhatsappUrl.replace(/http:\/\/localhost:4000/g, window.location.origin);
  }

  return (
    <div className="bg-slate-900/90 dark:bg-slate-900/95 border border-slate-700/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl max-w-sm w-full mx-auto space-y-3.5 text-left">
      {/* Card Header */}
      <div className="flex items-center gap-2.5 pb-1">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shrink-0 shadow-sm">
          <MessageCircle className="w-4 h-4 fill-slate-950" />
        </div>
        <div className="min-w-0">
          <h4 className="font-extrabold text-xs sm:text-sm text-white tracking-tight leading-tight">
            Chill Night Food Point
          </h4>
          <p className="text-[11px] text-slate-400 font-medium">WhatsApp message preview</p>
        </div>
      </div>

      {/* WhatsApp Chat Bubble (Exact replica of WhatsApp message) */}
      <div className="bg-[#e7f8d8] dark:bg-[#163828] text-slate-900 dark:text-emerald-50 rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed shadow-sm space-y-2.5 border border-[#cbebb0] dark:border-emerald-800/60 font-sans">
        <p className="font-bold text-slate-950 dark:text-white">
          Assalam-o-Alaikum! 🍔
        </p>

        <p className="text-slate-800 dark:text-emerald-100/90">
          Aapka order confirm ho gaya hai.
        </p>

        <p className="font-extrabold text-slate-950 dark:text-white pt-0.5">
          Order #{formatOrderNumber(order.order_number)}
        </p>

        {/* Item List */}
        <div className="space-y-1 py-1 font-medium text-slate-900 dark:text-emerald-50">
          {items && items.length > 0 ? (
            items.map((it, idx) => {
              let displayName = it.name;
              if (it.notes && it.notes.trim()) {
                const note = it.notes.trim();
                if (!displayName.toLowerCase().includes(note.toLowerCase())) {
                  displayName = `${displayName} (${note})`;
                }
              }
              return (
                <div key={it.id || idx} className="flex items-baseline justify-between gap-1">
                  <span className="truncate">
                    {getItemEmoji(it.name)} {displayName} × {it.quantity}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-950 dark:text-white">
                    — Rs. {Math.round(it.subtotal)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-between">
              <span>🍔 Food Order × 1</span>
              <span className="font-semibold">— Rs. {Math.round(order.total_amount)}</span>
            </div>
          )}
        </div>

        {order.order_type === 'DELIVERY' && order.delivery_fee > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-300/40 dark:border-emerald-800/40 text-slate-700 dark:text-emerald-200">
            <span>🛵 Delivery Fee</span>
            <span className="font-semibold">Rs. {Math.round(order.delivery_fee)}</span>
          </div>
        )}

        <p className="font-extrabold text-sm text-slate-950 dark:text-white pt-1">
          Total: Rs. {Math.round(order.total_amount)}
        </p>

        <p className="text-slate-800 dark:text-emerald-100/90">
          ⏱️ Estimated {timeType} time: {estimatedMins} minutes
        </p>

        <div className="pt-1 space-y-0.5">
          <p className="font-extrabold text-slate-950 dark:text-white text-xs">
            📍 LIVE ORDER TRACKING:
          </p>
          <p className="text-slate-800 dark:text-emerald-100/90 text-xs">
            Tap the link below to track your order in real time:
          </p>
        </div>

        {/* WhatsApp Link Preview Card (Inside the Bubble) */}
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white dark:bg-slate-950/90 rounded-2xl p-3 border border-emerald-200/80 dark:border-emerald-800 text-center shadow-sm hover:shadow transition group"
        >
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-black text-xs text-slate-900 dark:text-white">Track Your Order</p>
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5 group-hover:underline">
            <span>Open live tracking page</span>
            <span>↗</span>
          </p>
        </a>
      </div>

      {/* Design Note Footer */}
      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-snug px-1">
        Yeh message ka design preview hai. Actual link har order ke liye unique hoga.
      </p>

      {/* Send on WhatsApp Button */}
      {effectiveWhatsappUrl && (
        <a
          href={effectiveWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
        >
          <Send className="w-4 h-4 fill-slate-950" />
          <span>Send on WhatsApp ({order.customer_phone})</span>
        </a>
      )}
    </div>
  );
};
