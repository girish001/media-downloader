import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — MediaProc',
  description:
    'MediaProc Terms of Service — users must comply with platform terms, use the tool responsibly, and accept that the service is provided as-is. Read the full terms here.',
  alternates: { canonical: '/terms-of-service' },
};

const TERMS = [
  {
    num: '1',
    title: 'Acceptance of Terms',
    body: (
      <>
        <p>
          By accessing or using MediaProc (the "Service"), you confirm that you have read, understood,
          and agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and our DMCA
          &amp; Copyright Disclaimer. If you do not agree to these Terms, you must not use the Service.
        </p>
        <p className="mt-3">
          We reserve the right to update these Terms at any time. Continued use of the Service after
          changes are posted constitutes your acceptance of the revised Terms.
        </p>
      </>
    ),
  },
  {
    num: '2',
    title: 'Description of Service',
    body: (
      <>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-blue-800 mb-3">
          <strong>MediaProc is a tool, not a content provider.</strong> We do not produce, curate,
          host, or endorse any video content processed through the Service. Responsibility for
          content choices lies solely with the user.
        </div>
        <p>
          MediaProc is a free online tool that provides a technical interface for downloading publicly
          accessible video content from supported platforms. The Service is provided{' '}
          <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind,
          either express or implied.
        </p>
      </>
    ),
  },
  {
    num: '3',
    title: 'Permitted Use',
    body: (
      <>
        <p className="mb-3">You may use MediaProc only for lawful purposes and in accordance with these Terms. Permitted uses include:</p>
        <ul className="space-y-2 text-sm">
          {[
            'Personal, non-commercial offline viewing of publicly available content.',
            'Content for which you have the legal right to download and retain a copy.',
            'Content that is in the public domain or covered by a permissive licence (e.g., Creative Commons).',
            'Your own original content that you are retrieving from a platform for archival purposes.',
          ].map(item => (
            <li key={item} className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> {item}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: '4',
    title: 'Compliance with Platform Terms',
    body: (
      <>
        <p className="mb-3">
          You acknowledge that the platforms from which content originates each have their own Terms
          of Service. By using MediaProc, you agree that:
        </p>
        <ul className="space-y-2 text-sm">
          {[
            'You will review and comply with the Terms of Service of each originating platform.',
            'MediaProc is not affiliated with, endorsed by, or authorised by any of these platforms.',
            "Downloading content in violation of a platform's Terms of Service is your sole responsibility.",
            'Certain platforms expressly prohibit downloading. It is your duty to verify the rules of each platform before proceeding.',
          ].map(item => (
            <li key={item} className="flex gap-2"><span className="text-blue-500 shrink-0">▸</span> {item}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: '5',
    title: 'Prohibited Activities',
    body: (
      <>
        <p className="mb-3">You agree that you will <strong>not</strong> use the Service to:</p>
        <ul className="space-y-2 text-sm">
          {[
            "Download, reproduce, or distribute copyrighted content without the rights holder's permission.",
            'Circumvent, disable, or otherwise interfere with security features of the Service or any source platform.',
            'Use automated bots, scrapers, or scripts to make bulk requests to the Service.',
            'Use the Service for commercial purposes, including reselling downloaded content.',
            'Engage in any activity that is illegal, harmful, or violates the rights of any third party.',
            'Attempt to overload, attack, or compromise the technical infrastructure of the Service.',
          ].map(item => (
            <li key={item} className="flex gap-2"><span className="text-red-400 shrink-0">✕</span> {item}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: '6',
    title: 'Disclaimer of Warranties',
    body: (
      <>
        <p className="mb-3">MediaProc is provided without warranty of any kind. We do not guarantee that:</p>
        <ul className="space-y-2 text-sm mb-3">
          {[
            'The Service will be available, uninterrupted, or error-free at all times.',
            'All platforms or URLs will be supported at any given time.',
            'Downloaded files will be free from technical defects or corruption.',
            'The Service will meet your specific requirements or expectations.',
          ].map(item => (
            <li key={item} className="flex gap-2"><span className="text-blue-500 shrink-0">▸</span> {item}</li>
          ))}
        </ul>
        <p>
          We reserve the right to modify, suspend, or discontinue the Service — in whole or in part —
          at any time, with or without notice, for any reason including technical maintenance, legal
          requirements, or business decisions.
        </p>
      </>
    ),
  },
  {
    num: '7',
    title: 'Limitation of Liability',
    body: (
      <p>
        To the maximum extent permitted by applicable law, MediaProc and its operators shall not be
        liable for any direct, indirect, incidental, special, or consequential damages arising out of
        or in connection with your use of — or inability to use — the Service, including but not
        limited to damages for loss of data, loss of profits, or business interruption.
      </p>
    ),
  },
  {
    num: '8',
    title: 'User Responsibility',
    body: (
      <>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-800 mb-3">
          <strong>You are solely responsible for your actions.</strong> MediaProc is a neutral tool.
          Any consequences — legal, financial, or otherwise — arising from your use of downloaded
          content are your responsibility alone.
        </div>
        <p>
          You agree to indemnify and hold harmless MediaProc and its operators from any claim, loss,
          or damage arising from your breach of these Terms or your unlawful use of the Service.
        </p>
      </>
    ),
  },
  {
    num: '9',
    title: 'Intellectual Property',
    body: (
      <p>
        The MediaProc interface, design, codebase, and brand elements are the intellectual property
        of their respective owners. You may not copy, reproduce, or repurpose any part of the Service
        interface without explicit written permission.
      </p>
    ),
  },
  {
    num: '10',
    title: 'Contact',
    body: (
      <p>
        Questions about these Terms? Contact us at{' '}
        <a href="mailto:crgr200@gmail.com" className="text-blue-600 hover:underline font-medium">
          crgr200@gmail.com
        </a>. We're happy to clarify anything.
      </p>
    ),
  },
];

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            By using MediaProc, you agree to the following terms. Please read them carefully before
            using the service.
          </p>
          <p className="text-xs text-gray-400 mt-3">Last Updated: 2025</p>
        </div>

        <div className="space-y-8">
          {TERMS.map(t => (
            <div key={t.num} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-gray-900 mb-3 tracking-tight flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                  {t.num}
                </span>
                {t.title}
              </h2>
              <div className="text-gray-600 leading-relaxed text-sm">{t.body}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
