import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from '../components/react-query-provider';

export const metadata: Metadata = {
  title: 'Orbit Partner Hub',
  description: 'Partner console for Orbit restaurants and stores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ink">
        <ReactQueryProvider>
          <div className="min-h-screen bg-cloud text-ink">{children}</div>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
