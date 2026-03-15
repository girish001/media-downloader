/**
 * backend/src/extractors/base.ts
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
function translateYtdlpError(err: any): string {
  const raw = (err.stderr || err.message || '').toString();
  const errorLine = raw.match(/ERROR:\s*(.+)/i)?.[1]?.trim() ?? '';

  if (/unavailable|Error code: 152|This video is not available/i.test(raw))
    return 'This video is unavailable or restricted. Please try a different video.';
  if (/Private video/i.test(raw))
    return 'This is a private video.';
  if (/copyright/i.test(raw))
    return 'Copyright restriction — this video cannot be downloaded.';
  if (/has been removed/i.test(raw))
    return 'This video has been removed.';
  if (/not available in your country|geo.?restrict/i.test(raw))
    return "This video is not available in this region.";
  if (/Sign in to confirm your age|age.?restrict/i.test(raw))
    return 'Age-restricted video. Ensure YT_COOKIES_BASE64 is set with a logged-in YouTube session.';
  if (/Sign in to confirm/i.test(raw))
    return 'YouTube requires sign-in for this video. Check YT_COOKIES_BASE64 is set correctly.';
  if (/Requested format is not available/i.test(raw))
    return 'No downloadable formats found. This video may be restricted.';
  if (/HTTP Error 403|403.*Forbidden/i.test(raw))
    return 'YouTube CDN blocked the request (403). Please try again.';
  if (/timed out|timed.?out|timeout/i.test(raw) || err.timedOut)
    return 'Request timed out. Please try again.';
  if (errorLine) return errorLine;
  return 'Could not process this video. Please try again.';
}

/* ─── yt-dlp JSON shape ──────────────────────────────────────────── */
interface YtdlpFormat {
  format_id: string; ext: string; vcodec?: string; acodec?: string;
  height?: number; width?: number; filesize?: number; filesize_approx?: number;
  abr?: number; vbr?: number; tbr?: number; format_note?: string;
}

interface YtdlpInfo {
  title:               string;
  duration?:           number;
  thumbnail?:          string;
  description?:        string;
  uploader?:           string;
  view_count?:         number;
  formats?:            YtdlpFormat[];
  playability_status?: string;   // "OK" | "LOGIN_REQUIRED" | "UNPLAYABLE" | "ERROR"
}

/* ─── Quality ladder ─────────────────────────────────────────────── */
const VIDEO_HEIGHTS: Array<{ height: number; label: string; id: string }> = [
  { height: 144, label: '144p', id: '144p' }, { height: 240, label: '240p', id: '240p' },
  { height: 360, label: '360p', id: '360p' }, { height: 480, label: '480p SD', id: '480p' },
  { height: 720, label: '720p HD', id: '720p' }, { height: 1080, label: '1080p HD', id: '1080p' },
  { height: 1440, label: '1440p QHD', id: '1440p' }, { height: 2160, label: '4K Ultra HD', id: '4k' },
];

function heightSelector(h: number): string {
  return `bestvideo[height<=${h}]+bestaudio/bestvideo[height<=${h}]/best`;
}

export abstract class BaseExtractor implements IExtractor {
  abstract readonly platform: string;
  protected extraArgs(): string[] { return []; }

  /* ─── Core runner with full logging ─────────────────────────────── */
  protected async runYtdlp(args: string[]): Promise<string> {
    const ytdlp  = await getYtdlpPath();
    const urlArg = args[args.length - 1] ?? '';
    console.log(`[yt-dlp] ${this.platform} → ${urlArg}`);
    try {
      const result = await execa(ytdlp, [...this.extraArgs(), ...args], {
        timeout: 90_000,
        reject:  true,
      });
      if (result.stderr) {
        console.log(`[yt-dlp] warnings: ${result.stderr.slice(0, 300)}`);
      }
      return result.stdout;
    } catch (err: any) {
      const rawErr = (err.stderr || err.message || '').toString();
      console.error(`[yt-dlp] FAILED: ${rawErr.slice(0, 800)}`);
      throw new Error(translateYtdlpError(err));
    }
  }

