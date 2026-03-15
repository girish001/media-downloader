import type { Metadata } from 'next';
import DownloaderWidget from '@/components/DownloaderWidget';
import AdBanner         from '@/components/AdBanner';

export const metadata: Metadata = {
  title:       'Instagram Reels Downloader — Save Reels & Videos Free | MediaProc',
  description: 'Download Instagram Reels, videos, and posts in HD MP4 or MP3. No login required. Works on mobile and desktop. Fast and free.',
  keywords:    'instagram reels downloader, download instagram video, instagram to mp4, save instagram reels, instagram video download, ig downloader',
  alternates:  { canonical: '/instagram-reels-download' },
  openGraph: {
    title:       'Instagram Reels Downloader — Free HD Download',
    description: 'Download Instagram Reels and videos in HD quality. No account needed.',
    type:        'website',
    url:         '/instagram-reels-download',
  },
};

const FAQS = [
  {
    q: 'Can I download private Instagram videos?',
    a: 'Only public Instagram content can be downloaded without authentication. Private accounts require you to be logged in to view the content — MediaProc only processes publicly accessible videos.',
  },
  {
    q: 'What types of Instagram content can I download?',
    a: 'MediaProc supports Instagram Reels, standard video posts, and IGTV videos. Profile stories are time-limited and may not always be accessible.',
  },
  {
    q: 'How do I get the Instagram video URL?',
    a: 'Open the Instagram post or Reel, tap the three-dot menu (···), select "Copy Link", then paste it into the input above.',
  },
  {
    q: 'Will the video include audio?',
    a: 'Yes — downloaded videos include the original audio. You can also extract MP3 audio-only if preferred.',
  },
  {
    q: 'Does it work on iPhone and Android?',
    a: 'Yes, MediaProc is fully mobile-responsive. Download directly to your phone from the browser.',
  },
];

export default function InstagramDownloadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* ── Header Banner ── */}
      <div className="flex justify-center pt-4 px-4">
        <AdBanner placement="header" />
      </div>

            {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full px-4 py-1 text-sm font-medium mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          Instagram Downloader
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Download Instagram Reels & Videos
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Paste any public Instagram Reel or video URL. Save as MP4 or extract MP3 audio — free and instant.
        </p>

        <DownloaderWidget
          platform="instagram"
          placeholder="https://www.instagram.com/reels/..."
          accentColor="pink"
        />
      </section>

      {/* How to */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">How to Download Instagram Reels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Copy the Reel URL', desc: 'Open Instagram, tap the Reel, press the ··· menu and select "Copy Link".' },
            { step: '2', title: 'Paste the URL',     desc: 'Paste the URL into the input field above and click Download.' },
            { step: '3', title: 'Save the file',     desc: 'Wait a few seconds for processing, then click the download button to save your file.' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
              <p className="text-gray-600 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: '🎬', title: 'HD Quality',         desc: 'Download Reels and videos in the original HD quality.' },
            { icon: '🎵', title: 'Audio Extraction',   desc: 'Save just the audio track as an MP3 file.' },
            { icon: '📲', title: 'Mobile Friendly',    desc: 'Works seamlessly on iOS and Android browsers.' },
            { icon: '🔗', title: 'Reels & Posts',      desc: 'Supports Reels, regular video posts, and IGTV.' },
            { icon: '🔒', title: 'No Login Required',  desc: 'Public videos only — no Instagram account needed.' },
            { icon: '💨', title: 'Fast Downloads',     desc: 'Processed by dedicated FFmpeg workers in seconds.' },
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
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">FAQ — Instagram Downloader</h2>
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
