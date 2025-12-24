import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { PartnerSnapshot } from '@/components/partner-snapshot';

const MOCK_MENU_UPDATES = [
  { title: 'Spicy Chicken Wrap', status: 'Live', message: 'Now available in menu' },
  { title: 'House Salad', status: 'Paused', message: 'Mark out of stock? Check inventory.' },
];

const MOCK_ORDERS = [
  { id: 'ORD-1201', status: 'Preparing', eta: '18 min' },
  { id: 'ORD-1199', status: 'Ready for pickup', eta: 'Courier arriving' },
  { id: 'ORD-1195', status: 'Delivered', eta: 'Completed' },
];

export default function PartnerDashboard() {
  const session = getSession();
  if (!session) redirect('/login');

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ash">Partner Hub</p>
          <h1 className="text-3xl font-semibold text-ink">Today&apos;s performance</h1>
          <p className="text-sm text-fog">Track live orders, manage availability, and keep customers happy.</p>
        </div>
        <form action="/api/mock-logout" method="post">
          <button type="submit" className="btn-ghost">Sign out</button>
        </form>
      </header>

      <PartnerSnapshot />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Live orders</h2>
          <ul className="mt-3 space-y-3 text-sm text-ink">
            {MOCK_ORDERS.map((order) => (
              <li key={order.id} className="flex items-center justify-between rounded-md border border-mist/60 bg-white px-4 py-3">
                <div>
                  <p className="font-semibold text-ink">{order.id}</p>
                  <p className="text-xs text-ash">{order.status}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{order.eta}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Catalog updates</h2>
          <ul className="mt-3 space-y-3 text-sm text-ink">
            {MOCK_MENU_UPDATES.map((item) => (
              <li key={item.title} className="rounded-md border border-mist/60 bg-white px-4 py-3">
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="text-xs text-ash">{item.message}</p>
                <span className="mt-2 inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