  /* ─── Fetch metadata JSON ────────────────────────────────────────── */
  protected async fetchInfo(url: string): Promise<YtdlpInfo> {
    const raw = await this.runYtdlp([
      '--dump-json',
      '--no-playlist',
      '--skip-download',
      '--no-check-formats',
      url,
    ]);

    let info: YtdlpInfo;
    try {
      info = JSON.parse(raw) as YtdlpInfo;
    } catch {
      throw new Error('Failed to parse video info. Please try again.');
    }

    const status = info.playability_status?.toUpperCase() ?? '';
    const formatCount = info.formats?.length ?? 0;
    console.log(`[yt-dlp] playability_status: ${status || 'not set'}, formats: ${formatCount}`);

    // Only throw for definitive unrecoverable states
    if (status === 'UNPLAYABLE') {
      throw new Error('This video is unplayable — it may have DRM or music label download restrictions.');
    }
    if (status === 'ERROR') {
      throw new Error('YouTube returned an error for this video. It may be removed or region-restricted.');
    }
    // LOGIN_REQUIRED: don't throw — cookies may provide access for the download step
    // Empty formats: don't throw — buildFormats will add a best-effort fallback
    // These are handled gracefully below

    return info;
  }

 /* ─── Build format list ──────────────────────────────────────────── */
protected buildFormats(info: YtdlpInfo): FormatOption[] {

  const formats: FormatOption[] = [];
  const rawFormats = info.formats ?? [];

  const seen = new Set<string>();

  for (const f of rawFormats) {

    if (!f.format_id) continue;

    const hasVideo = f.vcodec && f.vcodec !== 'none';
    const hasAudio = f.acodec && f.acodec !== 'none';

    if (!hasVideo && !hasAudio) continue;

    let label = '';

    if (hasVideo && f.height) {
      label = `${f.height}p`;
    } else if (hasAudio && !hasVideo) {
      label = 'Audio';
    } else {
      label = 'Video';
    }

    // avoid duplicate format ids
    if (seen.has(f.format_id)) continue;
    seen.add(f.format_id);

    formats.push({
      id: f.format_id,
      label,
      ext: f.ext || 'mp4',
      hasVideo,
      hasAudio,
      ytdlpFormatId: f.format_id
    });

  }

  // fallback if nothing detected
  if (formats.length === 0) {
    formats.push({
      id: 'best',
      label: 'Best Quality',
      ext: 'mp4',
      hasVideo: true,
      hasAudio: true,
      ytdlpFormatId: 'bv*+ba/b'
    });
  }

  return formats;
}

  /* ─── IExtractor ────────────────────────────────────────────────── */
  async getMetadata(url: string): Promise<MediaMeta> {
    const info = await this.fetchInfo(url);
    return {
      title: info.title || 'Untitled', platform: this.platform,
      duration: info.duration, thumbnail: info.thumbnail,
      description: info.description, uploader: info.uploader,
      viewCount: info.view_count, formats: this.buildFormats(info),
    };
  }

  async getPreview(url: string): Promise<PreviewMeta> {
    const info = await this.fetchInfo(url);
    return { title: info.title || 'Untitled', platform: this.platform, thumbnail: info.thumbnail, duration: info.duration, uploader: info.uploader };
  }

  async getStreamUrl(url: string, formatId: string): Promise<string> {
    const formatSelector = this.resolveFormatSelector(formatId);
    const stdout = await this.runYtdlp(['--print', 'urls', '--no-playlist', '--no-check-formats', '-f', formatSelector, url]);
    const urls = stdout.trim().split('\n').filter(Boolean);
    if (!urls[0]) throw new Error(`No stream URL for format "${formatId}"`);
    return urls[0];
  }

  protected resolveFormatSelector(formatId: string): string {
    const s: Record<string, string> = {
      '144p': heightSelector(144), '240p': heightSelector(240),
      '360p': heightSelector(360), '480p': heightSelector(480),
      '720p': heightSelector(720), '1080p': heightSelector(1080),
      '1440p': heightSelector(1440), '4k': heightSelector(2160),
      'mp3': 'ba/b', 'best': 'bv*+ba/b[ext=mp4]/b',
    };
    return s[formatId.toLowerCase()] ?? 'bv*+ba/b';
  }
}
