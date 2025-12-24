import { getSession } from '@/lib/auth';
import { StatCard } from '@/components/stat-card';

const MOCK_STATS = [
  { label: 'Active Orders', value: '128', trend: '+12% vs yesterday' },
  { label: 'Couriers Online', value: '34', trend: 'Stable' },
  { label: 'Restaurants Live', value: '57', trend: '+3 new today' },
  { label: 'Support Queue', value: '6 open', trend: '2 escalated' },
];

export default function DashboardPage() {
  const session = getSession();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ash">Operations Console</p>
          <h1 className="text-3xl font-semibold text-ink">Welcome back</h1>
          <p className="text-sm text-ash">{session?.email}</p>
        </div>
        <div className="rounded-md bg-white px-4 py-2 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-ash">Role</p>
          <p className="text-sm font-semibold text-ink">{session?.role ?? 'guest'}</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {MOCK_STATS.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.trend} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Live Incidents</h2>
          <p className="mt-2 text-sm text-ash">No active incidents. System is healthy.</p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Pending Approvals</h2>
          <ul className="mt-3 space-y-2 text-sm text-ash">
            <li>• 2 refund requests awaiting review</li>
            <li>• 1 promo configuration draft</li>
            <li>• 3 partner catalog updates</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
