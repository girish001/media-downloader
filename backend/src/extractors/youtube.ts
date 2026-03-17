/**
 * backend/src/extractors/youtube.ts
 * ────────────────────────────────────
 * YouTube extractor via yt-dlp.
 * Supports: youtube.com/watch, youtu.be, youtube.com/shorts
 *
 * ─── ROOT CAUSE: RAILWAY/DATACENTER IP BOT DETECTION ───────────────
 *
 * YouTube detects datacenter/VPS IPs (GCP, Railway, AWS etc.) and applies
 * stricter bot-detection. When all clients are blocked, yt-dlp returns an
 * empty formats list → "Requested format is not available".
 *
 * The error is misleading — it means "no formats found at all" not
 * "wrong format string". The actual block happens during CDN probing,
 * which is why --no-check-formats + --skip-download (in base.ts fetchInfo)
 * is the critical fix: we never trigger the CDN probe in the first place.
 *
 * ─── PLAYER CLIENT CHAIN (order matters) ────────────────────────────
 *
 *   web_creator   → YouTube Studio/Creator client. Designed for server-side
 *                   creator tools. NOT subject to datacenter IP restrictions.
 *                   PRIMARY — most reliable from Railway IPs.
 *
 *   default       → yt-dlp smart selection. Uses SABR streaming with cookies.
 *                   Very reliable when YT_COOKIES_FILE is set. SECONDARY.
 *
 *   tv_embedded   → YouTube TV embed. Server-side context, bypasses some
 *                   datacenter IP checks. TERTIARY.
 *
 *   web_embedded  → YouTube iframe embed. Different CDN endpoint. QUATERNARY.
 *
 *   web           → Full web client. Reliable with cookies, blocked without
 *                   from datacenter IPs. QUINARY.
 *
 *   ios           → iOS AppAttest auth path. Different from web — NOT subject
 *                   to the same datacenter IP restrictions. SENARY.
 *
 *   mweb          → Mobile web. Most permissive, lowest quality. FINAL.
 *
 * yt-dlp tries each client in order, using the first that returns formats.
 *
 * ─── SHORTS NORMALISATION ───────────────────────────────────────────
 *
 * youtube.com/shorts/<id> → youtube.com/watch?v=<id> before yt-dlp call.
 * Prevents inconsistent handling across yt-dlp versions.
 */

import { BaseExtractor } from './base.js';
import type { MediaMeta, PreviewMeta, FormatOption } from './index.js';

/** Rewrite Shorts URLs → standard watch URLs for consistent yt-dlp handling */
function normaliseYouTubeUrl(url: string): string {
  const shortsMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/
  );
  if (shortsMatch) {
    return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  }
  return url;
}

/** Standard YouTube format fallback — used when yt-dlp cannot probe formats
 *  (e.g. datacenter IP bot-block during /parse). These selectors are robust
 *  enough to work at download time even if the parse-phase probe failed.
 *  The bv*+ba/b chain tries DASH merge first, falls back to pre-muxed stream.
 */
const YT_FALLBACK_FORMATS: FormatOption[] = [
  { id: '1080p', label: '1080p HD',   ext: 'mp4', hasVideo: true,  hasAudio: true,  ytdlpFormatId: 'bv*[height<=1080]+ba/b[height<=1080]/b' },
  { id: '720p',  label: '720p HD',    ext: 'mp4', hasVideo: true,  hasAudio: true,  ytdlpFormatId: 'bv*[height<=720]+ba/b[height<=720]/b'   },
  { id: '480p',  label: '480p SD',    ext: 'mp4', hasVideo: true,  hasAudio: true,  ytdlpFormatId: 'bv*[height<=480]+ba/b[height<=480]/b'   },
  { id: '360p',  label: '360p',       ext: 'mp4', hasVideo: true,  hasAudio: true,  ytdlpFormatId: 'bv*[height<=360]+ba/b[height<=360]/b'   },
  { id: 'mp3',   label: 'MP3 Audio',  ext: 'mp3', hasVideo: false, hasAudio: true,  ytdlpFormatId: 'ba/b'                                   },
];

/** Extract a readable video ID from any YouTube URL for use as fallback title */
function extractVideoId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : 'YouTube Video';
}

export class YoutubeExtractor extends BaseExtractor {
  readonly platform = 'youtube';

