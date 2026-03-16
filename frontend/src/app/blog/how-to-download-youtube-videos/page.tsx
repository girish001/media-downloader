import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Download YouTube Videos for Free in 2025',
  description:
    'Step-by-step guide to downloading YouTube videos in 4K, 1080p, 720p, or MP3 audio for free. No software needed. Works on mobile and desktop.',
  alternates: { canonical: '/blog/how-to-download-youtube-videos' },
  openGraph: {
    title:       'How to Download YouTube Videos for Free in 2025',
    description: 'Download any YouTube video in 4K, HD, or MP3 in three easy steps — no software, no sign-up.',
    url:         '/blog/how-to-download-youtube-videos',
    type:        'article',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'How to Download YouTube Videos for Free',
    description: 'Complete guide: save any YouTube video in 4K, 1080p, or MP3.',
  },
};

export default function HowToDownloadYouTube() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <article className="max-w-3xl mx-auto">

        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-8">
          ← Back to Blog
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-5">
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">YouTube</span>
          <span className="text-xs text-gray-400">January 2025 · 6 min read</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-5">
          How to Download YouTube Videos for Free in 2025
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-10">
          Whether you want to save a tutorial for offline viewing, keep a favourite music video, or
          archive an important lecture, downloading YouTube videos has never been easier. In this guide
          we walk you through exactly how to do it — for free, without any software installation, and
          in any quality from 360p all the way up to 4K.
        </p>

        {/* CTA top */}
        <CtaBanner />

        {/* ── Section 1 ── */}
        <Section title="Why Download YouTube Videos?">
          <p>
            YouTube is the world's largest video platform, hosting billions of videos on every topic
            imaginable. While YouTube's own app does offer offline downloads in some regions, those
            downloads are locked inside the app — you cannot use them on your TV, share them, or
            access them once your subscription lapses. Downloading directly to your device solves
            all of these limitations.
          </p>
          <p className="mt-3">
            Common reasons people download YouTube videos include:
          </p>
          <ul className="mt-3 space-y-2">
            {[
              'Watching tutorials and how-to guides on a flight or in areas with no Wi-Fi.',
              'Saving educational lectures, webinars, or recorded classes for revision.',
              'Keeping a personal archive of videos that might be deleted or made private.',
              'Extracting audio from music videos or podcasts as MP3 files.',
              'Reducing mobile data usage by downloading on Wi-Fi to watch later.',
            ].map(item => <BulletItem key={item} text={item} />)}
          </ul>
          <p className="mt-3">
            <strong>Important note:</strong> Always ensure you only download content you are legally
            permitted to save. Download only for personal, non-commercial use and respect the
            copyright of content creators.
          </p>
        </Section>

        {/* ── Section 2 ── */}
        <Section title="What You Need Before You Start">
          <p>
            One of the biggest advantages of using MediaProc is that you need{' '}
            <strong>absolutely nothing installed</strong>. No desktop app, no browser extension,
            no plugin. All you need is:
          </p>
          <ul className="mt-3 space-y-2">
            {[
              'A device with a modern web browser (Chrome, Firefox, Safari, Edge — all work).',
              'The URL of the YouTube video you want to download.',
              'A stable internet connection.',
            ].map(item => <BulletItem key={item} text={item} color="green" />)}
          </ul>
          <p className="mt-3">
            MediaProc works on Windows, macOS, Linux, Android, and iOS — any device with a browser.
          </p>
        </Section>

        {/* ── Section 3 ── */}
        <Section title="Step-by-Step: How to Download a YouTube Video">
          <h3 className="font-bold text-gray-900 mb-3 text-base">Step 1 — Find Your Video and Copy the URL</h3>
          <p>
            Open YouTube in your browser and navigate to the video you want to download. Click on the
            address bar and copy the full URL. It will look something like:
          </p>
          <code className="block bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 mt-2 mb-4 font-mono">
            https://www.youtube.com/watch?v=dQw4w9WgXcQ
          </code>
          <p>
            For YouTube Shorts, the URL format is slightly different but works exactly the same way:
          </p>
          <code className="block bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 mt-2 mb-6 font-mono">
            https://www.youtube.com/shorts/AbCdEfGhIjK
          </code>

          <h3 className="font-bold text-gray-900 mb-3 text-base">Step 2 — Go to MediaProc and Paste the URL</h3>
          <p>
            Navigate to <Link href="/youtube-video-download" className="text-blue-600 hover:underline">
              MediaProc's YouTube downloader
            </Link>. You will see a large input box at the top of the page. Click inside it, paste
            your copied YouTube URL, and then click the <strong>Analyse</strong> or{' '}
            <strong>Get Video</strong> button.
          </p>
          <p className="mt-3">
            Within a few seconds, MediaProc will display all the available download formats for
            that video, including various video resolutions and an audio-only option.
          </p>

          <h3 className="font-bold text-gray-900 mb-3 mt-6 text-base">Step 3 — Choose Your Format and Download</h3>
          <p>
            Select the quality that best suits your needs. Here is a quick guide to help you choose:
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {['Format', 'Resolution', 'Best For'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {[
                  ['4K MP4',   '3840×2160', 'Large screens, TV viewing'],
                  ['1080p MP4','1920×1080', 'Desktop and laptop viewing'],
                  ['720p MP4', '1280×720',  'Mobile and tablet viewing'],
                  ['480p MP4', '854×480',   'Low storage, slow connections'],
                  ['360p MP4', '640×360',   'Minimal storage devices'],
                  ['MP3 Audio','Audio only', 'Music, podcasts, lectures'],
                ].map(([fmt, res, use]) => (
                  <tr key={fmt} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{fmt}</td>
                    <td className="px-4 py-3 text-gray-600">{res}</td>
                    <td className="px-4 py-3 text-gray-600">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            Once you have selected your preferred format, click the <strong>Download</strong> button.
            Your browser will either automatically save the file or prompt you with a Save As dialog.
          </p>
        </Section>

        {/* ── Section 4 ── */}
        <Section title="Downloading YouTube Playlists and Shorts">
          <h3 className="font-bold text-gray-900 mb-2 text-base">YouTube Shorts</h3>
          <p>
            Downloading YouTube Shorts works exactly the same as downloading a regular video. Simply
            copy the Shorts URL (it begins with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">youtube.com/shorts/</code>),
            paste it into MediaProc, and follow the same steps above.
          </p>

          <h3 className="font-bold text-gray-900 mb-2 mt-5 text-base">Downloading on Mobile</h3>
          <p>
            MediaProc works seamlessly on mobile browsers. Open the YouTube app, tap Share on any
            video, then tap <strong>Copy Link</strong>. Open your mobile browser, go to MediaProc's
            YouTube downloader page, paste the link, and download directly to your phone's storage.
          </p>
        </Section>

        {/* ── Section 5 ── */}
        <Section title="Frequently Asked Questions">
          {[
            ['Is it legal to download YouTube videos?',
             'Downloading YouTube videos for personal, offline viewing is a legal grey area in many jurisdictions. YouTube\'s Terms of Service prohibit downloading without explicit permission. Always respect copyright law and only download content you have the right to use. Never redistribute or monetise downloaded content without permission from the rights holder.'],
            ['Does MediaProc require an account or software?',
             'No. MediaProc is entirely browser-based. No account, no software, and no browser extension is required. Simply visit the website, paste your URL, and download.'],
            ['Does MediaProc store the videos I download?',
             'No. Videos are processed transiently on our servers and delivered directly to your browser. Once the transfer is complete, no copy remains on our infrastructure.'],
            ['Why is my video taking a long time?',
             'Very high-resolution videos (4K, 1080p) or long-form content (over 60 minutes) may take longer to process. This is normal. The processing time depends on the video length, quality, and current server load.'],
            ['Can I download age-restricted YouTube videos?',
             'MediaProc can only process videos that are publicly accessible. Age-restricted or private videos cannot be downloaded through our service.'],
          ].map(([q, a]) => (
            <details key={q as string} className="border border-gray-200 rounded-xl p-4 mb-3 bg-white group">
              <summary className="font-semibold text-gray-800 cursor-pointer list-none flex justify-between">
                {q as string}
                <span className="text-gray-400 ml-2 shrink-0 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{a as string}</p>
            </details>
          ))}
        </Section>

        {/* CTA bottom */}
        <CtaBanner />

        {/* Related posts */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Related Guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/blog/how-to-download-instagram-reels"
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition">
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">Instagram</span>
              <p className="mt-2 text-sm font-bold text-gray-800">How to Download Instagram Reels Without Watermark</p>
            </Link>
            <Link href="/blog/how-to-download-facebook-videos"
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Facebook</span>
              <p className="mt-2 text-sm font-bold text-gray-800">How to Download Facebook Videos in HD Quality</p>
            </Link>
          </div>
        </div>

        {/* Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Download YouTube Videos for Free',
          description: 'Step-by-step guide to downloading YouTube videos using MediaProc.',
          step: [
            { '@type': 'HowToStep', name: 'Copy the YouTube URL', text: 'Go to the YouTube video, copy the URL from the address bar.' },
            { '@type': 'HowToStep', name: 'Paste into MediaProc', text: 'Paste the URL into MediaProc\'s YouTube downloader and click Analyse.' },
            { '@type': 'HowToStep', name: 'Choose format and download', text: 'Select your preferred quality and click Download.' },
          ],
        })}} />

      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-extrabold text-gray-900 mb-4 tracking-tight">{title}</h2>
      <div className="text-gray-600 leading-relaxed text-sm space-y-1">{children}</div>
    </section>
  );
}

function BulletItem({ text, color = 'blue' }: { text: string; color?: string }) {
  const dot = color === 'green' ? 'text-green-500' : 'text-blue-500';
  return (
    <li className="flex gap-2 text-sm text-gray-700">
      <span className={`${dot} shrink-0`}>▸</span> {text}
    </li>
  );
}

function CtaBanner() {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold text-gray-900 mb-1">Ready to download your YouTube video?</p>
        <p className="text-sm text-gray-500">Free, fast, no sign-up required. Works on any device.</p>
      </div>
      <Link href="/youtube-video-download"
        className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
        Download YouTube Video →
      </Link>
    </div>
  );
}
