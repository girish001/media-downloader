import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Download Facebook Videos in HD Quality (2025)',
  description:
    'Download any public Facebook video to your phone or computer in HD or SD quality — fast, free, and without logging in. Step-by-step guide.',
  alternates: { canonical: '/blog/how-to-download-facebook-videos' },
  openGraph: {
    title:       'How to Download Facebook Videos in HD Quality',
    description: 'Free step-by-step guide to saving Facebook videos to your device in HD.',
    url:         '/blog/how-to-download-facebook-videos',
    type:        'article',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'How to Download Facebook Videos in HD Quality',
    description: 'Save any public Facebook video to your phone or PC — fast and free.',
  },
};

export default function HowToDownloadFacebook() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <article className="max-w-3xl mx-auto">

        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-8">
          ← Back to Blog
        </Link>

        <div className="flex items-center gap-3 mb-5">
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">Facebook</span>
          <span className="text-xs text-gray-400">January 2025 · 5 min read</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-5">
          How to Download Facebook Videos in HD Quality
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-10">
          Facebook hosts billions of videos — from funny clips and live streams to news highlights
          and family memories. While Facebook makes it easy to watch videos in the app, there is no
          built-in way to save them to your device. This guide shows you how to download any public
          Facebook video for free in HD or SD quality using MediaProc.
        </p>

        <CtaBanner />

        <Section title="Why Download Facebook Videos?">
          <p>
            There are plenty of legitimate reasons you might want to save a Facebook video locally:
          </p>
          <ul className="mt-3 space-y-2">
            {[
              'Saving a family member\'s video before it gets accidentally deleted.',
              'Watching a live stream replay or event recording offline.',
              'Keeping a backup of your own Facebook videos on your device.',
              'Saving a tutorial or how-to video from a Facebook group for offline reference.',
              'Watching content on your TV or a device without a Facebook app.',
            ].map(item => <BulletItem key={item} text={item} />)}
          </ul>
          <p className="mt-3">
            As with all platforms, only download content you are legally permitted to save and use.
            Respect the privacy of individuals whose videos you download, and never redistribute
            content without the creator's permission.
          </p>
        </Section>

        <Section title="Step-by-Step: How to Download a Facebook Video">
          <h3 className="font-bold text-gray-900 mb-3 text-base">Step 1 — Get the Facebook Video URL</h3>
          <p>
            Finding the URL of a Facebook video is slightly different depending on how you are
            accessing Facebook:
          </p>

          <div className="mt-3 space-y-4">
            <div className="bg-gray-100 rounded-xl px-5 py-4">
              <p className="font-semibold text-gray-800 text-sm mb-2">On Desktop (Facebook.com)</p>
              <ol className="space-y-1 text-sm text-gray-700 list-decimal list-inside">
                <li>Click on the video to open it in full-screen or its own page.</li>
                <li>Copy the URL from your browser's address bar.</li>
              </ol>
            </div>
            <div className="bg-gray-100 rounded-xl px-5 py-4">
              <p className="font-semibold text-gray-800 text-sm mb-2">On Mobile (Facebook App)</p>
              <ol className="space-y-1 text-sm text-gray-700 list-decimal list-inside">
                <li>Tap the three-dot menu (⋯) on the video post.</li>
                <li>Select <strong>Copy Link</strong> from the menu.</li>
              </ol>
            </div>
          </div>

          <p className="mt-4">A Facebook video URL typically looks like one of these:</p>
          <code className="block bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 mt-2 mb-2 font-mono">
            https://www.facebook.com/username/videos/1234567890/
          </code>
          <code className="block bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 mb-6 font-mono">
            https://www.facebook.com/watch/?v=1234567890
          </code>

          <h3 className="font-bold text-gray-900 mb-3 text-base">Step 2 — Open MediaProc's Facebook Downloader</h3>
          <p>
            Go to{' '}
            <Link href="/facebook-video-download" className="text-blue-600 hover:underline">
              MediaProc's Facebook video downloader
            </Link>{' '}
            in your browser. Paste the Facebook video URL into the input field and click the
            Download or Analyse button.
          </p>

          <h3 className="font-bold text-gray-900 mb-3 mt-6 text-base">Step 3 — Choose HD or SD and Save</h3>
          <p>
            MediaProc will show you the available download options for the video. Facebook typically
            provides two quality levels:
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {['Quality', 'Description', 'Best For'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {[
                  ['HD (High Definition)', '720p or 1080p — original upload quality', 'Desktop, TV, best clarity'],
                  ['SD (Standard Definition)', '480p or lower — compressed version',  'Mobile, saving storage space'],
                ].map(([q, d, u]) => (
                  <tr key={q as string} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{q as string}</td>
                    <td className="px-4 py-3 text-gray-600">{d as string}</td>
                    <td className="px-4 py-3 text-gray-600">{u as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            Select your preferred quality and click <strong>Download</strong>. The file will be saved
            to your device's Downloads folder automatically.
          </p>
        </Section>

        <Section title="Downloading Facebook Videos on Mobile">
          <h3 className="font-bold text-gray-900 mb-2 text-base">Android</h3>
          <p>
            On Android, open your Chrome browser, navigate to MediaProc's Facebook downloader,
            paste the video link, and tap Download. Chrome will save the file to your device's
            Downloads folder, accessible from your Files app or Gallery.
          </p>

          <h3 className="font-bold text-gray-900 mb-2 mt-4 text-base">iPhone / iOS</h3>
          <p>
            On iPhone, use Safari. After MediaProc processes the URL and presents the download link,
            tap and hold the Download button and select <strong>Download Linked File</strong>. The
            video will be saved to the Files app under the Downloads folder.
          </p>
        </Section>

        <Section title="Common Issues and How to Fix Them">
          {[
            ['The video says it is not available',
             'This usually means the video is from a private Facebook profile or group, or has been restricted to specific audiences. MediaProc can only download publicly accessible videos.'],
            ['The download link does not work',
             'Facebook occasionally changes its video URL structure. Make sure you are copying the direct video link and not a Facebook Watch Party or Live stream link. Try right-clicking the video on desktop and selecting "Show video URL".'],
            ['The video downloaded but has no audio',
             'This can happen with live stream replays. Try selecting a different quality option — the SD version often has audio when the HD version does not, and vice versa.'],
            ['The video quality is lower than expected',
             'The maximum quality available depends on what the original uploader posted. If a video was uploaded in SD, MediaProc cannot upscale it to HD.'],
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

        <Section title="Frequently Asked Questions">
          {[
            ['Do I need to be logged into Facebook to download videos?',
             'No. MediaProc does not require your Facebook login credentials at any point. It only processes the public URL you provide. For private videos, you would need to be the video owner to access them.'],
            ['Does MediaProc store Facebook videos on its servers?',
             'No. Videos are processed transiently and delivered directly to your browser. Once your download is complete, no copy of the video remains on MediaProc\'s servers.'],
            ['Can I download Facebook Live videos?',
             'Yes — but only after the live stream has ended and Facebook has processed the replay. Live streams in progress cannot be downloaded.'],
            ['Is there a file size limit?',
             'MediaProc does not impose an artificial file size limit. However, very large files or long videos may take more time to process. Extremely long recordings (over 2 hours) may occasionally time out.'],
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

        <CtaBanner />

        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Related Guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/blog/how-to-download-youtube-videos"
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">YouTube</span>
              <p className="mt-2 text-sm font-bold text-gray-800">How to Download YouTube Videos for Free in 2025</p>
            </Link>
            <Link href="/blog/how-to-download-instagram-reels"
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition">
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">Instagram</span>
              <p className="mt-2 text-sm font-bold text-gray-800">How to Download Instagram Reels Without Watermark</p>
            </Link>
          </div>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Download Facebook Videos in HD Quality',
          description: 'Step-by-step guide to saving Facebook videos using MediaProc.',
          step: [
            { '@type': 'HowToStep', name: 'Get the Facebook video URL', text: 'Click the three-dot menu on the video post and select Copy Link.' },
            { '@type': 'HowToStep', name: 'Paste into MediaProc', text: 'Open MediaProc\'s Facebook downloader and paste the video URL.' },
            { '@type': 'HowToStep', name: 'Choose quality and download', text: 'Select HD or SD quality and click Download to save the video.' },
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

function BulletItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2 text-sm text-gray-700">
      <span className="text-blue-500 shrink-0">▸</span> {text}
    </li>
  );
}

function CtaBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold text-gray-900 mb-1">Ready to download your Facebook video?</p>
        <p className="text-sm text-gray-500">HD quality, free, no login required.</p>
      </div>
      <Link href="/facebook-video-download"
        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
        Download Facebook Video →
      </Link>
    </div>
  );
}
