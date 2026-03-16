import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us — MediaProc',
  description:
    'Contact MediaProc for support, bug reports, feedback, or DMCA and copyright concerns. Email: crgr200@gmail.com. Response within 24–48 hours.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title:       'Contact MediaProc',
    description: 'Get in touch with the MediaProc team. Email: crgr200@gmail.com.',
    url:         '/contact',
    type:        'website',
  },
  twitter: { card: 'summary', title: 'Contact MediaProc', description: 'Email: crgr200@gmail.com' },
};

const CONTACT_REASONS = [
  { icon: '🛠️', title: 'Technical Support',  desc: 'Download not working? Unsupported URL? Let us know and we will investigate promptly.' },
  { icon: '🐛', title: 'Bug Reports',         desc: 'Found something broken or unexpected? Your report helps us improve for everyone.'     },
  { icon: '💡', title: 'Feedback and Ideas',  desc: 'Feature suggestion, UI improvement, or just a kind word — we welcome it all.'         },
  { icon: '⚖️', title: 'DMCA and Copyright',  desc: 'Copyright holders can reach us here to report misuse or request content removal.'     },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-8">
          ← Back to MediaProc
        </Link>

        <div className="mb-10">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Get In Touch
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            We Are Here<br />to Help
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Have a question, spotted a bug, or need to reach us about a legal matter?
            We read every message and typically respond within 24–48 hours.
          </p>
        </div>

        {/* Email card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-10 flex items-start gap-5">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl shrink-0">
            ✉️
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Contact Email</div>
            <a
              href="mailto:crgr200@gmail.com"
              className="text-lg font-bold text-blue-600 hover:underline"
            >
              crgr200@gmail.com
            </a>
            <p className="text-sm text-gray-500 mt-1">
              For all inquiries — we typically respond within <strong>24–48 business hours</strong>.
              Complex legal matters may take up to 10 business days.
            </p>
          </div>
        </div>

        {/* Reasons */}
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 tracking-tight">What Can You Contact Us About?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {CONTACT_REASONS.map(r => (
            <div key={r.title} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-2xl mb-2">{r.icon}</div>
              <div className="font-bold text-gray-800 mb-1">{r.title}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{r.desc}</div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <h2 className="text-xl font-extrabold text-gray-900 mb-3 tracking-tight">Tips for a Faster Response</h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              'Use a descriptive subject line (e.g. "Download fails for YouTube Shorts").',
              'Include the URL that caused the issue, if applicable.',
              'For DMCA requests, review our DMCA page first and follow the required format.',
              'For feature requests, describe your use case so we can understand the context.',
              'We do not provide support for commercial use, bulk downloading, or circumventing platform restrictions.',
            ].map(tip => (
              <li key={tip} className="flex gap-2">
                <span className="text-blue-500 shrink-0">▸</span> {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <strong>Response Time:</strong> We aim to reply within <strong>24–48 hours</strong> on business days.
          Complex legal or copyright matters may take up to 10 business days. We appreciate your patience.
        </div>
      </div>
    </main>
  );
}
