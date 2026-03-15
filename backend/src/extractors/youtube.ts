/**
 * backend/src/extractors/youtube.ts
 * ────────────────────────────────────
 * YouTube extractor via yt-dlp.
 * Supports: youtube.com/watch, youtu.be (+?si=), youtube.com/shorts, /live/
 *
 * ─── WHY VIDEOS FAIL ON RAILWAY BUT WORK IN BROWSER ────────────────
 *
 * YouTube uses layered bot detection. A video that plays fine in your browser
 * can fail on a Railway container because:
 *
 * 1. Your browser has cookies + a real session → YouTube trusts it
 * 2. Railway IP is flagged as datacenter → YouTube applies stricter checks
 * 3. po_token (Proof Of Origin) — YouTube generates this in the browser JS
 *    challenge. Datacenter IPs without a valid po_token get HTTP 152 errors.
 *
 * ─── WHAT DOES NOT WORK ─────────────────────────────────────────────
 *
 * player_skip=webpage,configs,js — REMOVES this from extractor args.
 * Even though it sounds like a bot-detection bypass, it actually BREAKS things:
 * yt-dlp needs the YouTube JS player to decrypt stream URL signatures.
 * When we skip the JS player, yt-dlp uses a stale built-in cipher which
 * YouTube rejects → HTTP 152 "unavailable" error even for public videos.
 *
 * ─── WHAT WORKS ─────────────────────────────────────────────────────
 *
 * Client chain — ordered for Railway (2026):
 *
 *   tv_embedded   → YouTube TV embed. Explicitly permitted for server-side
 *                   use. Does NOT require po_token. PRIMARY.
 *
 *   web_embedded  → YouTube iframe embed. Also server-side permitted.
 *                   Different CDN endpoint from tv_embedded. SECONDARY.
 *
 *   ios           → iOS app client. Uses Apple AppAttest, separate auth
 *                   path from web clients. Not subject to browser po_token.
 *                   TERTIARY.
 *
 *   web           → Full web client. Works when valid cookies are present
 *                   (YT_COOKIES_BASE64 set). QUATERNARY.
 *
 *   mweb          → Mobile web. Most permissive fallback. FINAL.
 *
 * Cookies (YT_COOKIES_BASE64) are critical — they provide the authenticated
 * YouTube session that proves the request is from a real account.
 *
 * ─── URL NORMALISATION ───────────────────────────────────────────────
 *
 * Strips ALL tracking parameters (?si=, &t=, etc.) from any YouTube URL
 * format and rebuilds a clean canonical https://www.youtube.com/watch?v=ID
 */

import { BaseExtractor } from './base.js';
import type { MediaMeta, PreviewMeta } from './index.js';

/**
 * Extract YouTube video ID from any URL format and return clean canonical URL.
 * Strips ?si= tracking params, &t= timestamps, and all other query params.
 */
function normaliseYouTubeUrl(url: string): string {
  const s = url.trim();
  let videoId: string | null = null;

  // youtu.be/ID  (short links, always has ?si= from mobile share)
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) videoId = short[1]!;

  // youtube.com/shorts/ID
  if (!videoId) {
    const shorts = s.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) videoId = shorts[1]!;
  }

  // youtube.com/watch?v=ID  (strips all other params)
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

  // Return clean URL with NO tracking params
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
    ];

    // Cookies are the single most important factor for Railway reliability.
    // A valid logged-in YouTube session bypasses most datacenter IP restrictions.
    // Set YT_COOKIES_BASE64 in Railway → Backend and Worker environment variables.
    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

    // Client chain — tuned for Railway/GCP datacenter IPs, yt-dlp 2026.x
    //
    // IMPORTANT: Do NOT add player_skip=webpage,configs,js here.
    // It breaks signature decryption for embed clients causing HTTP 152 errors
    // on videos that are perfectly accessible. Let yt-dlp handle the JS player.
    //
    // Chain: tv_embedded → web_embedded → ios → web → mweb
    //   - tv_embedded + web_embedded: server-side permitted, no po_token needed
    //   - ios: AppAttest auth path, bypasses browser-specific po_token
    //   - web: works with valid cookies (authenticated session)
    //   - mweb: final fallback, most permissive
    args.push(
      '--extractor-args',
      'youtube:player_client=tv_embedded,web_embedded,ios,web,mweb',
    );

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
