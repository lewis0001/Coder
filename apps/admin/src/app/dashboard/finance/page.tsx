import { getSession } from '@/lib/auth';

const LEDGER_LINES = [
  { label: 'Top-ups', value: '+$42,100', hint: 'Stripe + cash', tone: 'success' },
  { label: 'Payouts', value: '-$18,400', hint: 'Partners this week', tone: 'warning' },
  { label: 'Refunds', value: '-$3,250', hint: '12 processed today', tone: 'danger' },
];

export default function FinancePage() {
  const session = getSession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ash">Finance controls</p>
          <h1 className="text-2xl font-semibold text-ink">Ledger snapshot</h1>
          <p className="text-sm text-ash">{session?.email} · Role: {session?.role}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {LEDGER_LINES.map((line) => (
          <div key={line.label} className="card p-5">
            <p className="text-xs uppercase tracking-wide text-ash">{line.label}</p>
            <p className="mt-1 text-lg font-semibold text-ink">{line.value}</p>
            <p className={`text-sm ${line.tone === 'success' ? 'text-success' : line.tone === 'warning' ? 'text-warning' : 'text-danger'}`}>
              {line.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Controls</h2>
        <p className="mt-2 text-sm text-ash">Use this view for approving payouts, auditing refunds, and reconciling ledger gaps.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-primary">Approve partner payouts</button>
          <button className="btn-ghost">Export ledger CSV</button>
          <button className="btn-secondary">Flag anomalies</button>
        </div>
      </div>
    </div>
  );
}
