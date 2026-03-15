import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Footer        from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';

// ── Configuration — update these two values before going live ────────────────
const SITE_URL = 'https://www.mediaproc.app';   // ← your live domain
const GA_ID    = 'G-XXXXXXXXXX';                 // ← your GA4 Measurement ID

export const metadata: Metadata = {
  // metadataBase makes all relative image/URL paths absolute automatically.
  // Next.js uses this when generating og:url, og:image, twitter:image, etc.
  metadataBase: new URL(SITE_URL),

  // ── Title ──────────────────────────────────────────────────────────────────
  // `template` prepends page-level titles: "About Us | MediaProc"
  title: {
    default:  'MediaProc — Free Video Downloader',
    template: '%s | MediaProc',
  },

  // ── Core meta ──────────────────────────────────────────────────────────────
  description:
    'Download videos from YouTube, Instagram, Facebook and 1,000+ sites for free. No sign-up, no watermarks. Fast, simple, and private.',
  keywords: [
    'video downloader',
    'free video downloader',
    'youtube downloader',
    'youtube to mp4',
    'youtube to mp3',
    'instagram reels downloader',
    'instagram video download',
    'facebook video downloader',
    'download youtube video free',
    'online video downloader',
    'mediaproc',
  ],
  authors:  [{ name: 'MediaProc', url: SITE_URL }],
  creator:  'MediaProc',
  publisher: 'MediaProc',

  // ── Robots ─────────────────────────────────────────────────────────────────
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-image-preview': 'large',
      'max-snippet':       -1,
      'max-video-preview': -1,
    },
  },

  // ── Open Graph ─────────────────────────────────────────────────────────────
  // Used by: Facebook, WhatsApp, LinkedIn, Telegram, Slack, Discord, Google
  openGraph: {
    type:        'website',
    siteName:    'MediaProc',
    locale:      'en_US',
    url:          SITE_URL,
    title:       'MediaProc — Free Video Downloader',
    description: 'Download videos from YouTube, Instagram, Facebook and 1,000+ sites for free. No sign-up. No watermarks.',
    images: [
      {
        url:    '/og-image.png',   // resolved to https://www.mediaproc.app/og-image.png
        width:  1200,
        height: 630,
        alt:    'MediaProc — Free Video Downloader',
        type:   'image/png',
      },
    ],
  },

  // ── Twitter / X Card ───────────────────────────────────────────────────────
  // summary_large_image = full-width preview card (recommended for tools)
  twitter: {
    card:        'summary_large_image',
    site:        '@mediaproc',        // ← update if you have a Twitter/X handle
    title:       'MediaProc — Free Video Downloader',
    description: 'Download videos from YouTube, Instagram, and Facebook instantly. Free, fast, no sign-up.',
    images:      ['/og-image.png'],
  },

  // ── Canonical + alternates ────────────────────────────────────────────────
  alternates: {
    canonical: SITE_URL,
  },

  // ── App / PWA metadata ────────────────────────────────────────────────────
  applicationName: 'MediaProc',
  category:        'utilities',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ── Google Analytics 4 ─────────────────────────────────────────── */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { page_path: window.location.pathname });
          `}
        </Script>
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased flex flex-col min-h-screen">

        {/* ── Page content ───────────────────────────────────────────────── */}
        <div className="flex-1">
          {children}
        </div>

        {/* ── Global footer (every page) ─────────────────────────────────── */}
        <Footer />

        {/* ── Cookie consent banner ──────────────────────────────────────── */}
        <CookieConsent />

      </body>
    </html>
  );
}
