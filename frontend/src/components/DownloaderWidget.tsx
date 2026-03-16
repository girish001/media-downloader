'use client';
/**
 * components/DownloaderWidget.tsx
 * ────────────────────────────────
 * Shared download form used by all platform landing pages.
 * Handles: URL input → parse → format select → [Ad Overlay] → download → poll status.
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

export default function DownloaderWidget({ platform, placeholder, accentColor }: Props) {
  const colors = ACCENT[accentColor];

  const [url,         setUrl]         = useState('');
  const [parsed,      setParsed]      = useState<ParseResult | null>(null);
  const [format,      setFormat]      = useState('');
  const [status,      setStatus]      = useState<'idle' | 'parsing' | 'queued' | 'processing' | 'done' | 'error'>('idle');
  const [progress,    setProgress]    = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error,       setError]       = useState('');

  // ── Ad overlay state ──────────────────────────────────────────────
  const [showAd, setShowAd] = useState(false);

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

  // ── 2. User clicks Download → show ad if enabled ──────────────────
  const handleDownloadClick = useCallback(() => {
    if (!url || !format) return;
    if (adsConfig.enableAds) {
      setShowAd(true);
    } else {
      startDownload();
    }
  }, [url, format]);

  // ── 3. Start the actual download job ─────────────────────────────
  const startDownload = useCallback(async () => {
    setStatus('queued');
    setProgress(0);
    setDownloadUrl('');
    setError('');

    try {
      const res = await fetch(`${API}/download`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: url.trim(), format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? 'Download request failed');
      }
      const { jobId } = await res.json() as { jobId: string };
      pollStatus(jobId);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [url, format]);

  // Called when the ad overlay countdown finishes and user clicks Skip
  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    startDownload();
  }, [startDownload]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── 4. Poll status ───────────────────────────────────────────────
  const pollStatus = useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/status/${jobId}`);
        const data = await res.json() as { status: string; progress: number; downloadUrl?: string; error?: string };

        if (data.status === 'processing' || data.status === 'queued') {
          setStatus('processing');
          setProgress(data.progress ?? 0);
        } else if (data.status === 'completed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setProgress(100);
          setDownloadUrl(data.downloadUrl ?? '');
          setStatus('done');
        } else if (data.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError(data.error ?? 'Processing failed');
          setStatus('error');
        }
      } catch {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError('Lost connection to server.');
        setStatus('error');
      }
    }, 2000);
  }, []);

  const autoDownloadRef = useRef(false);

  // ── Auto-download when processing completes ──────────────────────
  useEffect(() => {
    if (status !== 'done' || !downloadUrl || autoDownloadRef.current) return;
    autoDownloadRef.current = true;

    (async () => {
      try {
        const resp      = await fetch(downloadUrl);
        if (!resp.ok) throw new Error('fetch failed');
        const blob      = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        const rawPath   = new URL(downloadUrl).pathname;
        const filename  = rawPath.split('/').pop()?.split('?')[0] ?? 'download';
        const a = document.createElement('a');
        a.href = objectUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      } catch {
        // Blob fetch failed — the manual link below is still shown.
      }
    })();
  }, [status, downloadUrl]);

  useEffect(() => {
    if (status !== 'done') autoDownloadRef.current = false;
  }, [status]);

  const reset = () => {
    setUrl(''); setParsed(null); setFormat(''); setStatus('idle');
    setProgress(0); setDownloadUrl(''); setError(''); setShowAd(false);
  };

  return (
    <>
      {/* ── Ad Overlay (interstitial before download) ─────────────── */}
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
          </div>
        )}

        {/* Parsed result */}
        {parsed && (
          <div className="mt-5 space-y-4">
            {/* Preview */}
            <div className="flex items-start gap-4">
              {parsed.thumbnail && (
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

            {/* Download button — triggers ad flow */}
            {status === 'idle' && (
              <button
                onClick={handleDownloadClick}
                disabled={!format}
                className={`w-full ${colors.btn} text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition`}
              >
                ⬇ Download
              </button>
            )}
          </div>
        )}

        {/* Progress */}
        {(status === 'queued' || status === 'processing') && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{status === 'queued' ? 'Queued…' : 'Processing…'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${colors.btn.replace('hover:', '').split(' ')[0]}`}
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
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
                  onClick={async () => {
                    try {
                      const resp      = await fetch(downloadUrl);
                      const blob      = await resp.blob();
                      const objectUrl = URL.createObjectURL(blob);
                      const rawPath   = new URL(downloadUrl).pathname;
                      const filename  = rawPath.split('/').pop()?.split('?')[0] ?? 'download';
                      const a = document.createElement('a');
                      a.href = objectUrl; a.download = filename;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
                    } catch { window.open(downloadUrl, '_blank'); }
                  }}
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
