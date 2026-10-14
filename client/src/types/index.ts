export type OrderType = 'DELIVERY' | 'TAKEAWAY';

export type OrderStatus =
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface Category {
  id: string;
  name: string;
  display_order: number;
  is_active: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  is_available: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string;
  timestamp: string;
}

export interface Order {
  id: string;
  order_number: number;
  order_code?: string;
  order_number_formatted?: string;
  tracking_token: string;
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  delivery_address: string | null;
  status: OrderStatus;
  cancellation_reason: string | null;
  prep_time_minutes: number;
  delivery_time_minutes: number;
  estimated_ready_at: string;
  estimated_delivery_at: string | null;
  completed_at: string | null;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_paid: number;
  remaining_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  total_items_count?: number;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
  trackingUrl?: string;
  whatsappText?: string;
  whatsappUrl?: string;
}

export interface DashboardStats {
  todayDatePkt: string;
  todayOrdersCount: number;
  pendingOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  todaySalesTotal: number;
  statusBreakdown: { status: OrderStatus; count: number }[];
  recentOrders: Order[];
}

export interface PaymentStats {
  grandTotalSales: number;
  totalCollected: number;
  totalOutstanding: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  methodsBreakdown: { payment_method: PaymentMethod; count: number; total_collected: number }[];
  pendingOrders: Order[];
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  deliveryAddress?: string;
  items: {
    menuItemId: string;
    quantity: number;
    notes?: string;
  }[];
  prepTimeMinutes?: number;
  deliveryTimeMinutes?: number;
  deliveryFee?: number;
  discountAmount?: number;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
  notes?: string;
}

export interface CustomerTrackingResponse {
  orderNumber: number;
  orderCode?: string;
  orderNumberFormatted?: string;
  trackingToken: string;
  customerName: string;
  customerPhoneMasked: string;
  orderType: OrderType;
  deliveryAddress: string | null;
  status: OrderStatus;
  cancellationReason: string | null;
  estimatedReadyAt: string;
  estimatedDeliveryAt: string | null;
  completedAt: string | null;
  createdAt: string;
  serverTimeUtc: string;
  displayTimezone: string;
  items: {
    name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    notes: string;
  }[];
  history: {
    status: OrderStatus;
    note: string;
    timestamp: string;
  }[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  remainingAmount: number;
  restaurant: {
    name: string;
    phone: string;
    phoneFormatted?: string;
    phoneDial?: string;
    address: string;
  };
}

export interface ShopSettings {
  shop_name: string;
  shop_phone: string;
  alt_phone?: string;
  address: string;
  city: string;
  currency: string;
  opening_time?: string;
  closing_time?: string;
  default_prep_time: string;
  default_delivery_time: string;
  default_delivery_fee: string;
  min_order_amount?: string;
  default_order_type: OrderType;
  default_order_filter: string;
  confirm_destructive_actions: string;
  order_alert_sound: string;
  last_backup_time?: string;
  backup_reminder_days?: string;
}

export interface BackupMetadata {
  categoriesCount: number;
  menuItemsCount: number;
  ordersCount: number;
  orderItemsCount: number;
  statusHistoryCount: number;
}

export interface BackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  metadata: BackupMetadata;
  data: {
    settings: ShopSettings;
    categories: Category[];
    menu_items: MenuItem[];
    orders: Order[];
    order_items: unknown[];
    order_status_history: unknown[];
  };
}

export const ORDER_PREFIX = 'CNFP';

export function formatOrderNumber(orderNumber: number | string | undefined | null): string {
  if (!orderNumber && orderNumber !== 0) return '';
  const clean = String(orderNumber).replace(/^#?CNFP?-?/i, '');
  return `${ORDER_PREFIX}-${clean}`;
}

