import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CatalogManager } from '@/components/catalog-manager';
import { getSession } from '@/lib/auth';
import { fetchPartnerCatalog } from '@/lib/api';

function mapCatalog(apiCategories: any[]) {
  return apiCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: (cat.products || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      price: Number(product.basePrice || product.price || 0),
      sku: product.variants?.[0]?.sku || 'N/A',
      available: product.isActive !== false,
      categoryId: cat.id,
      variantId: product.variants?.[0]?.id,
      inventoryId: product.inventory?.id,
      quantity: product.inventory?.quantity ?? 0,
    })),
  }));
}

export default async function CatalogPage() {
  const session = getSession();
  if (!session) redirect('/login');

  const payload = await fetchPartnerCatalog(session.token);
  const initialCatalog = mapCatalog(payload.categories || []);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ash">Partner Hub</p>
          <h1 className="text-3xl font-semibold text-ink">Catalog</h1>
          <p className="text-sm text-fog">Control availability and pricing before publishing updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost">
            Back to dashboard
          </Link>
          <form action="/api/mock-logout" method="post">
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <CatalogManager initialCatalog={initialCatalog} token={session.token} />
    </div>
  );
}
