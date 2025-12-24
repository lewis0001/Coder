const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchPartnerCatalog(token: string) {
  const res = await fetch(`${API_BASE}/v1/partner/catalog`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to load catalog');
  }
  return res.json();
}

export async function updatePartnerProduct(token: string, productId: string, data: any) {
  const res = await fetch(`${API_BASE}/v1/partner/catalog/products/${productId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function updatePartnerInventory(token: string, productId: string, data: any) {
  const res = await fetch(`${API_BASE}/v1/partner/catalog/products/${productId}/inventory`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update inventory');
  return res.json();
}

export async function updatePartnerVariant(token: string, variantId: string, data: any) {
  const res = await fetch(`${API_BASE}/v1/partner/catalog/variants/${variantId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update variant');
  return res.json();
}
