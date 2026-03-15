import type { Metadata } from 'next';
import DownloaderWidget from '@/components/DownloaderWidget';
import AdBanner         from '@/components/AdBanner';

export const metadata: Metadata = {
  title:       'Facebook Video Downloader — Save FB Videos & Reels Free | MediaProc',
  description: 'Download Facebook videos, Reels, and Watch content in HD or SD. No login required for public videos. Free, fast, and works on all devices.',
  keywords:    'facebook video downloader, download facebook video, facebook to mp4, fb video download, facebook reels downloader, save facebook video',
  alternates:  { canonical: '/facebook-video-download' },
  openGraph: {
    title:       'Facebook Video Downloader — Free HD & SD Download',
    description: 'Download any public Facebook video or Reel in HD quality. No account needed.',
    type:        'website',
    url:         '/facebook-video-download',
  },
};

const FAQS = [
  {
    q: 'What quality options are available for Facebook videos?',
    a: 'Facebook typically offers HD (720p or higher) and SD (360–480p) versions. MediaProc downloads the best available quality for the video you submit.',
  },
  {
    q: 'Can I download Facebook Reels?',
    a: 'Yes — Facebook Reels are fully supported. Use the Reel URL from facebook.com/reels/ or any shared Reel link.',
  },
  {
    q: 'How do I find the Facebook video URL?',
    a: 'Click the video to open it, click the date/time link to open the direct post, then copy the URL from your browser address bar. You can also use the Share → Copy Link option.',
  },
  {
    q: 'Why is my video downloading in SD instead of HD?',
    a: 'HD quality on Facebook requires a logged-in session for some videos. If HD is not available without authentication, SD is used as the fallback.',
  },
  {
    q: 'Can I download videos from Facebook Watch?',
    a: 'Yes — Facebook Watch videos (watch/?v=...) are supported in the same way as regular FB videos.',
  },
];

export default function FacebookDownloadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ── Header Banner ── */}
      <div className="flex justify-center pt-4 px-4">
        <AdBanner placement="header" />
      </div>

            {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1 text-sm font-medium mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook Downloader
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Download Facebook Videos Free
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Paste any public Facebook video URL. Download HD or SD MP4, or extract MP3 audio — no account needed.
        </p>

        <DownloaderWidget
          platform="facebook"
          placeholder="https://www.facebook.com/watch/?v=..."
          accentColor="blue"
        />
      </section>

      {/* Supported URL types */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Supported Facebook URL Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Video Posts',    example: 'facebook.com/username/videos/123456' },
            { label: 'Facebook Watch', example: 'facebook.com/watch/?v=123456' },
            { label: 'FB Reels',       example: 'facebook.com/reels/123456' },
            { label: 'Shared Links',   example: 'fb.watch/abc123' },
          ].map(u => (
            <div key={u.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">✓</div>
              <div>
                <p className="font-semibold text-gray-800">{u.label}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{u.example}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '📹', title: 'HD & SD Quality',     desc: 'Automatically selects the best available quality for the video.' },
            { icon: '🎵', title: 'MP3 Extraction',       desc: 'Extract just the audio track as a high-quality MP3 file.' },
            { icon: '📱', title: 'Works on All Devices', desc: 'iPhone, Android, Windows, Mac — all browsers supported.' },
            { icon: '🔗', title: 'Reels & Watch',        desc: 'Supports Facebook Reels, Watch, and regular video posts.' },
            { icon: '⚡', title: 'Fast Processing',      desc: 'Dedicated FFmpeg workers process your video in under a minute.' },
            { icon: '🔒', title: 'No Login Required',   desc: 'Works for all public Facebook videos. No account needed.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold text-gray-800 mt-2 mb-1">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">FAQ — Facebook Downloader</h2>
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
      {/* ── Footer Banner ── */}
      <div className="flex justify-center pb-4 px-4">
        <AdBanner placement="footer" />
      </div>
    </main>
  );
}
