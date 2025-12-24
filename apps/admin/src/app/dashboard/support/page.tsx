import { getSession } from '@/lib/auth';

const TICKETS = [
  { id: 'INC-4821', summary: 'Missing courier handoff photo', status: 'Awaiting ops', age: '14m' },
  { id: 'REQ-1920', summary: 'Refund request - order 10322', status: 'Finance review', age: '37m' },
  { id: 'INC-4813', summary: 'Delayed pickup in DXB02', status: 'Monitoring', age: '52m' },
];

export default function SupportPage() {
  const session = getSession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ash">Support desk</p>
          <h1 className="text-2xl font-semibold text-ink">Queue health</h1>
          <p className="text-sm text-ash">{session?.email} · Role: {session?.role}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-ink">Live tickets</h2>
          <ul className="mt-3 divide-y divide-mist/60 text-sm text-ink">
            {TICKETS.map((ticket) => (
              <li key={ticket.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{ticket.id}</span>
                  <span className="text-xs uppercase text-ash">{ticket.status}</span>
                </div>
                <p className="text-ash">{ticket.summary}</p>
                <p className="text-xs text-ash">Age: {ticket.age}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-ink">Macro coverage</h2>
          <p className="mt-2 text-sm text-ash">
            Ensure handoff issues, payment disputes, and partner catalog mismatches have ready-to-use playbooks.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li>✅ Handoff & photo verification</li>
            <li>✅ Refund and goodwill credits</li>
            <li>⚠️ Partner catalog mismatch (needs review)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
