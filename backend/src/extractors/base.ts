/**
 * backend/src/extractors/base.ts
 * ───────────────────────────────
 * Base class for yt-dlp-based extractors.
 *
 * ─── KEY FIXES FOR RAILWAY/DATACENTER IP BOT DETECTION ─────────────
 *
 * FIX 1: --skip-download + --no-check-formats in fetchInfo()
 *   Without these, yt-dlp probes the streaming CDN to verify each format
 *   is downloadable. From Railway GCP IPs, YouTube blocks these CDN probe
 *   requests → empty format list → "Requested format is not available".
 *   With these flags, yt-dlp returns the format list from the player JSON
 *   only, no CDN probing. This is the PRIMARY fix for YouTube Shorts.
 *
 * FIX 2: /tmp/yt-dlp binary resolution
 *   docker-entrypoint.sh updates yt-dlp to /tmp/yt-dlp but does NOT export
 *   YTDLP_PATH. Node.js inherits the original PATH (before the shell prepend),
 *   so it silently used the stale bundled binary. We check /tmp/yt-dlp first.
 *
 * FIX 3: --print urls replaces deprecated --get-url
 *   --get-url returns two lines for bv*+ba merged formats (video + audio URLs),
 *   silently dropping the audio stream. --print urls is the modern yt-dlp idiom.
 *
 * FIX 4: 90s timeout (was 60s)
 *   web_creator + default clients on cold Railway IPs can take 20-35s to
 *   negotiate. 60s caused spurious timeouts that looked like bot blocks.
 *
 * FIX 5: getPreview() reuses fetchInfo() instead of duplicating flags.
 *   The old implementation missed --no-check-formats, making previews equally
 *   vulnerable to bot detection. Also eliminated duplicate --no-warnings flags.
 */

import { execa }              from 'execa';
import { access as fsAccess } from 'node:fs/promises';
import type { FormatOption, MediaMeta, PreviewMeta, IExtractor } from './index.js';

/* ─── yt-dlp binary resolution ───────────────────────────────────── */

/**
 * Resolve yt-dlp binary path.
 * Priority: /tmp/yt-dlp (entrypoint self-update) → YTDLP_PATH env → system PATH
 *
 * Why check /tmp/yt-dlp directly:
 * docker-entrypoint.sh writes the updated binary to /tmp/yt-dlp and prepends
 * /tmp to $PATH. However, Node.js inherits the environment from when the
 * process was exec'd — AFTER the shell modifications. The PATH prepend is a
 * shell-level change; the exec'd Node process sees the original PATH. Checking
 * /tmp/yt-dlp by absolute path is the only reliable way to use the updated binary.
 */
async function resolveYtdlpPath(): Promise<string> {
  try {
    await fsAccess('/tmp/yt-dlp');
    return '/tmp/yt-dlp';
  } catch {
    // Not present — dev environment or update failed
  }
  return process.env.YTDLP_PATH || 'yt-dlp';
}

// Cached after first call — won't change within a container lifetime
let _ytdlpPathCache: string | null = null;
async function getYtdlpPath(): Promise<string> {
  if (!_ytdlpPathCache) {
    _ytdlpPathCache = await resolveYtdlpPath();
  }
  return _ytdlpPathCache;
}

/* ─── yt-dlp JSON shape (subset) ─────────────────────────────────── */
interface YtdlpFormat {
  format_id:        string;
  ext:              string;
  vcodec?:          string;
  acodec?:          string;
  height?:          number;
  width?:           number;
  filesize?:        number;
  filesize_approx?: number;
  abr?:             number;
  vbr?:             number;
  tbr?:             number;
  format_note?:     string;
}

interface YtdlpInfo {
  title:        string;
  duration?:    number;
  thumbnail?:   string;
  description?: string;
  uploader?:    string;
  view_count?:  number;
  formats?:     YtdlpFormat[];
}

