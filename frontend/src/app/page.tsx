import Link from 'next/link';
import AdBanner from '@/components/AdBanner';

const PLATFORMS = [
  {
    href:  '/youtube-video-download',
    label: 'YouTube',
    icon:  '▶',
    color: 'text-red-600',
    bg:    'bg-red-50 hover:bg-red-100',
    border:'border-red-200',
    desc:  'Download YouTube videos in 4K, 1080p, 720p or MP3',
  },
  {
    href:  '/instagram-reels-download',
    label: 'Instagram',
    icon:  '📸',
    color: 'text-pink-600',
    bg:    'bg-pink-50 hover:bg-pink-100',
    border:'border-pink-200',
    desc:  'Save Instagram Reels, posts and stories',
  },
  {
    href:  '/facebook-video-download',
    label: 'Facebook',
    icon:  '📘',
    color: 'text-blue-600',
    bg:    'bg-blue-50 hover:bg-blue-100',
    border:'border-blue-200',
    desc:  'Download Facebook videos in HD or SD',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      {/* ── Header Banner ── */}
      <AdBanner placement="header" className="mb-6 w-full" />

      {/* Hero */}
      <div className="text-center max-w-2xl mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          MediaProc
        </h1>
        <p className="text-lg text-gray-500">
          Free, fast video downloader for YouTube, Instagram, Facebook and 1,000+ sites.
          No watermarks. No sign-up.
        </p>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        {PLATFORMS.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className={`flex flex-col items-center p-8 rounded-2xl border ${p.bg} ${p.border} transition shadow-sm hover:shadow-md`}
          >
            <span className="text-4xl mb-3">{p.icon}</span>
            <span className={`text-xl font-bold mb-2 ${p.color}`}>{p.label}</span>
            <span className="text-sm text-gray-500 text-center leading-relaxed">{p.desc}</span>
          </Link>
        ))}
      </div>

      {/* ── Sidebar/Middle Banner ── */}
      <AdBanner placement="sidebar" className="mt-10" />

      {/* Footer note */}
      <p className="mt-8 text-xs text-gray-400 text-center max-w-md">
        MediaProc is a development build. Use responsibly and respect platform terms of service.
      </p>

      {/* ── Footer Banner ── */}
      <AdBanner placement="footer" className="mt-6 w-full" />


    </main>
  );
}
