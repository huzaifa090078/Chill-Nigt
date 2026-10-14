import {
  Category,
  MenuItem,
  Order,
  DashboardStats,
  PaymentStats,
  CreateOrderPayload,
  CustomerTrackingResponse,
  OrderStatus,
  PaymentMethod,
  ShopSettings,
  BackupPayload,
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const err = await res.json();
      if (err.error) errorMsg = err.error;
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

// 1. Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  return handleResponse<DashboardStats>(res);
}

// 2. Menu
export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/menu/categories`);
  return handleResponse<Category[]>(res);
}

export async function addCategory(name: string, displayOrder = 0): Promise<Category> {
  const res = await fetch(`${API_BASE}/menu/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, displayOrder }),
  });
  return handleResponse<Category>(res);
}

export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const url = categoryId ? `${API_BASE}/menu/items?categoryId=${categoryId}` : `${API_BASE}/menu/items`;
  const res = await fetch(url);
  return handleResponse<MenuItem[]>(res);
}

export async function addMenuItem(data: {
  categoryId: string;
  name: string;
  description: string;
  price: number;
}): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MenuItem>(res);
}

export async function updateMenuItem(
  id: string,
  data: {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    isAvailable?: number;
  }
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MenuItem>(res);
}

export async function toggleItemAvailability(id: string, isAvailable: number): Promise<{ id: string; isAvailable: number }> {
  const res = await fetch(`${API_BASE}/menu/items/${id}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAvailable }),
  });
  return handleResponse<{ id: string; isAvailable: number }>(res);
}

export async function deleteMenuItem(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/menu/items/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res);
}

// 3. Orders
export async function getOrders(status?: string, search?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search && search.trim()) params.append('search', search.trim());
  const res = await fetch(`${API_BASE}/orders?${params.toString()}`);
  return handleResponse<Order[]>(res);
}

export async function getOrderById(id: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  return handleResponse<Order>(res);
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Order>(res);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  cancellationReason?: string,
  note?: string
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, cancellationReason, note }),
  });
  return handleResponse<Order>(res);
}

export async function updateOrderPayment(
  id: string,
  paymentMethod: PaymentMethod,
  amountPaid: number
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod, amountPaid }),
  });
  return handleResponse<Order>(res);
}

// 4. Payments
export async function getPaymentStats(): Promise<PaymentStats> {
  const res = await fetch(`${API_BASE}/payments/stats`);
  return handleResponse<PaymentStats>(res);
}

// 5. Tracking
export async function getTrackingDetails(token: string): Promise<CustomerTrackingResponse> {
  const res = await fetch(`${API_BASE}/track/${token}`);
  return handleResponse<CustomerTrackingResponse>(res);
}

// 6. Settings, Backup & Data Management
export async function getShopSettings(): Promise<ShopSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  return handleResponse<ShopSettings>(res);
}

export async function updateShopSettings(data: Partial<ShopSettings>): Promise<ShopSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShopSettings>(res);
}

export async function exportBackupData(): Promise<BackupPayload> {
  const res = await fetch(`${API_BASE}/settings/backup/export`);
  return handleResponse<BackupPayload>(res);
}

export async function importBackupData(backupData: unknown): Promise<{
  success: boolean;
  message: string;
  restored: { categoriesCount: number; menuItemsCount: number; ordersCount: number };
}> {
  const res = await fetch(`${API_BASE}/settings/backup/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backup: backupData }),
  });
  return handleResponse<{
    success: boolean;
    message: string;
    restored: { categoriesCount: number; menuItemsCount: number; ordersCount: number };
  }>(res);
}

export async function resetOrdersData(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/reset/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation: true }),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

export async function resetMenuData(reseedDefaults = false): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/reset/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation: true, reseedDefaults }),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

export async function resetAllAppData(confirmationText: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/reset/all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmationText }),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

