import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us — MediaProc | Free Video Downloader',
  description:
    'Learn about MediaProc — a fast, free, and privacy-respecting video downloader for YouTube, Instagram, and Facebook. No storage, no sign-up, no tracking.',
  alternates: { canonical: '/about' },
  openGraph: {
    title:       'About MediaProc',
    description: 'Free online tool to download publicly available videos for personal use.',
    url:         '/about',
    type:        'website',
  },
  twitter: { card: 'summary', title: 'About MediaProc', description: 'Free video downloader.' },
};

const HIGHLIGHTS = [
  { icon: '⚡', title: 'Lightning Fast',         desc: 'Server-side processing delivers your file in seconds. No waiting in queues.'           },
  { icon: '🔒', title: 'No Permanent Storage',   desc: 'Videos are processed transiently. Once delivered, zero copies remain on our servers.' },
  { icon: '🎯', title: 'Three Steps Only',        desc: 'Paste a URL → choose format → download. The simplest workflow possible.'             },
  { icon: '🌐', title: '1,000+ Sites Supported',  desc: 'YouTube, Instagram, Facebook, Twitter, Vimeo, TikTok and hundreds more.'             },
  { icon: '📵', title: 'No Sign-Up Required',     desc: 'No account, no email. Open the page and start downloading instantly.'               },
  { icon: '🎞️', title: 'Multiple Formats',        desc: 'Download in 4K, 1080p, 720p MP4, or extract MP3 audio — your choice every time.'    },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-8">
          ← Back to MediaProc
        </Link>

        <div className="mb-10">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Who We Are
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            Fast, Free &amp; Fuss-Free<br />Video Downloads
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            MediaProc is a lightweight online tool that lets you save publicly available videos
            for personal use — no accounts, no bloatware, no nonsense.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {HIGHLIGHTS.map(c => (
            <div key={c.title} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-3xl mb-3">{c.icon}</div>
              <div className="font-bold text-gray-800 mb-1 text-sm">{c.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>

        <Section title="What Is MediaProc?">
          <p>
            MediaProc is a free, browser-based video downloading utility designed to help you save
            publicly accessible video content from platforms such as YouTube, Instagram, and Facebook
            for <strong>personal, offline use</strong>. Whether you want to keep a tutorial for a
            flight, archive a travel reel, or watch a lecture without buffering, MediaProc makes the
            process effortless.
          </p>
          <p className="mt-3">
            We believe useful tools should not be complicated. MediaProc was built with a single
            philosophy: get you your video quickly, cleanly, and without friction. No registration
            walls. No intrusive pop-ups. No confusing multi-step wizards.
          </p>
        </Section>

        <Section title="How MediaProc Works">
          <ol className="space-y-3 list-none">
            {[
              ['Step 1 — Copy the URL', 'Go to the video on YouTube, Instagram, or Facebook. Copy the link from the address bar or the Share menu.'],
              ['Step 2 — Paste and Choose Format', 'Paste the URL into the MediaProc input field. Select your preferred resolution or choose MP3 for audio-only.'],
              ['Step 3 — Download', 'Click Download. Our servers transiently process the stream and deliver the file directly to your browser. No copy is retained afterwards.'],
            ].map(([h, d]) => (
              <li key={h as string} className="flex gap-3 bg-gray-100 rounded-xl px-5 py-4">
                <span className="text-blue-600 font-bold shrink-0 mt-0.5">▸</span>
                <span className="text-sm text-gray-700">
                  <strong className="text-gray-900">{h as string}.</strong>{' '}{d as string}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Our Commitment to Privacy and Copyright">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-4 text-sm text-blue-800">
            <strong>No permanent hosting.</strong> MediaProc does not host, cache, store, or
            redistribute any video content. Every download is a transient, one-time process.
            Once your file is delivered to your browser, no copy remains on our servers.
          </div>
          <p>
            We respect the intellectual property rights of all copyright holders and respond promptly
            to DMCA takedown notices. MediaProc is intended strictly for{' '}
            <strong>personal, non-commercial use</strong> — not for mass downloading, scraping, or
            commercial exploitation of third-party media.
          </p>
        </Section>

        <Section title="Supported Platforms">
          <p>MediaProc supports a wide range of platforms including:</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['YouTube', 'Instagram', 'Facebook', 'Twitter / X', 'Vimeo', 'TikTok', 'Dailymotion', 'Reddit', 'LinkedIn'].map(p => (
              <span key={p} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-center shadow-sm">
                {p}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Why Choose MediaProc?">
          <ul className="space-y-2">
            {[
              'Completely free for personal use — no hidden charges.',
              'No registration required — zero friction from the first visit.',
              'Privacy-respecting — only minimal data is collected to operate the service.',
              'Actively maintained — we keep up with platform changes so you do not have to.',
              'Mobile-friendly — works on Android, iOS, and all modern browsers.',
              'Transparent — clear Privacy Policy, Terms of Service, and DMCA contact available.',
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500 shrink-0">✓</span> {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Contact Us">
          <p>
            Have a question, a bug report, or a copyright concern?{' '}
            Reach out at{' '}
            <a href="mailto:crgr200@gmail.com" className="text-blue-600 hover:underline font-medium">
              crgr200@gmail.com
            </a>
            {' '}or visit our{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">Contact page</Link>.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-extrabold text-gray-900 mb-3 tracking-tight">{title}</h2>
      <div className="text-gray-600 leading-relaxed text-sm">{children}</div>
    </div>
  );
}
