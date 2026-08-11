import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Import Intelligence', description: 'China to Nigeria supplier and landed-cost intelligence MVP' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