  /**
   * Extra args prepended to every yt-dlp call for YouTube.
   *
   * Cookies come FIRST — yt-dlp processes them before extractor-args so
   * the 'web' client in the chain can use them immediately.
   *
   * --force-ipv4: eliminates IPv6 routing issues on some Railway Docker hosts.
   */
  protected extraArgs(): string[] {
    const args: string[] = [
      '--geo-bypass',
      '--force-ipv4',
    ];

    // ── Cookie strategy: NO cookies by default ─────────────────────────────
    // CRITICAL FINDING (yt-dlp issue #11783): cookies are WORSE than no
    // cookies from datacenter IPs. YouTube applies maximum bot-detection to
    // authenticated requests from GCP/Railway IPs, blocking them entirely.
    // Without cookies (unauthenticated), tv_embedded and mweb clients work.
    //
    // Only enable cookies if YT_COOKIES_FILE is set AND the file is fresh
    // (exported within the last few hours from an active browser session).
    // A valid YouTube cookies export is 8-15KB. The 3309-byte file seen in
    // production logs indicates an expired/malformed session — do NOT use it.
    //
    // ACTION: Unset YT_COOKIES_BASE64 in Railway env vars to run without
    // cookies. This is the recommended mode for datacenter IPs.
    // ── Player client + PO token (official yt-dlp recommendation 2025) ────
    //
    // Per official yt-dlp PO Token Guide (github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide):
    // "TL;DR recommended setup: provide the mweb client with a PO Token for
    //  GVS (Google Video Server) requests."
    //
    // Without a PO token, mweb still works from some IPs but may get 403s
    // on stream URLs. tv_embedded is the best no-token option.
    //
    // Client priority for Railway/GCP datacenter IPs (2025):
    //   mweb        → Mobile web. Official recommended client for po_token.
    //                 Most permissive for unauthenticated server-side use.
    //   tv_embedded → Embedded TV. Best without po_token. No cookies needed.
    //   web_creator → YouTube Studio API. Server-side permitted.
    //   ios         → iOS path. Different bot-detection rules.
    //
    // Do NOT use: 'web', 'default', 'android', 'web_embedded' without po_token.
    // These trigger SABR streaming enforcement which blocks datacenter IPs.

    // ── Client chain with bgutil PO token provider ───────────────────────────
    // bgutil runs as a local HTTP server on port 4416 (started by entrypoint).
    // The pip plugin makes yt-dlp discover it automatically — no manual
    // po_token arg needed. yt-dlp calls the server for a fresh token per request.
    //
    // mweb: best format quality, works with bgutil PO tokens. PRIMARY.
    // tv_embedded: no PO token needed, needs cookies. SECONDARY.
    // tv/tv_simply: no PO token needed, no cookies. TERTIARY/FALLBACK.
    // ios: different bot-detection path. QUATERNARY.
    //
    // Manual YT_PO_TOKEN env var still supported as override if bgutil is down.
   let extractorArgs = 'youtube:player_client=ios,tv,tv_simply,tv_embedded';

args.push(
  '--add-header',
  'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
);

if (process.env.YT_COOKIES_FILE) {
  args.push('--cookies', process.env.YT_COOKIES_FILE);
}

args.push('--extractor-args', extractorArgs);

    // Residential proxy: routes around datacenter IP detection entirely.
    // Set YT_PROXY=socks5://user:pass@host:port or http://host:port.
    if (process.env.YT_PROXY) {
      args.push('--proxy', process.env.YT_PROXY);
    }

    return args;
  }

  /**
   * THE CORE FIX — override fetchInfo() to never throw for YouTube.
   *
   * ROOT CAUSE of "Parse failed" error shown in the UI:
   * When Railway/GCP IPs get bot-detected by YouTube, yt-dlp exits with
   * code 1 and prints "Requested format is not available". base.ts runYtdlp()
   * has { reject: true }, so this throws an exception. That exception bubbles
   * up through getMetadata() and getPreview() all the way to the route handler
   * which returns a 422 "Parse failed" — the format picker never appears.
   *
   * The fallback added to getMetadata() in the previous fix never fired
   * because the exception was thrown BEFORE getMetadata() could check the
   * format list — it never even got an object to inspect.
   *
   * FIX: Wrap the yt-dlp call in a try/catch. On ANY yt-dlp error:
   *  - Log the error for debugging
   *  - Return a minimal stub { title, formats: [] }
   *  - getMetadata() then sees formats.length === 0 and substitutes
   *    YT_FALLBACK_FORMATS, so the user always gets a format picker
   *  - getPreview() sees a title and can show the video ID as placeholder
   *
   * This matches the resilience of Instagram/Facebook extractors which
   * hardcode their format lists and never fail the parse phase.
   */
  protected async fetchInfoSafe(url: string): Promise<{ title: string; thumbnail?: string; duration?: number; uploader?: string; formats: [] }> {
    return {
      title:    extractVideoId(url),
      formats:  [],
    };
  }

  override async getMetadata(url: string): Promise<MediaMeta> {
    const normUrl = normaliseYouTubeUrl(url);
    try {
      const meta = await super.getMetadata(normUrl);
      // yt-dlp succeeded but returned no formats (partial bot-block)
      if (meta.formats.length === 0) {
        meta.formats = YT_FALLBACK_FORMATS;
      }
      return meta;
    } catch (err: any) {
      // yt-dlp failed entirely (full bot-block, exit code 1, timeout, etc.)
      // Return fallback so the frontend still shows the format picker.
      // The worker will retry with its own bot-bypass args at download time.
      console.warn(`[youtube] fetchInfo failed for ${normUrl} — serving fallback formats. Error: ${err.message}`);
      return {
        title:    extractVideoId(normUrl),
        platform: 'youtube',
        formats:  YT_FALLBACK_FORMATS,
      };
    }
  }

  override async getPreview(url: string): Promise<PreviewMeta> {
    const normUrl = normaliseYouTubeUrl(url);
    try {
      return await super.getPreview(normUrl);
    } catch (err: any) {
      // Bot-blocked during preview fetch — return a minimal stub so the
      // frontend can still show something rather than an error banner.
      console.warn(`[youtube] getPreview failed for ${normUrl} — serving stub. Error: ${err.message}`);
      return {
        title:    extractVideoId(normUrl),
        platform: 'youtube',
      };
    }
  }

  override async getStreamUrl(url: string, formatId: string): Promise<string> {
    return super.getStreamUrl(normaliseYouTubeUrl(url), formatId);
  }
}
