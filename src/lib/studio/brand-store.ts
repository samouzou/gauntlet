import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '@/firebase/admin';
import type { BrandAdIdea, BrandProfile, BrandProfileFields } from '@/lib/types';

export const ANALYSES_PER_DAY = 5;

export class BrandRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function requireUid(request: Request): Promise<string> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new BrandRequestError('Sign in to set up your brand.', 401);
  try {
    return (await getAuth().verifyIdToken(token)).uid;
  } catch {
    throw new BrandRequestError('Sign in again to continue.', 401);
  }
}

const brandDoc = (uid: string) => adminDb.collection('brands').doc(uid);

function today() {
  return new Date().toISOString().slice(0, 10);
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const shortText = (max: number) => z.string().trim().max(max);

export const brandFieldsSchema = z.object({
  name: shortText(80).min(1, 'Add your brand name.'),
  summary: shortText(400),
  offerings: z.array(shortText(80)).max(8),
  audience: shortText(240),
  tone: shortText(120),
  visualStyle: shortText(300),
  offers: z.array(shortText(120)).max(6),
  colors: z.object({ primary: hexColor, secondary: hexColor, accent: hexColor }),
  logoUrl: z.string().url().max(600).nullable(),
  applyToAds: z.boolean(),
});

function toProfile(data: FirebaseFirestore.DocumentData | undefined): BrandProfile | null {
  if (!data?.name) return null;
  return {
    name: data.name,
    summary: data.summary || '',
    offerings: data.offerings || [],
    audience: data.audience || '',
    tone: data.tone || '',
    visualStyle: data.visualStyle || '',
    offers: data.offers || [],
    colors: data.colors || { primary: '#1F2937', secondary: '#F3F4F6', accent: '#F59E0B' },
    logoUrl: data.logoUrl || null,
    applyToAds: data.applyToAds !== false,
    websiteUrl: data.websiteUrl || null,
    ideas: (data.ideas || []) as BrandAdIdea[],
    analysesToday: data.analysisDay === today() ? data.analysisCount || 0 : 0,
    analysesPerDay: ANALYSES_PER_DAY,
  };
}

export async function getBrand(uid: string) {
  const snap = await brandDoc(uid).get();
  return toProfile(snap.data());
}

export async function saveBrandFields(uid: string, fields: BrandProfileFields) {
  await brandDoc(uid).set(
    { ...fields, userId: uid, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return getBrand(uid);
}

/** Reserves one of today's analyses up front so parallel requests can't exceed the cap. */
export async function reserveAnalysis(uid: string) {
  const ref = brandDoc(uid);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const count = data.analysisDay === today() ? data.analysisCount || 0 : 0;
    if (count >= ANALYSES_PER_DAY) {
      throw new BrandRequestError(
        `You’ve analyzed ${ANALYSES_PER_DAY} websites today. Edit your brand by hand, or try again tomorrow.`,
        429
      );
    }
    tx.set(
      ref,
      { userId: uid, analysisDay: today(), analysisCount: count + 1 },
      { merge: true }
    );
  });
}

export async function releaseAnalysis(uid: string) {
  await brandDoc(uid)
    .update({ analysisCount: FieldValue.increment(-1) })
    .catch(() => {});
}

export async function saveAnalysis(
  uid: string,
  websiteUrl: string,
  fields: Omit<BrandProfileFields, 'applyToAds'>,
  ideas: BrandAdIdea[]
) {
  const ref = brandDoc(uid);
  const existing = (await ref.get()).data();
  await ref.set(
    {
      ...fields,
      ideas,
      websiteUrl,
      applyToAds: existing?.applyToAds !== false,
      userId: uid,
      analyzedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return getBrand(uid);
}
