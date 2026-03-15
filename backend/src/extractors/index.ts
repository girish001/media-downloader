/**
 * backend/src/extractors/index.ts
 * ────────────────────────────────
 * Extractor registry — maps URL patterns to platform extractors.
 *
 * Supported platforms:
 *   - YouTube  (youtube.com, youtu.be)
 *   - Instagram (instagram.com)
 *   - Facebook  (facebook.com, fb.watch)
 *   - Generic   (any URL supported by yt-dlp — catch-all)
 *
 * To add a new platform: implement IExtractor, add one entry to REGISTRY.
 */

/* ─── Shared types ────────────────────────────────────────────────── */

export interface FormatOption {
  id:         string;        // e.g. "1080p", "720p", "mp3"
  label:      string;        // human label, e.g. "1080p HD"
  ext:        string;        // file extension: "mp4" | "mp3" | "webm"
  hasVideo:   boolean;
  hasAudio:   boolean;
  vcodec?:    string;
  acodec?:    string;
  filesize?:  number;        // bytes, if known
  ytdlpFormatId?: string;    // raw yt-dlp format selector
}

export interface MediaMeta {
  title:       string;
  platform:    string;       // normalised lowercase: "youtube" | "instagram" | "facebook" | "generic"
  duration?:   number;       // seconds
  thumbnail?:  string;       // URL
  description?: string;
  uploader?:   string;
  viewCount?:  number;
  formats:     FormatOption[];
}

export interface PreviewMeta {
  title:      string;
  platform:   string;
  thumbnail?: string;
  duration?:  number;
  uploader?:  string;
}

export interface IExtractor {
  readonly platform: string;
  getMetadata(url: string): Promise<MediaMeta>;
  getPreview(url: string):  Promise<PreviewMeta>;
  getStreamUrl(url: string, formatId: string): Promise<string>;
}

/* ─── Extractors ──────────────────────────────────────────────────── */

import { YoutubeExtractor }   from './youtube.js';
import { InstagramExtractor } from './instagram.js';
import { FacebookExtractor }  from './facebook.js';
import { GenericExtractor }   from './generic.js';

/* ─── Registry ────────────────────────────────────────────────────── */

interface RegistryEntry {
  match:     RegExp;
  extractor: IExtractor;
}

/**
 * REGISTRY order matters — first match wins.
 * Keep GenericExtractor last as the catch-all.
 */
export const REGISTRY: RegistryEntry[] = [
  {
    match:     /(?:youtube\.com|youtu\.be)/i,
    extractor: new YoutubeExtractor(),
  },
  {
    match:     /(?:instagram\.com)/i,
    extractor: new InstagramExtractor(),
  },
  {
    match:     /(?:facebook\.com|fb\.watch|fb\.com)/i,
    extractor: new FacebookExtractor(),
  },
  {
    // catch-all — supports 1000+ sites via yt-dlp
    match:     /.+/,
    extractor: new GenericExtractor(),
  },
];

/**
 * Returns the best extractor for the given URL.
 * Always returns GenericExtractor as the fallback.
 */
export function getExtractor(url: string): IExtractor {
  const entry = REGISTRY.find(r => r.match.test(url));
  return entry!.extractor; // always found — last entry matches everything
}

/**
 * Returns the normalised platform name for a URL.
 */
export function detectPlatform(url: string): string {
  return getExtractor(url).platform;
}
