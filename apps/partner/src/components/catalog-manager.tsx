'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  updatePartnerInventory,
  updatePartnerProduct,
  updatePartnerVariant,
} from '@/lib/api';

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  sku: string;
  available: boolean;
  categoryId: string;
  variantId?: string;
  quantity?: number;
};

type CatalogCategory = {
  id: string;
  name: string;
  items: CatalogItem[];
};

export function CatalogManager({
  initialCatalog,
  token,
}: {
  initialCatalog: CatalogCategory[];
  token: string;
}) {
  const [catalog, setCatalog] = useState<CatalogCategory[] | null>(initialCatalog);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCatalog(initialCatalog);
  }, [initialCatalog]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.map((category) => ({
      ...category,
      items: category.items.filter((item) => item.name.toLowerCase().includes(query)),
    }));
  }, [catalog, search]);

  const totals = useMemo(() => {
    const allItems = catalog.flatMap((c) => c.items);
    const available = allItems.filter((i) => i.available).length;
    return { total: allItems.length, available };
  }, [catalog]);

  const toggleAvailability = async (itemId: string) => {
    const item = catalog.flatMap((c) => c.items).find((i) => i.id === itemId);
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      await updatePartnerProduct(token, itemId, { isActive: !item.available });
      setCatalog((prev) =>
        prev.map((category) => ({
          ...category,
          items: category.items.map((it) =>
            it.id === itemId ? { ...it, available: !it.available } : it,
          ),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const updatePrice = async (itemId: string, price: number) => {
    if (Number.isNaN(price) || price <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await updatePartnerProduct(token, itemId, { price });
      setCatalog((prev) =>
        prev.map((category) => ({
          ...category,
          items: category.items.map((item) => (item.id === itemId ? { ...item, price } : item)),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const item = catalog.flatMap((c) => c.items).find((i) => i.id === itemId);
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      await updatePartnerInventory(token, itemId, { quantity });
      setCatalog((prev) =>
        prev.map((category) => ({
          ...category,
          items: category.items.map((it) =>
            it.id === itemId ? { ...it, quantity } : it,
          ),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  const updateVariantName = async (variantId: string | undefined, name: string) => {
    if (!variantId) return;
    setSaving(true);
    setError(null);
    try {
      await updatePartnerVariant(token, variantId, { name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update variant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ash">Catalog overview</p>
          <h2 className="text-2xl font-semibold text-ink">Manage menu and inventory</h2>
          <p className="text-sm text-fog">Toggle availability or adjust prices and sync instantly.</p>
        </div>
        <div className="card flex flex-col gap-2 p-4 text-sm text-ink">
          <div className="flex items-center justify-between">
            <span className="text-ash">Items live</span>
            <span className="font-semibold text-primary">{totals.available}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ash">Total items</span>
            <span className="font-semibold">{totals.total}</span>
          </div>
          {saving ? <p className="text-xs text-ash">Saving...</p> : null}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-info"
          placeholder="Search items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-xs text-ash">Showing results in {filtered.length} categories</p>
      </div>

      <div className="space-y-4">
        {filtered.map((category) => (
          <div key={category.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-ash">Category</p>
                <h3 className="text-lg font-semibold text-ink">{category.name}</h3>
              </div>
              <span className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-ash">
                {category.items.length} items
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-ink">
                <thead>
                  <tr className="border-b border-mist text-xs uppercase tracking-wide text-ash">
                    <th className="py-2">Item</th>
                    <th className="py-2">SKU</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Availability</th>
                    <th className="py-2">Inventory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist/70">
                  {category.items.map((item) => (
                    <tr key={item.id} className={clsx(!item.available && 'opacity-60')}>
                      <td className="py-2 font-semibold">
                        <input
                          defaultValue={item.name}
                          onBlur={(e) => updateVariantName(item.variantId, e.target.value)}
                          className="w-full rounded-md border border-mist px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-info"
                        />
                      </td>
                      <td className="py-2 text-ash">{item.sku}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-ash">$</span>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item.price.toFixed(2)}
                            onBlur={(e) => updatePrice(item.id, Number(e.target.value))}
                            className="w-24 rounded-md border border-mist px-2 py-1 text-sm text-ink focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-info"
                          />
                        </div>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(item.id)}
                          className={clsx(
                            'rounded-full px-3 py-1 text-xs font-semibold transition',
                            item.available
                              ? 'bg-success/15 text-success hover:bg-success/25'
                              : 'bg-danger/15 text-danger hover:bg-danger/25',
                          )}
                        >
                          {item.available ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          defaultValue={(item.quantity ?? 0).toString()}
                          onBlur={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="w-24 rounded-md border border-mist px-2 py-1 text-sm text-ink focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-info"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { CatalogCategory, CatalogItem };
