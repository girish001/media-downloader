/**
 * backend/src/extractors/instagram.ts
 * ──────────────────────────────────────
 * Instagram extractor via yt-dlp.
 *
 * Supports:
 *   - Reels:    instagram.com/reels/<shortcode>/
 *   - Posts:    instagram.com/p/<shortcode>/
 *   - Stories:  instagram.com/stories/<username>/<id>/
 *   - TV:       instagram.com/tv/<shortcode>/
 *
 * FIX: Removed '--no-playlist' from extraArgs().
 * base.ts fetchInfo() already adds --no-playlist per-call. Having it in
 * extraArgs() caused it to be passed twice, producing yt-dlp arg-parse
 * warnings: "WARNING: --no-playlist is redundant with --no-playlist"
 * and in some yt-dlp versions caused the second flag to override or
 * conflict with internal playlist handling.
 */

import type { MediaMeta, PreviewMeta, FormatOption } from './index.js';
import { BaseExtractor }               from './base.js';

export class InstagramExtractor extends BaseExtractor {
  readonly platform = 'instagram';

  protected extraArgs(): string[] {
    const args: string[] = [
      '--no-warnings',
    ];

    // If a cookies file is configured, pass it for private content
    const cookiesFile = process.env.IG_COOKIES_FILE;
    if (cookiesFile) {
      args.push('--cookies', cookiesFile);
    }

    // Instagram session ID can be passed as a header
    const sessionId = process.env.IG_SESSION_ID;
    if (sessionId) {
      args.push(
        '--add-header', `Cookie:sessionid=${sessionId}`,
        '--add-header', 'User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      );
    }

    return args;
  }

  async getMetadata(url: string): Promise<MediaMeta> {
    const meta = await super.getMetadata(url);

    // Instagram delivers pre-muxed single streams. Offer standard quality tiers
    // so the user can choose — the worker will re-encode to the exact target resolution.
    const videoFormats: FormatOption[] = [
      { id: '1080p', label: '1080p HD',   ext: 'mp4', hasVideo: true, hasAudio: true, ytdlpFormatId: 'best[height<=1080][ext=mp4]/best[height<=1080]/best' },
      { id: '720p',  label: '720p HD',    ext: 'mp4', hasVideo: true, hasAudio: true, ytdlpFormatId: 'best[height<=720][ext=mp4]/best[height<=720]/best'  },
      { id: '480p',  label: '480p SD',    ext: 'mp4', hasVideo: true, hasAudio: true, ytdlpFormatId: 'best[height<=480][ext=mp4]/best[height<=480]/best'  },
      { id: 'mp3',   label: 'MP3 Audio',  ext: 'mp3', hasVideo: false, hasAudio: true, ytdlpFormatId: 'bestaudio/best' },
    ];
    meta.formats = videoFormats;
    return meta;
  }

  async getPreview(url: string): Promise<PreviewMeta> {
    const preview = await super.getPreview(url);
    if (!preview.title || preview.title === 'Untitled') {
      preview.title = 'Instagram Video';
    }
    return preview;
  }
}
