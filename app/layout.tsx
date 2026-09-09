import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Part D Fieldnotes | Medicare Prescriber Explorer',
  description: 'Explore 2024 Medicare Part D prescribing patterns by geography and specialty.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
