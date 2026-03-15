/**
 * backend/src/extractors/youtube.ts
 * ────────────────────────────────────
 * YouTube extractor via yt-dlp.
 * Supports: youtube.com/watch, youtu.be (+?si=), youtube.com/shorts, /live/
 *
 * ─── WHY RAILWAY IPs GET BLOCKED BY YOUTUBE ─────────────────────────
 *
 * Railway runs on GCP (Google Cloud Platform). YouTube specifically detects
 * GCP/datacenter IPs and applies po_token (Proof Of Origin Token) requirements.
 * A video that works in your browser fails on Railway because:
 *   • Your browser generates a valid po_token via JavaScript challenge
 *   • Railway cannot run browser JavaScript → no po_token → blocked
 *
 * ─── THE WORKING STRATEGY (2026) ────────────────────────────────────
 *
 * 1. 'default' client with valid cookies = SABR streaming
 *    SABR (Stable Adaptive Bitrate) is YouTube's server-side streaming API.
 *    With a valid logged-in cookie session, it works from GCP IPs.
 *    This is the PRIMARY strategy when YT_COOKIES_BASE64 is set.
 *
 * 2. 'tv_embedded' + 'web_embedded'
 *    YouTube TV/iframe embed clients. Explicitly permitted for server use.
 *    Do not require po_token. Reliable secondary fallback.
 *
 * 3. 'ios' client
 *    Uses Apple AppAttest auth. Different auth path, not subject to
 *    browser po_token requirement.
 *
 * 4. Realistic User-Agent
 *    Sending a real Android/Chrome UA reduces bot-score from YouTube CDN.
 *
 * ─── COOKIES ARE MANDATORY FOR RELIABILITY ──────────────────────────
 *
 * Set YT_COOKIES_BASE64 in Railway Backend + Worker environment variables.
 * Export from Chrome after logging into YouTube:
 *   1. Install "Get cookies.txt LOCALLY" Chrome extension
 *   2. Go to youtube.com, click extension → Export
 *   3. base64 -w 0 cookies.txt  → copy output → paste into Railway variable
 */

import { BaseExtractor } from './base.js';
import type { MediaMeta, PreviewMeta } from './index.js';

/**
 * Extract video ID from any YouTube URL, return clean canonical watch URL.
 * Strips ALL tracking params: ?si=, &t=, &pp=, etc.
 */
function normaliseYouTubeUrl(url: string): string {
  const s = url.trim();
  let videoId: string | null = null;

  // youtu.be/ID  — short links always have ?si= from mobile share
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) videoId = short[1]!;

  // youtube.com/shorts/ID
  if (!videoId) {
    const shorts = s.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) videoId = shorts[1]!;
  }

  // youtube.com/watch?v=ID
  if (!videoId) {
    const watch = s.match(/youtube\.com\/watch\?.*?[?&]v=([A-Za-z0-9_-]{11})/);
    if (watch) videoId = watch[1]!;
  }

  // youtube.com/embed/ID
  if (!videoId) {
    const embed = s.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    if (embed) videoId = embed[1]!;
  }

  // youtube.com/live/ID
  if (!videoId) {
    const live = s.match(/youtube\.com\/live\/([A-Za-z0-9_-]{11})/);
    if (live) videoId = live[1]!;
  }

  return videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : url;
}

export class YoutubeExtractor extends BaseExtractor {
  readonly platform = 'youtube';

  protected extraArgs(): string[] {
    const args: string[] = [
      '--geo-bypass',
      '--force-ipv4',
      // Realistic Android Chrome User-Agent reduces YouTube bot-score
      '--add-header',
      'User-Agent:Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ];

    // Cookies = single most important factor for Railway reliability.
    // With a valid logged-in YouTube session, the 'default' (SABR) client
    // bypasses GCP IP restrictions. Without cookies, only embed clients work.
    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

    // Client chain for Railway/GCP IPs — yt-dlp 2026.x:
    //
    //   default       → yt-dlp smart SABR streaming. With valid cookies, works
    //                   from GCP IPs. YouTube's own server-side API. PRIMARY.
    //
    //   tv_embedded   → YouTube TV embed. Server-side permitted, no po_token.
    //                   Most reliable non-authenticated fallback. SECONDARY.
    //
    //   web_embedded  → YouTube iframe embed. Different endpoint. TERTIARY.
    //
    //   ios           → Apple AppAttest auth path. Not browser po_token restricted.
    //                   QUATERNARY.
    //
    //   mweb          → Mobile web. Most permissive. FINAL.
    //
    // NOTE: player_skip is intentionally NOT used — it breaks JS player
    // signature decryption and causes HTTP 152 "unavailable" errors.
    args.push(
      '--extractor-args',
      'youtube:player_client=default,tv_embedded,web_embedded,ios,mweb',
    );

    // Prevent stale JS player cache causing nsig decode failures (HTTP 403 on CDN)
    args.push('--no-cache-dir');

    return args;
  }

  override async getMetadata(url: string): Promise<MediaMeta> {
    return super.getMetadata(normaliseYouTubeUrl(url));
  }

  override async getPreview(url: string): Promise<PreviewMeta> {
    return super.getPreview(normaliseYouTubeUrl(url));
  }

  override async getStreamUrl(url: string, formatId: string): Promise<string> {
    return super.getStreamUrl(normaliseYouTubeUrl(url), formatId);
  }
}
