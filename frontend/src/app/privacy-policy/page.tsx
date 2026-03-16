import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — MediaProc',
  description:
    'MediaProc Privacy Policy — we collect minimal data, never sell personal information, and use cookies only for service functionality and analytics.',
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-8">
          ← Back to MediaProc
        </Link>

        <div className="mb-10">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Legal
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            We believe in transparency. Here's exactly what data we collect, why we collect it, and
            what we do with it.
          </p>
          <p className="text-xs text-gray-400 mt-3">Last Updated: 2025</p>
        </div>

        {/* TL;DR */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 mb-10">
          <strong>Short version:</strong> We collect the bare minimum needed to run the service.
          We don't sell your data. We don't build profiles on you. We just help you download videos.
        </div>

        <Section title="Information We Collect">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Automatically Collected Data</h3>
          <p className="mb-3">When you use MediaProc, our servers may automatically log standard technical information, including:</p>
          <ul className="space-y-2 text-sm mb-0">
            {[
              'Your IP address (used for rate-limiting and abuse prevention only).',
              'Browser type and operating system (used for compatibility and debugging).',
              'The URLs you submit for processing (retained only for the duration of the active request; not logged permanently).',
              'Date and time of your request.',
            ].map(item => (
              <li key={item} className="flex gap-2"><span className="text-blue-500 shrink-0">▸</span> {item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Cookies & Local Storage">
          <p className="mb-3">MediaProc may use cookies or browser local storage for the following limited purposes:</p>
          <ul className="space-y-2 text-sm mb-3">
            {[
              ['Session management', 'to maintain your preferences during a browsing session (e.g., preferred download format).'],
              ['Security tokens', 'to protect against cross-site request forgery (CSRF) attacks.'],
              ['Performance optimisation', 'to cache static assets and reduce load times.'],
            ].map(([k, v]) => (
              <li key={k as string} className="flex gap-2"><span className="text-blue-500 shrink-0">▸</span> <span><strong>{k as string}</strong> — {v as string}</span></li>
            ))}
          </ul>
          <p>
            We do <strong>not</strong> use cookies to track you across third-party websites, build
            advertising profiles, or identify you personally.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            We may use privacy-focused, aggregated analytics tools to understand how our service is
            being used — for example, which features are most popular, average session duration, and
            error rates. This data is anonymised and used solely to improve the quality and reliability
            of MediaProc.
          </p>
          <p className="mt-3">
            Analytics data is never linked to your identity, sold, or shared with third-party
            advertising networks.
          </p>
        </Section>

        <Section title="How We Use Your Data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '⚙️', title: 'Service Operation', desc: 'Processing your download requests and delivering files to your browser.' },
              { icon: '🛡️', title: 'Abuse Prevention', desc: 'Rate limiting and blocking malicious or automated traffic.' },
              { icon: '📊', title: 'Service Improvement', desc: 'Aggregated, anonymised analytics to improve features and fix bugs.' },
              { icon: '⚖️', title: 'Legal Compliance', desc: 'Responding to valid legal requests as required by applicable law.' },
            ].map(c => (
              <div key={c.title} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">{c.icon}</div>
                <div className="font-bold text-gray-800 text-sm mb-1">{c.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="What We Do Not Do">
          <ul className="space-y-2 text-sm">
            {[
              'We do not sell, rent, or trade your personal data to any third party.',
              'We do not use your data for targeted advertising.',
              'We do not permanently store the URLs you submit or the videos you download.',
              'We do not require account creation or collect email addresses for normal use.',
            ].map(item => (
              <li key={item} className="flex gap-2"><span className="text-red-400 shrink-0">✕</span> {item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Data Retention">
          <p>
            Technical logs (IP address, request timestamps) may be retained for up to 30 days for
            security and debugging purposes, after which they are permanently deleted. URLs submitted
            for processing are discarded immediately upon completion of the download request.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>
            MediaProc may interact with third-party platforms (e.g., YouTube, Instagram) solely to
            fulfil your download request. We do not control, and are not responsible for, the privacy
            practices of those platforms. Please review their respective privacy policies for more
            information.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices
            or for legal reasons. Any updates will be posted on this page with a revised date. We
            encourage you to review this page periodically.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have any questions or concerns about this Privacy Policy or how your data is
            handled, please email us at{' '}
            <a href="mailto:crgr200@gmail.com" className="text-blue-600 hover:underline font-medium">
              crgr200@gmail.com
            </a>.
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
