/**
 * backend/src/extractors/generic.ts
 * ────────────────────────────────────
 * Catch-all extractor for any site supported by yt-dlp.
 * Used when no platform-specific extractor matches the URL.
 * Supports Twitter/X, TikTok, Vimeo, Twitch, Reddit, and 1000+ others.
 */

import { BaseExtractor } from './base.js';

export class GenericExtractor extends BaseExtractor {
  readonly platform = 'generic';

  protected extraArgs(): string[] {
    return [
      '--no-playlist',
      '--no-warnings',
    ];
  }
}
