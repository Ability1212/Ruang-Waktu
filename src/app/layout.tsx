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
  title: 'Ruang Waktu — Manajemen Proyek, Helpdesk Tiket & QA Tim',
  description:
    'Ruang Waktu adalah aplikasi manajemen proyek, tugas tim, helpdesk tiket klien, dan pengujian QA berbasis Next.js dan Supabase.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  },
  openGraph: {
    title: 'Ruang Waktu — Manajemen Proyek, Helpdesk Tiket & QA Tim',
    description:
      'Kelola proyek, tiket komplain klien, penugasan tim, dan skenario pengujian QA dalam satu ruang kerja terpadu.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'Ruang Waktu',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Ruang Waktu — Manajemen Proyek, Helpdesk Tiket & QA Tim'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ruang Waktu — Manajemen Proyek, Helpdesk Tiket & QA Tim',
    description:
      'Kelola proyek, tiket komplain klien, penugasan tim, dan skenario pengujian QA dalam satu ruang kerja terpadu.',
    images: ['/og-image.svg']
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
