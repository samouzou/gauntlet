import { NextResponse } from 'next/server';
import {
  generateImageSchema,
  runGenerateImage,
} from '@/lib/studio/run-generate-image';

export const maxDuration = 180;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = generateImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'Invalid image request.' },
      { status: 400 }
    );
  }

  const result = await runGenerateImage(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