/* ─── Full quality ladder — ascending order (lowest → highest) ────── */
const VIDEO_HEIGHTS: Array<{ height: number; label: string; id: string }> = [
  { height:  144, label: '144p',        id: '144p'  },
  { height:  240, label: '240p',        id: '240p'  },
  { height:  360, label: '360p',        id: '360p'  },
  { height:  480, label: '480p SD',     id: '480p'  },
  { height:  720, label: '720p HD',     id: '720p'  },
  { height: 1080, label: '1080p HD',    id: '1080p' },
  { height: 1440, label: '1440p QHD',   id: '1440p' },
  { height: 2160, label: '4K Ultra HD', id: '4k'    },
];

/**
 * Build a safe yt-dlp format selector for a given max height.
 * Pattern: bv*[height<=N]+ba/b[height<=N]/b
 *
 * Handles: regular DASH streams, YouTube Shorts (pre-muxed),
 * age-gated / geo-restricted videos, older progressive uploads.
 */
function heightSelector(height: number): string {
  return `bv*[height<=${height}]+ba/b[height<=${height}]/b`;
}

export abstract class BaseExtractor implements IExtractor {
  abstract readonly platform: string;

  /**
   * Extra yt-dlp flags specific to this platform (e.g. cookies, headers).
   *
   * IMPORTANT: Do NOT include --no-playlist here. It is added per-call in
   * fetchInfo() and getStreamUrl(). Adding it here causes duplicate flags
   * (yt-dlp emits arg-parse warnings) and confuses some yt-dlp versions.
   *
   * Do NOT include --no-warnings here either — it is added at the call-site
   * where needed (fetchInfo, getStreamUrl) to avoid duplication.
   */
  protected extraArgs(): string[] {
    return [];
  }

  /* ─── Core yt-dlp runner ────────────────────────────────────────── */
  protected async runYtdlp(args: string[]): Promise<string> {
    const ytdlp = await getYtdlpPath();
    const result = await execa(ytdlp, [...this.extraArgs(), ...args], {
      // 90s — web_creator + default clients can be slow on cold Railway IPs.
      // 60s caused spurious timeouts indistinguishable from bot blocks.
      timeout: 90_000,
      reject:  true,
    });
    return result.stdout;
  }

  /* ─── Fetch full metadata JSON ──────────────────────────────────── */
  /**
   * Critical flags added:
   *
   * --skip-download: Prevents yt-dlp from attempting any actual download
   * during JSON extraction. Without this, yt-dlp may try to verify stream
   * availability by probing the CDN — requests that YouTube blocks from
   * Railway/GCP datacenter IPs, causing the misleading "Requested format
   * is not available" error even though the video is perfectly accessible.
   *
   * --no-check-formats: Disables the format-availability pre-check that
   * yt-dlp does before returning the format list. This check issues extra
   * HTTP requests to the streaming CDN. On Railway, YouTube's bot detection
   * blocks these probe requests → empty format list → "Requested format is
   * not available". With this flag, formats come from the player response
   * JSON only (no CDN probing). The list may include some unavailable formats
   * but this is far better than returning no formats at all.
   */
  protected async fetchInfo(url: string): Promise<YtdlpInfo> {
    const raw = await this.runYtdlp([
      '--dump-json',
      '--no-playlist',
      '--skip-download',
      '--no-check-formats',
      '--no-warnings',
      url,
    ]);
    return JSON.parse(raw) as YtdlpInfo;
  }

