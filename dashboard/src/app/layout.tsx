import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'CLARITA',
  description:
    'Plataforma CLARITA de saúde mental para monitoramento de pacientes, análise emocional e gestão clínica.',
  keywords: ['saúde mental', 'painel', 'clínico', 'monitoramento de pacientes'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Clarita" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
