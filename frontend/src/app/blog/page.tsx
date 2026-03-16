import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Video Download Guides & Tips | MediaProc',
  description:
    'Step-by-step guides on how to download YouTube videos, Instagram Reels, and Facebook videos for free. Learn the easiest way to save online videos for offline use.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title:       'MediaProc Blog — Video Download Guides',
    description: 'Learn how to download YouTube, Instagram, and Facebook videos for free.',
    url:         '/blog',
    type:        'website',
  },
  twitter: { card: 'summary_large_image', title: 'MediaProc Blog', description: 'Free video download guides.' },
};

const POSTS = [
  {
    href:    '/blog/how-to-download-youtube-videos',
    tag:     'YouTube',
    tagColor:'bg-red-100 text-red-700',
    title:   'How to Download YouTube Videos for Free in 2025',
    excerpt: 'A complete step-by-step guide to downloading YouTube videos in 4K, 1080p, 720p, or MP3 audio — without any software installation.',
    date:    'January 2025',
    readTime:'6 min read',
  },
  {
    href:    '/blog/how-to-download-instagram-reels',
    tag:     'Instagram',
    tagColor:'bg-pink-100 text-pink-700',
    title:   'How to Download Instagram Reels Without Watermark',
    excerpt: 'Save Instagram Reels, posts, and stories to your device in full HD quality. Works on mobile and desktop, no app required.',
    date:    'January 2025',
    readTime:'5 min read',
  },
  {
    href:    '/blog/how-to-download-facebook-videos',
    tag:     'Facebook',
    tagColor:'bg-blue-100 text-blue-700',
    title:   'How to Download Facebook Videos in HD Quality',
    excerpt: 'Download any public Facebook video to your phone or computer in HD or SD quality — fast, free, and without logging in.',
    date:    'January 2025',
    readTime:'5 min read',
  },
];

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-8">
          ← Back to MediaProc
        </Link>

        {/* Hero */}
        <div className="mb-12">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            Video Download<br />Guides &amp; Tips
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Step-by-step tutorials on how to download videos from YouTube, Instagram, Facebook,
            and more — for free, on any device.
          </p>
        </div>

        {/* Post cards */}
        <div className="space-y-6">
          {POSTS.map(post => (
            <Link
              key={post.href}
              href={post.href}
              className="block bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post.tagColor}`}>
                  {post.tag}
                </span>
                <span className="text-xs text-gray-400">{post.date}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{post.readTime}</span>
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 group-hover:text-blue-600 transition mb-2 tracking-tight">
                {post.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 font-medium">
                Read guide →
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-blue-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-extrabold mb-2">Ready to download a video?</h2>
          <p className="text-blue-100 mb-5 text-sm">
            Use MediaProc — the fastest, simplest free video downloader. No sign-up. No watermarks.
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition text-sm"
          >
            Start Downloading Free →
          </Link>
        </div>

      </div>
    </main>
  );
}
