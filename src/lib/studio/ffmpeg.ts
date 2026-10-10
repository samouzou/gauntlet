/**
 * Thin ffmpeg wrapper for stitching extended scenes.
 * Uses the bundled ffmpeg-static binary (no ffprobe), so metadata is parsed from `ffmpeg -i` stderr.
 */

import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const FFMPEG = process.env.FFMPEG_PATH?.trim() || (ffmpegStatic as unknown as string) || 'ffmpeg';

const VIDEO_OUT = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '24'];
const AUDIO_OUT = ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2'];

export interface ClipInfo {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

function run(args: string[], allowFailure = false): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr = (stderr + d).slice(-16_000)));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 || allowFailure
        ? resolve({ stdout, stderr })
        : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-800)}`))
    );
  });
}

export async function probe(file: string): Promise<ClipInfo> {
  // `ffmpeg -i` with no output always exits 1; the metadata is on stderr.
  const { stderr } = await run(['-hide_banner', '-i', file], true);
  const d = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : NaN;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Could not read the clip length.');
  }
  const v = stderr.match(/Stream #\S+.*Video:.*?(\d{2,5})x(\d{2,5})/);
  return {
    duration,
    width: v ? Number(v[1]) : 1280,
    height: v ? Number(v[2]) : 720,
    hasAudio: /Stream #\S+.*Audio:/.test(stderr),
  };
}

/**
 * Cuts [start, start + length) and normalizes it to width x height, 24fps, stereo AAC
 * (adds silence when the source has no audio) so pieces concat cleanly.
 */
export async function cut(
  src: string,
  dest: string,
  start: number,
  length: number,
  size: { width: number; height: number }
): Promise<void> {
  const { hasAudio } = await probe(src);
  const w = size.width - (size.width % 2);
  const h = size.height - (size.height % 2);
  await run([
    '-y', '-v', 'error',
    '-ss', start.toFixed(3), '-t', length.toFixed(3), '-i', src,
    ...(hasAudio ? [] : ['-f', 'lavfi', '-t', length.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo']),
    '-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0',
    '-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`,
    ...VIDEO_OUT, ...AUDIO_OUT, '-shortest', dest,
  ]);
}

/** Joins clips produced by `cut` (same size/fps/audio layout) end to end. */
export async function concat(clips: string[], dest: string): Promise<void> {
  const inputs = clips.flatMap((c) => ['-i', c]);
  const streams = clips.map((_, i) => `[${i}:v][${i}:a]`).join('');
  await run([
    '-y', '-v', 'error', ...inputs,
    '-filter_complex', `${streams}concat=n=${clips.length}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]', ...VIDEO_OUT, ...AUDIO_OUT,
    '-movflags', '+faststart', dest,
  ]);
}
