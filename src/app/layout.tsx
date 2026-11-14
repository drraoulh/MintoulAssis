import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';

import { AppShell } from '@/components/layout/AppShell';
import { freshStartScript } from '@/lib/boot-id';
import { LocaleProvider } from '@/lib/i18n';
import {
  APP_DESCRIPTION_FR,
  APP_KEYWORDS,
  APP_NAME,
  APP_TAGLINE_FR,
  getSiteUrl,
} from '@/lib/config';

import './globals.css';

/** Self-hosted to avoid Turbopack next/font/google `/l/font?kit=` failures. */
const body = localFont({
  src: [
    { path: '../fonts/plus-jakarta-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/plus-jakarta-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/plus-jakarta-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/plus-jakarta-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
});

/** Cinema section: condensed title face + serif italic for taglines. */
const cine = localFont({
  src: [{ path: '../fonts/bebas-neue-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-cine',
  display: 'swap',
});

const cineSerif = localFont({
  src: [{ path: '../fonts/cormorant-garamond-600i.woff2', weight: '600', style: 'italic' }],
  variable: '--font-cine-serif',
  display: 'swap',
});

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#007A5E' },
    { media: '(prefers-color-scheme: dark)', color: '#005C46' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${APP_NAME} — Guide touristique intelligent du Cameroun`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION_FR,
  applicationName: APP_NAME,
  authors: [{ name: 'SmartMboa / Mintoul' }],
  creator: 'SmartMboa',
  publisher: 'SmartMboa',
  keywords: [...APP_KEYWORDS],
  category: 'travel',
  alternates: {
    canonical: '/',
    languages: {
      'fr-CM': '/',
      fr: '/',
      en: '/',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: `${APP_NAME} — Découvrez le Cameroun avec l'IA`,
    description: APP_DESCRIPTION_FR,
    url: siteUrl,
    siteName: APP_NAME,
    type: 'website',
    locale: 'fr_CM',
    alternateLocale: ['en_US', 'fr_FR'],
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — ${APP_TAGLINE_FR}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Guide touristique du Cameroun`,
    description: APP_TAGLINE_FR,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: 'any' },
      { url: '/brand/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/brand/icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
  manifest: '/site.webmanifest',
  other: {
    'geo.region': 'CM',
    'geo.placename': 'Cameroon',
  },
};

function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: APP_NAME,
        url: siteUrl,
        description: APP_DESCRIPTION_FR,
        inLanguage: ['fr', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/explorer?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: APP_NAME,
        url: siteUrl,
        logo: `${siteUrl}/brand/icon.png`,
        description: APP_TAGLINE_FR,
        areaServed: {
          '@type': 'Country',
          name: 'Cameroon',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: APP_NAME,
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: APP_DESCRIPTION_FR,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'XAF',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: freshStartScript() }} />
      </head>
      <body
        className={`${body.variable} ${cine.variable} ${cineSerif.variable} antialiased`}
        suppressHydrationWarning
      >
        <JsonLd />
        <LocaleProvider>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
