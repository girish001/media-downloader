'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'mediaproc_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setVisible(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — don't show banner
    }
  }, []);

  function handleAccept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch {}
    setVisible(false);
  }

  function handleDecline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-4xl bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4">
        {/* Icon */}
        <span className="text-2xl shrink-0 hidden sm:block">🍪</span>

        {/* Message */}
        <p className="flex-1 text-sm text-gray-300 leading-relaxed">
          This website uses cookies to improve your experience and analyse site traffic.
          By clicking <strong className="text-white">Accept</strong>, you agree to our use of cookies.
          Read our{' '}
          <Link href="/privacy-policy" className="text-blue-400 hover:underline">
            Privacy Policy
          </Link>{' '}
          for more details.
        </p>

        {/* Buttons */}
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleDecline}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
