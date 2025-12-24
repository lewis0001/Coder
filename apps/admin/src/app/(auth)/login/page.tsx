'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@orbit.local');
  const [password, setPassword] = useState('AdminPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/mock-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cloud px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-ash">Orbit Ops</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Admin sign-in</h1>
          <p className="mt-1 text-sm text-ash">Use seeded credentials for local development.</p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-info"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-info"
              required
            />
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
