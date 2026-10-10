import { NextResponse } from 'next/server';
import {
  generateSceneSchema,
  runGenerateScene,
} from '@/lib/studio/run-generate-scene';

// Long-running Omni generate/edit — keep this off Server Actions (RSC framing
// dies on large/slow edit responses with "unexpected response").
export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = generateSceneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'Invalid generate request.' },
      { status: 400 }
    );
  }

  const result = await runGenerateScene(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
