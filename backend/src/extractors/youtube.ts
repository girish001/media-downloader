/**
 * backend/src/extractors/youtube.ts
 *
 * CONFIRMED FROM RAILWAY LOGS (2026.03.13):
 *
 * Client status on Railway GCP IPs:
 *   web          → WORKS for metadata but n-challenge fails without Deno/EJS
 *                  → yt-dlp skips all HTTPS formats → zero formats returned
 *   web_creator  → Needs GVS PO Token (not available server-side)
 *   web_embedded → ALWAYS WORKS: no n-challenge, no po_token, any IP ✓
 *   tv_embedded  → REMOVED from yt-dlp 2026.03.x
 *   ios          → Skipped when cookies provided
 *   mweb         → Needs GVS PO Token
 *
 * STRATEGY:
 *   Metadata fetch (this file): use web_embedded ONLY
 *     → Always works, public videos, no n-challenge, no po_token
 *     → Returns all format metadata (title, thumbnail, available resolutions)
 *     → The format URLs in JSON are embed URLs (no n-param problem)
 *
 *   Worker download: uses web client + Deno (installed in Dockerfile)
 *     → Deno solves n-challenge for high-quality stream decryption
 */

import { BaseExtractor } from './base.js';
import type { MediaMeta, PreviewMeta } from './index.js';

function normaliseYouTubeUrl(url: string): string {
  const s = url.trim();
  let id: string | null = null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?.*?[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = s.match(p); if (m) { id = m[1]!; break; } }
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

export class YoutubeExtractor extends BaseExtractor {
  readonly platform = 'youtube';

 protected extraArgs(): string[] {
  const args: string[] = [
    '--geo-bypass',
    '--force-ipv4',
    '--no-cache-dir',
    '--no-mark-watched',

    '--remote-components',
    'ejs:github',

    '--add-header',
    'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

    // Use web + web_embedded:
    // - web: best quality metadata, works when Deno is available for n-challenge
    // - web_embedded: fallback, always works without n-challenge or po_token
    // If web fails n-challenge, web_embedded still provides format list
    args.push(
      '--extractor-args',
      'youtube:player_client=web,web_embedded',
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