  /* ─── Build unified format list ─────────────────────────────────── */
  protected buildFormats(info: YtdlpInfo): FormatOption[] {
    const rawFormats = info.formats ?? [];

    // Collect every height that has at least one real video stream.
    // vcodec !== 'none' means the format carries a video track.
    const availableHeights = new Set<number>(
      rawFormats
        .filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
        .map(f => f.height!)
    );

    const formats: FormatOption[] = [];
    const seen = new Set<string>();

    for (const tier of VIDEO_HEIGHTS) {
      // Only offer a tier if the source actually has video at or above that
      // resolution. If yt-dlp returned NO formats (availableHeights empty),
      // offer the full ladder anyway — bv*+ba/b will handle it at download time.
      if (availableHeights.size > 0 && !Array.from(availableHeights).some(h => h >= tier.height)) {
        continue;
      }

      if (!seen.has(tier.id)) {
        seen.add(tier.id);
        formats.push({
          id:            tier.id,
          label:         tier.label,
          ext:           'mp4',
          hasVideo:      true,
          hasAudio:      true,
          ytdlpFormatId: heightSelector(tier.height),
        });
      }
    }

    // Always include MP3 audio extraction
    if (!seen.has('mp3')) {
      formats.push({
        id:       'mp3',
        label:    'MP3 Audio',
        ext:      'mp3',
        hasVideo: false,
        hasAudio: true,
        ytdlpFormatId: 'ba/b',
      });
    }

    // Edge case: video-less source (e.g. podcast). Offer best-quality fallback.
    if (formats.length === 1 && formats[0]!.id === 'mp3') {
      formats.unshift({
        id:            'best',
        label:         'Best Quality',
        ext:           'mp4',
        hasVideo:      true,
        hasAudio:      true,
        ytdlpFormatId: 'bv*+ba/b',
      });
    }

    return formats;
  }

  /* ─── IExtractor implementation ─────────────────────────────────── */

  async getMetadata(url: string): Promise<MediaMeta> {
    const info = await this.fetchInfo(url);
    return {
      title:       info.title || 'Untitled',
      platform:    this.platform,
      duration:    info.duration,
      thumbnail:   info.thumbnail,
      description: info.description,
      uploader:    info.uploader,
      viewCount:   info.view_count,
      formats:     this.buildFormats(info),
    };
  }

  /**
   * FIX: Reuse fetchInfo() which already adds --skip-download,
   * --no-check-formats, --no-playlist, --no-warnings.
   *
   * The old implementation duplicated flags manually and critically missed
   * --no-check-formats, making previews just as vulnerable to Railway bot
   * detection as the metadata fetch. It also double-added --no-warnings
   * (extraArgs adds it for YouTube; the old getPreview() also added it).
   */
  async getPreview(url: string): Promise<PreviewMeta> {
    const info = await this.fetchInfo(url);
    return {
      title:     info.title || 'Untitled',
      platform:  this.platform,
      thumbnail: info.thumbnail,
      duration:  info.duration,
      uploader:  info.uploader,
    };
  }

  /**
   * FIX: --print urls replaces deprecated --get-url.
   *
   * --get-url was deprecated in yt-dlp 2023.x. With bv*+ba merged format
   * selectors it returns two lines (video URL + audio URL). The old code
   * took urls[0] (video only), silently dropping the audio stream URL.
   * --print urls is the modern idiom and handles all format types correctly.
   */
  async getStreamUrl(url: string, formatId: string): Promise<string> {
    const formatSelector = this.resolveFormatSelector(formatId);
    const stdout = await this.runYtdlp([
      '--print', 'urls',
      '--no-playlist',
      '--no-check-formats',
      '--no-warnings',
      '-f', formatSelector,
      url,
    ]);
    const urls = stdout.trim().split('\n').filter(Boolean);
    if (!urls[0]) {
      throw new Error(`No stream URL returned for format "${formatId}"`);
    }
    return urls[0];
  }

  protected resolveFormatSelector(formatId: string): string {
    const selectors: Record<string, string> = {
      '144p':  heightSelector(144),
      '240p':  heightSelector(240),
      '360p':  heightSelector(360),
      '480p':  heightSelector(480),
      '720p':  heightSelector(720),
      '1080p': heightSelector(1080),
      '1440p': heightSelector(1440),
      '4k':    heightSelector(2160),
      'mp3':   'ba/b',
      'best':  'bv*+ba/b',
    };
    return selectors[formatId.toLowerCase()] ?? 'bv*+ba/b';
  }
}
