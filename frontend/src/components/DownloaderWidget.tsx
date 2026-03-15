'use client';
/**
 * components/DownloaderWidget.tsx
 * ────────────────────────────────
 * Shared download form used by all platform landing pages.
 * Flow: URL input → parse → format select → [Ad Overlay] → download → poll status → auto-download.
 *
 * FIXES:
 *  1. Progress reset loop — lastProgressRef tracks highest seen progress;
 *     only forward progress is applied. Eliminates 5%→90%→5% flicker.
 *  2. autoDownloadRef reset — only reset on explicit reset(), not on status change.
 *     Prevents double-trigger and missed trigger races.
 *  3. Stale closure in handleAdComplete — pendingDownloadRef stores
 *     url+format at click time; startDownload reads from ref, not closure.
 *  4. Direct download — signed S3 URL is used directly via <a download> trigger.
 *     No blob fetch through Next.js (avoids bandwidth doubling + CORS issues).
 *     Blob fetch is kept as fallback for browsers that block cross-origin downloads.
 *  5. Backoff polling — starts at 2s, backs off to 5s after 10 polls.
 *     Reduces unnecessary requests for long jobs.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AdOverlay from './AdOverlay';
import { adsConfig } from '@/config/ads';

type AccentColor = 'red' | 'pink' | 'blue' | 'green';

interface FormatOption {
  id:       string;
  label:    string;
  ext:      string;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface ParseResult {
  title:    string;
  platform: string;
  thumbnail?: string;
  duration?: number;
  formats:  FormatOption[];
}

interface Props {
  platform:    string;
  placeholder: string;
  accentColor: AccentColor;
}

const ACCENT: Record<AccentColor, { btn: string; ring: string; badge: string }> = {
  red:   { btn: 'bg-red-600 hover:bg-red-700',     ring: 'focus:ring-red-500',   badge: 'bg-red-100 text-red-700'   },
  pink:  { btn: 'bg-pink-600 hover:bg-pink-700',   ring: 'focus:ring-pink-500',  badge: 'bg-pink-100 text-pink-700' },
  blue:  { btn: 'bg-blue-600 hover:bg-blue-700',   ring: 'focus:ring-blue-500',  badge: 'bg-blue-100 text-blue-700' },
  green: { btn: 'bg-green-600 hover:bg-green-700', ring: 'focus:ring-green-500', badge: 'bg-green-100 text-green-700' },
};

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Trigger a browser file download.
 *
 * Strategy 1 (BEST): /api/download-file/:jobId proxy route.
 *   Backend fetches from S3 server-side and streams back with
 *   Content-Disposition: attachment. Same-origin → always downloads.
 *   No CORS issues, works on all browsers including mobile.
 *
 * Strategy 2: Direct signed S3 URL via <a download>.
 *   Works when S3 CORS is configured. Zero extra bandwidth.
 *
 * Strategy 3: Blob fetch + object URL.
 *   Fallback for browsers blocking cross-origin download attribute.
 *
 * Strategy 4: window.open — last resort.
 */
async function triggerDownload(downloadUrl: string, jobId?: string): Promise<void> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Extract filename from URL path
  let filename = 'download';
  try {
    const rawPath = new URL(downloadUrl).pathname;
    const last = rawPath.split('/').pop()?.split('?')[0];
    if (last) filename = decodeURIComponent(last);
  } catch { /* keep default */ }

  // Strategy 1: Backend proxy (CORS-safe, Content-Disposition: attachment)
  if (jobId) {
    try {
      const proxyUrl = `${API_BASE}/download-file/${jobId}`;
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.download = filename;
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } catch { /* fall through */ }
  }

  // Strategy 2: Direct signed URL anchor
  try {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    await new Promise(r => setTimeout(r, 1500));
    return;
  } catch { /* fall through */ }

  // Strategy 3: Blob fetch + object URL
  try {
    const resp = await fetch(jobId ? `${API_BASE}/download-file/${jobId}` : downloadUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    return;
  } catch { /* fall through */ }

  // Strategy 4: Open in new tab
  window.open(downloadUrl, '_blank', 'noopener,noreferrer');
}

