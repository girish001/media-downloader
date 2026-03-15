import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DMCA & Copyright Disclaimer — MediaProc',
  description:
    'MediaProc does not host copyrighted content. Learn about our DMCA policy, user responsibilities, and how copyright owners can submit takedown notices.',
  alternates: { canonical: '/dmca' },
};

export default function DmcaPage() {
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
            DMCA &amp; Copyright<br />Disclaimer
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            MediaProc takes intellectual property rights seriously. This page outlines our position on
            copyright, user responsibilities, and how rights holders can reach us.
          </p>
          <p className="text-xs text-gray-400 mt-3">Last Updated: 2025</p>
        </div>

        <Section title="No Hosted Copyrighted Content">
          <p>
            MediaProc does <strong>not</strong> host, store, upload, distribute, or permanently cache any
            video content on its servers. Our service functions as a technical intermediary — it processes
            a user-supplied URL in real time and facilitates the user's direct access to a publicly
            available media stream.
          </p>
          <p className="mt-3">
            All video content accessed through our tool originates from, and remains subject to the terms
            of, the respective source platform (e.g., YouTube, Instagram, Facebook). MediaProc has no
            affiliation with, nor is it endorsed by, any of these platforms.
          </p>
        </Section>

        <Section title="User Responsibility">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4 text-sm text-amber-800">
            <strong>Important:</strong> By using MediaProc, you acknowledge that you are solely responsible
            for how you access, download, and use any content obtained through this service.
          </div>
          <p className="mb-3">Users are expected to:</p>
          <ul className="space-y-2 text-sm">
            {[
              'Only download content they have the legal right to access and use.',
              'Comply with the Terms of Service of the original platform from which content originates.',
              'Use downloaded content for personal, non-commercial purposes only, in accordance with applicable copyright law and the principle of fair use.',
              'Refrain from redistributing, republishing, reselling, or publicly displaying downloaded content without the express permission of the original rights holder.',
            ].map(item => (
              <li key={item} className="flex gap-2">
                <span className="text-blue-500 shrink-0">▸</span> {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Fair Use & Personal Use">
          <p>
            MediaProc is designed and intended solely as a personal-use utility. Examples of acceptable
            use include saving a tutorial for offline viewing on a flight, archiving a video you created
            yourself, or keeping a personal copy of freely licensed or public-domain content.
          </p>
          <p className="mt-3">
            We do not endorse, facilitate, or condone the use of our tool for copyright infringement,
            mass downloading, commercial exploitation of third-party content, or any activity that
            violates applicable law.
          </p>
        </Section>

        <Section title="DMCA Takedown Notices">
          <p className="mb-4">
            Although MediaProc does not store video content, we take intellectual property concerns
            seriously and will investigate all credible reports of misuse. If you are a copyright owner
            or an authorised representative and believe your work is being accessed or used in an
            infringing manner, please contact us at:
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-start gap-4 mb-6">
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-xl shrink-0">📩</div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">DMCA Contact</div>
              <a href="mailto:crgr200@gmail.com" className="font-bold text-blue-600 hover:underline">
                crgr200@gmail.com
              </a>
              <p className="text-sm text-gray-500 mt-1">
                Please use the subject line: <em>"DMCA Notice – [Your Content / Platform]"</em>
              </p>
            </div>
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Your Notice Should Include</h3>
          <ul className="space-y-2 text-sm">
            {[
              'Your full legal name and contact information (email and/or phone).',
              'A description of the copyrighted work you claim has been infringed.',
              'The specific URL or information identifying the allegedly infringing content or activity.',
              'A statement that you have a good-faith belief the use is not authorised by the copyright owner, its agent, or the law.',
              'A statement that the information in your notice is accurate, and — under penalty of perjury — that you are authorised to act on behalf of the copyright owner.',
              'Your physical or electronic signature.',
            ].map(item => (
              <li key={item} className="flex gap-2">
                <span className="text-blue-500 shrink-0">▸</span> {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Response & Remediation">
          <p>
            Upon receipt of a valid DMCA notice, we will review the claim and take appropriate action
            within a reasonable timeframe, which may include blocking access to specific URLs,
            implementing technical restrictions, or cooperating with relevant platform APIs to prevent
            further access to the reported content.
          </p>
          <p className="mt-3">
            MediaProc reserves the right to terminate or restrict access for users who are found to be
            repeat infringers.
          </p>
        </Section>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
          <strong>Disclaimer:</strong> This page does not constitute legal advice. If you have a complex
          intellectual property concern, we recommend consulting a qualified attorney.
        </div>
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
