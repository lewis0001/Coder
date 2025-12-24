import Constants from 'expo-constants';

const DEFAULT_API = 'http://localhost:3001';

type ExpoExtra = {
  apiUrl?: string;
  courierToken?: string;
  courierUserId?: string;
  defaultRegionId?: string;
  defaultCustomerUserId?: string;
  defaultDropoffAddressId?: string;
};

export function getMobileConfig() {
  const cfg = (Constants.expoConfig?.extra || {}) as ExpoExtra;
  return cfg;
}

export function getSeedDefaults() {
  const cfg = getMobileConfig();
  return {
    regionId: cfg.defaultRegionId || 'seed-region-orbit',
    customerUserId: cfg.defaultCustomerUserId || 'seed-user-customer',
    dropoffAddressId: cfg.defaultDropoffAddressId || 'seed-address-user',
    courierUserId: cfg.courierUserId || 'seed-user-courier',
    courierToken: cfg.courierToken,
  } as const;
}

function getBaseUrl() {
  const cfg = getMobileConfig();
  return cfg.apiUrl || process.env.EXPO_PUBLIC_API_URL || DEFAULT_API;
}

async function request<T>(path: string, init?: RequestInit, authToken?: string): Promise<T> {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed: ${response.status} ${text}`);
  }
  return (await response.json()) as T;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string | null;
  rating?: number | null;
  cuisines?: { cuisine: { name: string } }[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  basePrice: string;
  imageUrl?: string | null;
  category?: { name: string } | null;
}

export async function fetchRestaurants() {
  return request<{ items: Restaurant[] }>('/v1/food/restaurants');
}

export async function fetchProducts(params?: { limit?: number }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  const queryString = query.toString();
  const path = queryString ? `/v1/shop/products?${queryString}` : '/v1/shop/products';
  return request<{ items: Product[] }>(path);
}

export interface BoxEstimateRequest {
  regionId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  packageSize: string;
  packageWeight: number;
}

export interface BoxEstimateResponse {
  currency: string;
  distanceKm: number;
  deliveryFee: number;
  tax: number;
  total: number;
}

export interface CreateBoxShipmentRequest {
  userId: string;
  dropoffAddressId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  packageSize: string;
  packageWeight: number;
  instructions?: string;
  scheduledAt?: string;
}

export interface CreateBoxShipmentResponse {
  orderId: string;
  taskId: string;
  status: string;
  estimate: BoxEstimateResponse;
}

export async function estimateBoxShipment(payload: BoxEstimateRequest) {
  return request<BoxEstimateResponse>('/v1/box/estimate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createBoxShipment(payload: CreateBoxShipmentRequest) {
  return request<CreateBoxShipmentResponse>('/v1/box/shipments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Courier helpers (require JWT token)
export async function toggleCourierOnline(online: boolean, authToken?: string) {
  if (!authToken) throw new Error('Courier token required');
  return request<{ online: boolean }>('/v1/courier/online', {
    method: 'POST',
    body: JSON.stringify({ online }),
  }, authToken);
}

export async function sendCourierLocation(
  payload: { latitude: number; longitude: number },
  authToken?: string,
) {
  if (!authToken) throw new Error('Courier token required');
  return request('/v1/courier/location', { method: 'POST', body: JSON.stringify(payload) }, authToken);
}

export async function acceptCourierTask(taskId: string, authToken?: string) {
  if (!authToken) throw new Error('Courier token required');
  return request(`/v1/courier/tasks/${taskId}/accept`, { method: 'POST' }, authToken);
}

export async function updateCourierTaskStatus(
  taskId: string,
  body: { status: string; note?: string },
  authToken?: string,
) {
  if (!authToken) throw new Error('Courier token required');
  return request(`/v1/courier/tasks/${taskId}/status`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, authToken);
}
