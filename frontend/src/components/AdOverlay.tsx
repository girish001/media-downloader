'use client';
/**
 * components/AdOverlay.tsx
 * ─────────────────────────
 * Pre-download interstitial ad modal.
 *
 * Usage:
 *   <AdOverlay
 *     isOpen={showAd}
 *     onComplete={() => { setShowAd(false); startDownload(); }}
 *   />
 */

import { useEffect, useState, useCallback } from 'react';
import { adsConfig } from '@/config/ads';

interface Props {
  isOpen: boolean;
  onComplete: () => void;
}

export default function AdOverlay({ isOpen, onComplete }: Props) {
  const delay = adsConfig.interstitialDelay;
  const [secondsLeft, setSecondsLeft] = useState(delay);
  const [canSkip, setCanSkip]         = useState(false);

  // Reset and start countdown whenever the overlay opens
  useEffect(() => {
    if (!isOpen) return;

    setSecondsLeft(delay);
    setCanSkip(false);

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, delay]);

  const handleSkip = useCallback(() => {
    if (!canSkip) return;
    onComplete();
  }, [canSkip, onComplete]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Ad label bar */}
        <div className="bg-gray-100 border-b border-gray-200 px-5 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Advertisement</span>
          {/* Countdown pill */}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
            canSkip ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {canSkip ? 'Ad complete' : `${secondsLeft}s`}
          </span>
        </div>

        {/* Ad creative area */}
        <div className="flex items-center justify-center bg-gray-50 min-h-[250px] px-8 py-10">
          <div className="text-center space-y-4">
            {/* Placeholder — replace with real ad tag for your network */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto shadow-lg">
              <span className="text-white text-3xl">📢</span>
            </div>
            <p className="text-gray-700 font-semibold text-lg">Your ad could be here</p>
            <p className="text-gray-400 text-sm max-w-xs">
              Configure your ad network in{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">frontend/src/config/ads.ts</code>
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-1.5 mt-4">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${((delay - secondsLeft) / delay) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between bg-white border-t border-gray-100">
          <p className="text-xs text-gray-400">Please wait while your download prepares…</p>

          <button
            onClick={handleSkip}
            disabled={!canSkip}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              canSkip
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canSkip ? '⏭ Skip Ad' : `Skip in ${secondsLeft}s`}
          </button>
        </div>
      </div>
    </div>
  );
}
