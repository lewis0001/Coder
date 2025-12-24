import { getSession } from '@/lib/auth';

const OPERATIONS_CHECKS = [
  'Monitor courier availability and SLA adherence',
  'Validate pickup windows and handoff checkpoints',
  'Review incident reports from the last 24 hours',
];

export default function OperationsPage() {
  const session = getSession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ash">Ops Control</p>
          <h1 className="text-2xl font-semibold text-ink">Network stability</h1>
          <p className="text-sm text-ash">{session?.email} · Role: {session?.role}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-ash">Dispatch</p>
          <p className="mt-1 text-lg font-semibold text-ink">92% on-time</p>
          <p className="text-sm text-ash">Past hour SLA</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-ash">Live tasks</p>
          <p className="mt-1 text-lg font-semibold text-ink">48 in-flight</p>
          <p className="text-sm text-ash">12 high priority</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-ash">Queues</p>
          <p className="mt-1 text-lg font-semibold text-ink">6 pending escalations</p>
          <p className="text-sm text-ash">Ops response</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Readiness checklist</h2>
        <ul className="mt-3 space-y-2 text-sm text-ash">
          {OPERATIONS_CHECKS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-success" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
