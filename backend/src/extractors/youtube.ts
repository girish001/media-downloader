/**
 * backend/src/extractors/youtube.ts
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
      // Desktop Windows Chrome UA — matches 'web' client behavior
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

    // Client chain explanation:
    //
    // 'web' — Full YouTube web client. With valid SAPISID + __Secure-3PAPISID cookies,
    //   this bypasses po_token requirements even from GCP IPs. Most formats available.
    //
    // 'tv_embedded' — YouTube TV embed. Server-side permitted, no po_token needed.
    //   Works without cookies for most public videos.
    //
    // 'web_embedded' — YouTube iframe embed. Different CDN endpoint from tv_embedded.
    //
    // 'ios' — Apple AppAttest auth. Not subject to browser po_token.
    //
    // 'android_embedded' — Android embed client. Often bypasses restrictions that
    //   affect web clients. Good fallback for music/label content.
    //
    // 'mweb' — Mobile web last resort.
    args.push(
      '--extractor-args',
      'youtube:player_client=web,tv_embedded,web_embedded,ios,android_embedded,mweb',
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