export default function DownloaderWidget({ platform, placeholder, accentColor }: Props) {
  const colors = ACCENT[accentColor];

  const [url,         setUrl]         = useState('');
  const [parsed,      setParsed]      = useState<ParseResult | null>(null);
  const [format,      setFormat]      = useState('');
  const [status,      setStatus]      = useState<'idle' | 'parsing' | 'queued' | 'processing' | 'done' | 'error'>('idle');
  const [progress,    setProgress]    = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [jobId,       setJobId]       = useState('');
  const [error,       setError]       = useState('');
  const [showAd,      setShowAd]      = useState(false);

  // FIX: Store url+format at click time so startDownload never uses stale closure values
  const pendingDownloadRef = useRef<{ url: string; format: string } | null>(null);

  // FIX: Only allow forward progress — prevents 5%→90%→5% reset loop
  const lastProgressRef  = useRef(0);

  // FIX: Only reset autoDownload flag on explicit reset(), not status changes
  const autoDownloadRef  = useRef(false);

  // Poll interval reference
  const pollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef     = useRef(0);

  // ── 1. Parse URL ─────────────────────────────────────────────────
  const handleParse = useCallback(async () => {
    if (!url.trim()) return;
    setStatus('parsing');
    setError('');
    setParsed(null);

    try {
      const res = await fetch(`${API}/parse`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? 'Failed to parse URL');
      }
      const data = await res.json() as ParseResult;
      setParsed(data);
      setFormat(data.formats[0]?.id ?? '');
      setStatus('idle');
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [url]);

  // ── 2. Download click → capture params → show ad or start directly ─
  const handleDownloadClick = useCallback(() => {
    if (!url || !format) return;
    // FIX: Capture url+format NOW before showing ad — prevents stale closure
    pendingDownloadRef.current = { url: url.trim(), format };
    if (adsConfig.enableAds) {
      setShowAd(true);
    } else {
      startDownload(url.trim(), format);
    }
  }, [url, format]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Actual download job enqueue ───────────────────────────────
  const startDownload = useCallback(async (downloadUrl: string, downloadFormat: string) => {
    setStatus('queued');
    setProgress(0);
    lastProgressRef.current = 0;  // FIX: reset forward-progress guard
    setDownloadUrl('');
    setJobId('');
    setError('');
    autoDownloadRef.current = false;

    try {
      const res = await fetch(`${API}/download`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: downloadUrl, format: downloadFormat }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? 'Download request failed');
      }
      const { jobId } = await res.json() as { jobId: string };
      pollCountRef.current = 0;
      pollStatus(jobId);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when ad countdown finishes and user clicks Skip
  // FIX: Reads from pendingDownloadRef — not a stale closure
  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    const pending = pendingDownloadRef.current;
    if (pending) {
      startDownload(pending.url, pending.format);
    }
  }, [startDownload]);

  // ── 4. Poll job status ────────────────────────────────────────────
  const pollStatus = useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const tick = async () => {
      try {
        const res  = await fetch(`${API}/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json() as {
          status: string;
          progress: number;
          downloadUrl?: string;
          error?: string;
        };

        pollCountRef.current += 1;

        if (data.status === 'processing' || data.status === 'queued') {
          setStatus('processing');
          // FIX: Only allow forward progress — no resets
          const newProgress = data.progress ?? 0;
          if (newProgress > lastProgressRef.current) {
            lastProgressRef.current = newProgress;
            setProgress(newProgress);
          }

          // FIX: Backoff after 10 polls (20s) — reschedule with longer interval
          if (pollCountRef.current === 10) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = setInterval(tick, 5000); // 5s after 20s
          }

        } else if (data.status === 'completed') {
          clearInterval(pollIntervalRef.current!);
          setProgress(100);
          setDownloadUrl(data.downloadUrl ?? '');
          setJobId(jobId);
          setStatus('done');

        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current!);
          setError(data.error ?? 'Processing failed');
          setStatus('error');
        }
      } catch {
        clearInterval(pollIntervalRef.current!);
        setError('Lost connection to server.');
        setStatus('error');
      }
    };

    // Start at 2s interval
    pollIntervalRef.current = setInterval(tick, 2000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── 5. Auto-download when job completes ──────────────────────────
  // FIX: autoDownloadRef only resets in reset() — no status-change watcher
  useEffect(() => {
    if (status !== 'done' || !downloadUrl || autoDownloadRef.current) return;
    autoDownloadRef.current = true;
    triggerDownload(downloadUrl, jobId);
  }, [status, downloadUrl]);

  // ── Reset everything ─────────────────────────────────────────────
  const reset = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setUrl('');
    setParsed(null);
    setFormat('');
    setStatus('idle');
    setProgress(0);
    lastProgressRef.current  = 0;
    setJobId('');
    setDownloadUrl('');
    setError('');
    setShowAd(false);
    autoDownloadRef.current  = false;   // FIX: only reset here
    pendingDownloadRef.current = null;
    pollCountRef.current = 0;
  };

  // Progress bar color class (first color token from btn)
  const progressColor = colors.btn.split(' ')[0];

  return (
    <>
      {/* ── Ad Overlay ────────────────────────────────────────────── */}
      <AdOverlay isOpen={showAd} onComplete={handleAdComplete} />

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-2xl mx-auto">

        {/* URL input */}
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setParsed(null); setStatus('idle'); }}
            onKeyDown={e => e.key === 'Enter' && handleParse()}
            placeholder={placeholder}
            className={`flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 ${colors.ring} transition`}
          />
          <button
            onClick={handleParse}
            disabled={!url.trim() || status === 'parsing'}
            className={`${colors.btn} text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition`}
          >
            {status === 'parsing' ? '…' : 'Fetch'}
          </button>
        </div>

        {/* Error */}
        {status === 'error' && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
            <button onClick={reset} className="ml-3 underline text-red-500 text-xs">Try again</button>
          </div>
        )}

        {/* Parsed result */}
        {parsed && status === 'idle' && (
          <div className="mt-5 space-y-4">
            {/* Preview */}
            <div className="flex items-start gap-4">
              {parsed.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={parsed.thumbnail} alt="thumbnail" className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm">{parsed.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} mt-1 inline-block capitalize`}>
                  {parsed.platform}
                </span>
                {parsed.duration && (
                  <span className="text-xs text-gray-400 ml-2">
                    {Math.floor(parsed.duration / 60)}:{String(parsed.duration % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>

            {/* Format selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Select format</label>
              <div className="flex flex-wrap gap-2">
                {parsed.formats.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      format === f.id
                        ? `${colors.btn} text-white border-transparent`
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownloadClick}
              disabled={!format}
              className={`w-full ${colors.btn} text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition`}
            >
              ⬇ Download
            </button>
          </div>
        )}

        {/* Progress bar */}
        {(status === 'queued' || status === 'processing') && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{status === 'queued' ? '⏳ Queued…' : '⚙️ Processing…'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${Math.max(3, progress)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              This may take 30–120 seconds depending on video length
            </p>
          </div>
        )}

        {/* Done */}
        {status === 'done' && (
          <div className="mt-5 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
              ✅ Download started! Check your Downloads folder.
            </div>
            <div className="flex gap-2">
              {downloadUrl && (
                <button
                  onClick={() => triggerDownload(downloadUrl, jobId)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm text-center transition"
                >
                  ⬇ Click here if download didn&apos;t start
                </button>
              )}
              <button
                onClick={reset}
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                New Download
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
