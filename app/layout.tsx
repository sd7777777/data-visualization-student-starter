import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Part D Field Notes | Medicare Prescriber Analysis',
  description: 'An interactive analysis of 2024 Medicare Part D prescribing patterns by specialty, state, and provider record.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
