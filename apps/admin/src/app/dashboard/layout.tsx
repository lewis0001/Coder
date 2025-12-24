import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', roles: ['admin', 'ops', 'support'] as const },
  { label: 'Operations', href: '/dashboard/operations', roles: ['admin', 'ops'] as const },
  { label: 'Support', href: '/dashboard/support', roles: ['admin', 'support'] as const },
  { label: 'Finance', href: '/dashboard/finance', roles: ['admin'] as const },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();

  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-cloud text-ink">
      <aside className="hidden w-64 border-r border-mist bg-white/80 px-6 py-10 lg:block">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-ash">Signed in</p>
            <p className="text-sm font-semibold text-ink">{session?.email ?? 'Unknown user'}</p>
            <p className="text-xs text-ash">Role: {session?.role ?? 'guest'}</p>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.filter((item) => item.roles.includes(session.role)).map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink hover:bg-cloud">
                <span>{item.label}</span>
                <span className="text-[10px] uppercase text-ash">{item.roles.join(' / ')}</span>
              </Link>
            ))}
          </nav>

          <form action="/api/mock-logout" method="post">
            <button type="submit" className="btn-ghost w-full justify-center">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-mist bg-white/80 px-4 py-3 shadow-sm lg:hidden">
          <div>
            <p className="text-xs uppercase tracking-wide text-ash">Signed in</p>
            <p className="text-sm font-semibold text-ink">{session?.email ?? 'Unknown user'}</p>
          </div>
          <form action="/api/mock-logout" method="post">
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </header>

        <main className="px-4 py-8 md:px-6 md:py-10">{children}</main>
      </div>
    </div>
  );
}
