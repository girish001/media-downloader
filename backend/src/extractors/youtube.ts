/**
 * backend/src/extractors/youtube.ts
 *
 * CONFIRMED FROM RAILWAY LOGS (2026.03.13):
 *
 * INVALID clients (yt-dlp throws "Skipping unsupported client"):
 *   - tv_embedded    → removed in yt-dlp 2026.03.x
 *   - android_embedded → removed in yt-dlp 2026.03.x
 *   - ios → skipped when cookies are provided ("does not support cookies")
 *   - mweb → needs GVS PO Token (not available server-side)
 *
 * VALID clients for Railway + cookies:
 *   - web         → Full YouTube web. Uses Node.js (in PATH) for n-challenge.
 *                   With SAPISID + __Secure-3PAPISID cookies = works from GCP.
 *   - web_creator → YouTube Studio client. Also works with cookies.
 *   - web_embedded → iframe embed, limited formats, no n-challenge needed.
 *
 * N-CHALLENGE: Node.js is at /usr/local/bin/node in the container and is
 * in PATH. yt-dlp auto-detects it. The n-challenge WILL be solved when
 * only valid clients are used.
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
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

    // ONLY use clients confirmed valid in yt-dlp 2026.03.x on Railway:
    // web + web_creator + web_embedded
    // All invalid clients (tv_embedded, android_embedded, ios, mweb) removed.
    args.push(
      '--extractor-args',
      'youtube:player_client=web,web_creator,web_embedded',
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
