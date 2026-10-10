import { NextResponse } from 'next/server';
import { analyzeBrand } from '@/lib/studio/brand-analysis';
import {
  BrandRequestError,
  releaseAnalysis,
  requireUid,
  reserveAnalysis,
  saveAnalysis,
} from '@/lib/studio/brand-store';
import { WebsiteError, normalizeWebsiteUrl, scrapeWebsite } from '@/lib/studio/website';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  let uid: string;
  let url: string;
  try {
    uid = await requireUid(request);
    const body = (await request.json().catch(() => ({}))) as { url?: unknown };
    url = normalizeWebsiteUrl(String(body.url || ''));
    await reserveAnalysis(uid);
  } catch (error) {
    if (error instanceof BrandRequestError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof WebsiteError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error('[brand] analyze setup failed', error);
    return NextResponse.json({ ok: false, error: 'Couldn’t start the analysis.' }, { status: 500 });
  }

  try {
    const site = await scrapeWebsite(url);
    const { fields, ideas } = await analyzeBrand(site);
    const brand = await saveAnalysis(uid, site.url, fields, ideas);
    return NextResponse.json({ ok: true, brand });
  } catch (error) {
    await releaseAnalysis(uid);
    if (error instanceof WebsiteError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 422 });
    }
    console.error('[brand] analyze failed', error);
    return NextResponse.json(
      { ok: false, error: 'We couldn’t analyze that website right now. Try again in a moment.' },
      { status: 502 }
    );
  }
}
