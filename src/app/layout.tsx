import type { Metadata, Viewport } from 'next';
import { Inter, DM_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap'
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Ruang Waktu — Jadwal & Tugas Pribadi',
  description:
    'Ruang Waktu adalah aplikasi pribadi berbasis Next.js dan Supabase untuk merencanakan jadwal, tugas, kebiasaan, dan sesi fokus.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  },
  openGraph: {
    title: 'Ruang Waktu — Jadwal & Tugas Pribadi',
    description: 'Atur jadwal, tugas, kebiasaan, dan fokus dalam satu ruang kerja pribadi.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  themeColor: '#E6EEE9',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body data-theme="light" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

