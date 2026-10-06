import { firebaseConfig } from '@/firebase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STORAGE_HOST = 'firebasestorage.googleapis.com';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

function safeBaseName(input: string | null): string {
  const cleaned = (input || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || 'reelwright';
}

/** Streams a file from this project's Storage bucket back as an attachment. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get('url');

  let target: URL;
  try {
    target = new URL(raw || '');
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  const allowedPrefix = `/v0/b/${firebaseConfig.storageBucket}/o/`;
  if (
    target.protocol !== 'https:' ||
    target.hostname !== STORAGE_HOST ||
    !target.pathname.startsWith(allowedPrefix)
  ) {
    return new Response('Unsupported url', { status: 400 });
  }

  const upstream = await fetch(target, { cache: 'no-store' });
  if (!upstream.ok || !upstream.body) {
    return new Response('File not found', { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
  const ext = EXTENSIONS[contentType];
  const filename = `${safeBaseName(params.get('filename'))}${ext ? `.${ext}` : ''}`;

  const headers = new Headers({
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
  });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);

  return new Response(upstream.body, { headers });
}
