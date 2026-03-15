/**
 * backend/src/extractors/facebook.ts
 * ──────────────────────────────────────
 * Facebook extractor via yt-dlp.
 *
 * Supports:
 *   - Videos:   facebook.com/watch/?v=<id>
 *   - Posts:    facebook.com/<user>/videos/<id>
 *   - Reels:    facebook.com/reels/<id>
 *   - Shorts:   fb.watch/<shortcode>
 *
 * FIX: Removed '--no-playlist' from extraArgs().
 * base.ts fetchInfo() already adds --no-playlist per-call. Having it in
 * extraArgs() caused duplicate flags and yt-dlp arg-parse warnings.
 */

import type { MediaMeta, PreviewMeta } from './index.js';
import { BaseExtractor }               from './base.js';

export class FacebookExtractor extends BaseExtractor {
  readonly platform = 'facebook';

  protected extraArgs(): string[] {
    const args: string[] = [
      '--no-warnings',
    ];

    const cookiesFile = process.env.FB_COOKIES_FILE;
    if (cookiesFile) {
      args.push('--cookies', cookiesFile);
    }

    // Facebook requires a realistic User-Agent
    args.push(
      '--add-header',
      'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    return args;
  }

  async getMetadata(url: string): Promise<MediaMeta> {
    const meta = await super.getMetadata(url);

    if (meta.formats.length === 0) {
      meta.formats = [
        { id: 'hd',   label: 'HD Quality',   ext: 'mp4', hasVideo: true, hasAudio: true, ytdlpFormatId: 'best[height>=720]/best' },
        { id: 'sd',   label: 'SD Quality',   ext: 'mp4', hasVideo: true, hasAudio: true, ytdlpFormatId: 'worst[height>=360]/worst' },
        { id: 'mp3',  label: 'MP3 Audio',    ext: 'mp3', hasVideo: false, hasAudio: true, ytdlpFormatId: 'bestaudio/best' },
      ];
    }

    return meta;
  }

  async getPreview(url: string): Promise<PreviewMeta> {
    const preview = await super.getPreview(url);
    if (!preview.title || preview.title === 'Untitled') {
      preview.title = 'Facebook Video';
    }
    return preview;
  }

  protected resolveFormatSelector(formatId: string): string {
    const fbSelectors: Record<string, string> = {
      'hd':  'best[height>=720]/bestvideo[height>=720]+bestaudio/best',
      'sd':  'worst[height>=360]/bestvideo[height<=480]+bestaudio/worst',
    };
    return fbSelectors[formatId.toLowerCase()] ?? super.resolveFormatSelector(formatId);
  }
}
