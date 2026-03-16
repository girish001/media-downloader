/**
 * worker/src/ffmpeg.ts
 * ─────────────────────
 * FFmpeg argument builders and progress-parsing process runner.
 */

import { spawn }   from 'node:child_process';
import { mkdir }   from 'node:fs/promises';
import path        from 'node:path';
import { execa }   from 'execa';

export interface FFmpegOptions {
  streamUrl:  string;
  format:     string;
  outputPath: string;
}

// Maximum video duration in seconds. Default 2 hours (7200s).
const MAX_DURATION_SEC = Number(process.env.MAX_VIDEO_DURATION_SEC || 7200);

/**
 * Probe a local/remote file and return its duration in seconds.
 * Returns 0 if duration cannot be determined (non-fatal).
 */
export async function probeDuration(ffmpegPath: string, streamUrl: string): Promise<number> {
  const ffprobePath = ffmpegPath.replace(/ffmpeg$/, 'ffprobe');
  try {
    const result = await execa(ffprobePath, [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      streamUrl,
    ], { timeout: 15_000 });
    const dur = parseFloat(result.stdout.trim());
    return isNaN(dur) ? 0 : dur;
  } catch {
    return 0;
  }
}

/**
 * Check duration against MAX_VIDEO_DURATION_SEC.
 * Throws if the video exceeds the configured limit.
 */
export async function checkDurationLimit(ffmpegPath: string, streamUrl: string): Promise<void> {
  if (MAX_DURATION_SEC <= 0) return;
  const duration = await probeDuration(ffmpegPath, streamUrl);
  if (duration > 0 && duration > MAX_DURATION_SEC) {
    const maxMins = Math.floor(MAX_DURATION_SEC / 60);
    const vidMins = Math.floor(duration / 60);
    throw new Error(
      `Video is ${vidMins} minutes long, which exceeds the ${maxMins}-minute limit.`
    );
  }
}

/**
 * Build FFmpeg args for video or audio encoding.
 *
 * Scale filter: portrait-safe, forces the SHORT side to TARGET pixels.
 *   - Landscape (w > h): sets HEIGHT = TARGET, auto-calculates width  → e.g. 1920x1080 @ 720 → 1280x720
 *   - Portrait  (h > w): sets WIDTH  = TARGET, auto-calculates height → e.g. 1080x1920 @ 720 → 720x1280
 *   This correctly handles Instagram/Facebook Reels (9:16 portrait) without squashing them.
 *   Upscaling is intentional — if a user selects 1440p they expect a 1440p output file.
 *   Lanczos resampling gives the sharpest result for both up and downscaling.
 *   Comma escaping: FFmpeg filtergraph commas inside if() must be \, — in Node spawn()
 *   (no shell) we write \\, in the TS template to produce \, at runtime.
 */
