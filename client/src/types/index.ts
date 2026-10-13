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
    address: string;
  };
}
