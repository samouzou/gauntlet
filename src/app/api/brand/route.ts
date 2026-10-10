import { NextResponse } from 'next/server';
import {
  BrandRequestError,
  brandFieldsSchema,
  getBrand,
  requireUid,
  saveBrandFields,
} from '@/lib/studio/brand-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof BrandRequestError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error('[brand] request failed', error);
  return NextResponse.json(
    { ok: false, error: 'Something went wrong saving your brand. Try again.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const uid = await requireUid(request);
    return NextResponse.json({ ok: true, brand: await getBrand(uid) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const uid = await requireUid(request);
    const parsed = brandFieldsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Check your brand details.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, brand: await saveBrandFields(uid, parsed.data) });
  } catch (error) {
    return errorResponse(error);
  }
}
