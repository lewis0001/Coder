const SNAPSHOT = [
  { label: 'Net sales', value: '$2,430', hint: '+8% vs yesterday' },
  { label: 'Orders completed', value: '86', hint: '4 cancellations' },
  { label: 'Avg. prep time', value: '16 min', hint: 'Goal: 15 min' },
  { label: 'Live items', value: '142', hint: '6 paused' },
];

export function PartnerSnapshot() {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {SNAPSHOT.map((item) => (
        <div key={item.label} className="card p-5">
          <p className="text-sm text-ash">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-fog">{item.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}