export function buildFFmpegArgs(opts: FFmpegOptions): string[] {
  const { streamUrl, format, outputPath } = opts;
  const base = ['-y', '-i', streamUrl, '-progress', 'pipe:2'];

  if (format === 'mp3') {
    return [...base, '-vn', '-codec:a', 'libmp3lame', '-q:a', '2', outputPath];
  }

  const presets: Record<string, { height: number; crf: string; preset: string; audio: string }> = {
    // Full quality ladder — ascending order matches VIDEO_HEIGHTS in base.ts
    '144p':  { height:  144, crf: '32', preset: 'veryfast', audio: '64k'  },
    '240p':  { height:  240, crf: '30', preset: 'veryfast', audio: '96k'  },
    '360p':  { height:  360, crf: '28', preset: 'veryfast', audio: '128k' },
    '480p':  { height:  480, crf: '26', preset: 'fast',     audio: '128k' },
    '720p':  { height:  720, crf: '24', preset: 'fast',     audio: '192k' },
    '1080p': { height: 1080, crf: '22', preset: 'medium',   audio: '192k' },
    '1440p': { height: 1440, crf: '20', preset: 'medium',   audio: '192k' },
    '4k':    { height: 2160, crf: '18', preset: 'slow',     audio: '256k' },
    // Aliases
    'hd':    { height: 1080, crf: '22', preset: 'medium',   audio: '192k' },
    'sd':    { height:  480, crf: '26', preset: 'fast',     audio: '128k' },
    'best':  { height: 1080, crf: '20', preset: 'medium',   audio: '192k' },
  };

  const p = presets[format.toLowerCase()] ?? presets['720p']!;

  // Portrait-safe scale filter.
  //
  // Problem: scale=-2:HEIGHT sets HEIGHT as the vertical dimension.
  // On portrait videos (e.g. Instagram Reels: 1080x1920) this wrongly scales
  // the WIDTH to 1080 and compresses height to ~608 — squashing the video.
  //
  // Fix: use the SHORTER side as the target dimension:
  //   - Landscape (w > h): scale HEIGHT to TARGET, auto-calculate width
  //   - Portrait  (h > w): scale WIDTH  to TARGET, auto-calculate height
  //
  // FFmpeg filter: scale='if(gt(iw\,ih)\,-2\,TARGET):if(gt(iw\,ih)\,TARGET\,-2)'
  //   if(gt(iw,ih), -2, TARGET)  → landscape: w=-2 (auto), h=TARGET
  //                               → portrait:  w=TARGET, h=-2 (auto)
  //
  // Comma escaping: In FFmpeg -vf filtergraph, commas separate filters.
  // Inside expressions like if(), commas must be escaped as \,
  // In Node spawn() args (no shell): \, in JS template → \, at runtime → correct.
  // flags=lanczos gives the sharpest result for both upscaling and downscaling.
  const T = p.height;
  const scaleFilter = `scale='if(gt(iw\\,ih)\\,-2\\,${T}):if(gt(iw\\,ih)\\,${T}\\,-2)':flags=lanczos`;

  return [
    ...base,
    '-vf',       scaleFilter,
    '-codec:v',  'libx264',
    '-crf',      p.crf,
    '-preset',   p.preset,
    '-codec:a',  'aac',
    '-b:a',      p.audio,
    '-movflags', '+faststart',
    outputPath,
  ];
}

/**
 * Spawn FFmpeg, parse progress from stderr, call onProgress(0-100).
 */
export async function runFFmpeg(
  ffmpegPath: string,
  args:       string[],
  onProgress: (percent: number) => Promise<void>,
): Promise<void> {
  await mkdir(path.dirname(args[args.length - 1]!), { recursive: true });

  return new Promise((resolve, reject) => {
    const proc        = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let   duration    = 0;
    let   lastPct     = -1;
    const stderrLines: string[] = [];

    proc.stderr!.on('data', async (chunk: Buffer) => {
      const text = chunk.toString();

      stderrLines.push(...text.split('\n').filter(Boolean));
      if (stderrLines.length > 20) stderrLines.splice(0, stderrLines.length - 20);

      // Parse total duration from FFmpeg header
      const durMatch = text.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (durMatch) {
        duration = Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + parseFloat(durMatch[3]);
      }

      // Parse encode progress
      const timeMatch = text.match(/out_time_ms=(\d+)/);
      if (timeMatch && duration > 0) {
        const elapsed = Number(timeMatch[1]) / 1_000_000;
        const percent = Math.min(99, Math.floor((elapsed / duration) * 100));
        if (percent > lastPct) {
          lastPct = percent;
          try { await onProgress(percent); } catch { /* non-fatal */ }
        }
      }
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        const lastError = stderrLines.filter(l => /[Ee]rror/.test(l)).pop()
                       ?? stderrLines[stderrLines.length - 1]
                       ?? '';
        reject(new Error(
          `FFmpeg exited with code ${code}.${lastError ? ' Detail: ' + lastError.trim() : ''}`
        ));
      }
    });

    proc.on('error', err => {
      reject(new Error(`FFmpeg spawn failed: ${err.message}. Is ffmpeg installed at "${ffmpegPath}"?`));
    });
  });
}
