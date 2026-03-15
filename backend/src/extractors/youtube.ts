/**
 * backend/src/extractors/youtube.ts
 */

import { BaseExtractor } from './base.js';
import type { MediaMeta, PreviewMeta } from './index.js';

function normaliseYouTubeUrl(url: string): string {
  const s = url.trim();
  let videoId: string | null = null;

  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) videoId = short[1]!;

  if (!videoId) {
    const shorts = s.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) videoId = shorts[1]!;
  }
  if (!videoId) {
    const watch = s.match(/youtube\.com\/watch\?.*?[?&]v=([A-Za-z0-9_-]{11})/);
    if (watch) videoId = watch[1]!;
  }
  if (!videoId) {
    const embed = s.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    if (embed) videoId = embed[1]!;
  }
  if (!videoId) {
    const live = s.match(/youtube\.com\/live\/([A-Za-z0-9_-]{11})/);
    if (live) videoId = live[1]!;
  }

  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
}

export class YoutubeExtractor extends BaseExtractor {
  readonly platform = 'youtube';

  protected extraArgs(): string[] {
    const args: string[] = [
      '--geo-bypass',
      '--force-ipv4',
      '--no-cache-dir',
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

    // Client order matters critically on Railway/GCP (2026):
    //
    // 'web' + cookies: YouTube treats as authenticated browser session.
    //   With valid SAPISID/LOGIN_INFO cookies, bypasses po_token requirement
    //   entirely. This is the PRIMARY path when cookies are set.
    //
    // 'tv_embedded': YouTube TV embed client. Server-side permitted.
    //   Does NOT require po_token or auth. Works for most public videos.
    //   Best non-auth fallback.
    //
    // 'web_embedded': YouTube iframe embed. Different CDN endpoint.
    //   Also server-side permitted, no po_token.
    //
    // 'ios': Apple AppAttest auth path. Not subject to browser po_token.
    //
    // 'mweb': Mobile web. Most permissive, last resort.
    //
    // NOTE: 'default' was removed — it triggers SABR streaming which
    // requires po_token from GCP IPs even with valid cookies (2025+).
    args.push(
      '--extractor-args',
      'youtube:player_client=web,tv_embedded,web_embedded,ios,mweb',
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
