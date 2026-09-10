import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medicare Part D Prescriber Explorer',
  description: 'Explore 2024 Medicare Part D prescribing records by specialty, state, cost, volume, and drug category.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
