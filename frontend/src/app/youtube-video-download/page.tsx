import type { Metadata } from 'next';
import DownloaderWidget from '@/components/DownloaderWidget';
import AdBanner         from '@/components/AdBanner';

export const metadata: Metadata = {
  title:       'YouTube Video Downloader — Download YouTube Videos Free | MediaProc',
  description: 'Download YouTube videos in 4K, 1080p, 720p, 480p MP4, or MP3 audio. Free, fast, and no registration required. Supports Shorts and long-form videos.',
  keywords:    'youtube video downloader, download youtube video, youtube to mp4, youtube to mp3, youtube 4k downloader, free youtube downloader',
  alternates:  { canonical: '/youtube-video-download' },
  openGraph: {
    title:       'YouTube Video Downloader — Free HD Download',
    description: 'Paste any YouTube URL and download in 4K, 1080p, or MP3 instantly.',
    type:        'website',
    url:         '/youtube-video-download',
  },
};

const FAQS = [
  {
    q: 'What YouTube video qualities can I download?',
    a: 'MediaProc supports 4K (2160p), 1440p, 1080p HD, 720p, 480p, and 360p MP4, plus MP3 audio extraction.',
  },
  {
    q: 'Can I download YouTube Shorts?',
    a: 'Yes — paste the full Shorts URL (e.g. youtube.com/shorts/...) and it works exactly like a regular video.',
  },
  {
    q: 'Is there a file size or length limit?',
    a: 'Videos up to 2 hours are supported. Very long videos (live streams, full concerts) may take a few minutes to process.',
  },
  {
    q: 'How long are download links valid?',
    a: 'Download links expire after 24 hours. After that you can re-submit the URL to generate a new link.',
  },
  {
    q: 'Is it free?',
    a: 'Yes, MediaProc is completely free for personal use.',
  },
];

export default function YouTubeDownloadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* ── Header Banner ── */}
      <div className="flex justify-center pt-4 px-4">
        <AdBanner placement="header" />
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-1 text-sm font-medium mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          YouTube Downloader
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Download YouTube Videos Free
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Paste any YouTube URL below. Get MP4 in 4K, 1080p, 720p, or extract MP3 audio — in seconds.
        </p>

        {/* Widget + Sidebar layout */}
        <div className="flex gap-6 items-start justify-center">
          <div className="flex-1 max-w-2xl">
            <DownloaderWidget
              platform="youtube"
              placeholder="https://www.youtube.com/watch?v=..."
              accentColor="red"
            />

            {/* Ad below widget */}
            <AdBanner placement="sidebar" className="mt-4" />
          </div>

          {/* Sidebar banner (desktop only) */}
          <div className="hidden lg:block flex-shrink-0">
            <AdBanner placement="sidebar" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          Why Use MediaProc for YouTube Downloads?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🎬', title: 'Up to 4K Quality', desc: 'Download in the highest available resolution — 4K, 1440p, 1080p HD, and more.' },
            { icon: '🎵', title: 'MP3 Extraction',   desc: 'Extract clean MP3 audio from any YouTube video for music, podcasts, or lectures.' },
            { icon: '⚡', title: 'Fast Processing',  desc: 'FFmpeg-powered encoding. Most videos are ready in under 60 seconds.' },
            { icon: '📱', title: 'Shorts Support',   desc: 'YouTube Shorts, standard videos, and unlisted links all work.' },
            { icon: '🔒', title: 'No Account Needed', desc: 'No sign-up, no login, no tracking. Just paste and download.' },
            { icon: '💾', title: '24h Download Link', desc: 'Your file is stored for 24 hours. Download anytime, from any device.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quality table */}
      <section className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Supported Formats</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Format</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Resolution</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">File Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { fmt: '4K',    res: '3840×2160', type: 'MP4', use: 'Large screens, TV' },
                { fmt: '1080p', res: '1920×1080', type: 'MP4', use: 'Desktop, laptop'  },
                { fmt: '720p',  res: '1280×720',  type: 'MP4', use: 'Mobile, tablet'   },
                { fmt: '480p',  res: '854×480',   type: 'MP4', use: 'Low bandwidth'    },
                { fmt: 'MP3',   res: 'Audio only', type: 'MP3', use: 'Music, podcasts' },
              ].map(r => (
                <tr key={r.fmt} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.fmt}</td>
                  <td className="px-4 py-3 text-gray-600">{r.res}</td>
                  <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{r.type}</span></td>
                  <td className="px-4 py-3 text-gray-600">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQS.map(faq => (
            <details key={faq.q} className="bg-white border border-gray-200 rounded-xl p-5 group">
              <summary className="font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center">
                {faq.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer Banner ── */}
      <div className="flex justify-center pb-4 px-4">
        <AdBanner placement="footer" />
      </div>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        })}}
      />
    </main>
  );
}
