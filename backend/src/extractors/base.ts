/**
 * backend/src/extractors/base.ts
 * ───────────────────────────────
 * Base class for all yt-dlp extractors.
 *
 * KEY FIXES:
 *  1. runYtdlp() — catches execa errors, extracts clean stderr, translates
 *     known yt-dlp error codes into user-friendly messages.
 *  2. fetchInfo() — --skip-download + --no-check-formats prevent CDN probing
 *     bot detection on Railway/datacenter IPs.
 *  3. getYtdlpPath() — checks /tmp/yt-dlp first (entrypoint self-update).
 *  4. 90s timeout — web_creator client slow on cold Railway IPs.
 *  5. --print urls replaces deprecated --get-url.
 */

import { execa }              from 'execa';
import { access as fsAccess } from 'node:fs/promises';
import type { FormatOption, MediaMeta, PreviewMeta, IExtractor } from './index.js';

/* ─── yt-dlp binary resolution ──────────────────────────────────── */
async function resolveYtdlpPath(): Promise<string> {
  try { await fsAccess('/tmp/yt-dlp'); return '/tmp/yt-dlp'; } catch {}
  return process.env.YTDLP_PATH || 'yt-dlp';
}
let _ytdlpPathCache: string | null = null;
async function getYtdlpPath(): Promise<string> {
  if (!_ytdlpPathCache) _ytdlpPathCache = await resolveYtdlpPath();
  return _ytdlpPathCache;
}

/* ─── Error translation ──────────────────────────────────────────── */

/**
 * Translates raw yt-dlp stderr into a clean, user-friendly message.
 *
 * yt-dlp exits with code 1 and prints to stderr for ALL errors.
 * The execa error.message contains the full command + stderr concatenated,
 * which is unreadable to users ("Command failed with exit code 1: /tmp/yt-dlp...").
 * We extract just the ERROR: line from stderr and map known patterns.
 */
function translateYtdlpError(err: any): string {
  // execa puts stderr in err.stderr, and the full message in err.message
  const raw = (err.stderr || err.message || '').toString();

  // Extract just the yt-dlp ERROR: line (strips the full command from message)
  const errorLine = raw.match(/ERROR:\s*(.+)/i)?.[1]?.trim() ?? '';

  // Map known YouTube error patterns to friendly messages
  if (/unavailable|Error code: 152|This video is not available/i.test(raw))
    return 'This video is unavailable or restricted (age-gate, region-block, or removed). Please try a different video.';

  if (/Private video/i.test(raw))
    return 'This is a private video and cannot be downloaded.';

  if (/copyright/i.test(raw))
    return 'This video cannot be downloaded due to a copyright restriction.';

  if (/has been removed/i.test(raw))
    return 'This video has been removed by the uploader.';

  if (/not available in your country|geo.?restrict/i.test(raw))
    return 'This video is not available in the server\'s region.';

  if (/Sign in to confirm your age|age.?restrict/i.test(raw))
    return 'This video requires age verification. Try providing YouTube cookies (YT_COOKIES_BASE64).';

  if (/Sign in to confirm/i.test(raw))
    return 'YouTube is requiring sign-in for this video. Ensure YT_COOKIES_BASE64 is set.';

  if (/Requested format is not available/i.test(raw))
    return 'Could not retrieve video formats from YouTube. The video may be restricted, or please try again in a moment.';

  if (/Unable to extract/i.test(raw))
    return 'Could not extract video info. The URL may be invalid or the video unavailable.';

  if (/is not a valid URL/i.test(raw))
    return 'Invalid URL. Please paste a valid YouTube, Instagram, or Facebook video URL.';

  if (/Unsupported URL/i.test(raw))
    return 'This URL is not supported. Please use a direct video link.';

  if (/timed out|timed.?out|timeout/i.test(raw) || err.timedOut)
    return 'Request timed out. YouTube may be slow — please try again.';

  // Return the clean ERROR line if we have it, else a generic message
  if (errorLine) return errorLine;
  return 'Could not process this video. Please check the URL and try again.';
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

/* ─── Quality ladder ─────────────────────────────────────────────── */
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

function heightSelector(height: number): string {
  return `bv*[height<=${height}]+ba/b[height<=${height}]/b`;
}

export abstract class BaseExtractor implements IExtractor {
  abstract readonly platform: string;

  protected extraArgs(): string[] { return []; }

  /* ─── Core runner ────────────────────────────────────────────── */
  protected async runYtdlp(args: string[]): Promise<string> {
    const ytdlp = await getYtdlpPath();
    try {
      const result = await execa(ytdlp, [...this.extraArgs(), ...args], {
        timeout: 90_000,
        reject:  true,
      });
      return result.stdout;
    } catch (err: any) {
      // Translate raw yt-dlp error into a clean user-facing message
      throw new Error(translateYtdlpError(err));
    }
  }

  /* ─── Fetch metadata JSON ────────────────────────────────────── */
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

  /* ─── Build format list ──────────────────────────────────────── */
  protected buildFormats(info: YtdlpInfo): FormatOption[] {
    const rawFormats = info.formats ?? [];

    const availableHeights = new Set<number>(
      rawFormats
        .filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
        .map(f => f.height!)
    );

    const formats: FormatOption[] = [];
    const seen = new Set<string>();

    for (const tier of VIDEO_HEIGHTS) {
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

  /* ─── IExtractor implementation ──────────────────────────────── */
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
    if (!urls[0]) throw new Error(`No stream URL returned for format "${formatId}"`);
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
