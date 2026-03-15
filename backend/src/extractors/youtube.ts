/**
 * backend/src/extractors/youtube.ts
 *
 * Stable YouTube extractor configuration for server environments.
 * Uses web_embedded first to avoid n-challenge failures and ensure
 * formats are always returned even without full browser JS runtime.
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

  for (const p of patterns) {
    const m = s.match(p);
    if (m) {
      id = m[1]!;
      break;
    }
  }

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

      // enable yt-dlp JS challenge solver
      '--remote-components',
      'ejs:github',

      '--add-header',
      'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      // important: avoid missing formats
      '--extractor-args',
      'youtube:player_client=web_embedded'
    ];

    if (process.env.YT_COOKIES_FILE) {
      args.push('--cookies', process.env.YT_COOKIES_FILE);
    }

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
