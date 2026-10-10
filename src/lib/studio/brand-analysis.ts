import type { BrandAdIdea, BrandProfileFields } from '@/lib/types';
import type { ScrapedWebsite } from '@/lib/studio/website';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const BRAND_MODEL = process.env.BRAND_MODEL || 'gemini-3.6-flash';

function getApiKey() {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not available.');
  return key;
}

const STRING = { type: 'STRING' };
const STRING_LIST = { type: 'ARRAY', items: STRING };

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: STRING,
    summary: STRING,
    offerings: STRING_LIST,
    audience: STRING,
    tone: STRING,
    visualStyle: STRING,
    offers: STRING_LIST,
    primaryColor: STRING,
    secondaryColor: STRING,
    accentColor: STRING,
    logoUrl: STRING,
    ideas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: STRING,
          concept: STRING,
          why: STRING,
          format: { type: 'STRING', enum: ['video', 'image'] },
          aspectRatio: { type: 'STRING', enum: ['9:16', '16:9'] },
          length: { type: 'INTEGER' },
          prompt: STRING,
        },
        required: ['title', 'concept', 'why', 'format', 'aspectRatio', 'length', 'prompt'],
      },
    },
  },
  required: [
    'name',
    'summary',
    'offerings',
    'audience',
    'tone',
    'visualStyle',
    'offers',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'ideas',
  ],
};

function buildPrompt(site: ScrapedWebsite) {
  return `You are a senior performance-marketing creative strategist. Read this business's website and (1) build a brand profile, then (2) recommend exactly 6 ads they should make first.

Website: ${site.url}
Page title: ${site.title || '(none)'}
Meta description: ${site.description || '(none)'}
Hex colors seen in the page CSS (noisy, most frequent first): ${site.colorHints.join(', ') || '(none)'}
Logo candidates: ${site.logoCandidates.join(', ') || '(none)'}

Website content:
---
${site.text}
---

Brand profile rules:
- name: the business or brand name.
- summary: one or two plain sentences on what they sell and to whom.
- offerings: 3 to 6 specific products or services named on the site.
- audience: who buys from them, specific (e.g. "busy parents in Austin who want healthy takeout").
- tone: how their ads should sound, 3 to 6 words.
- visualStyle: one sentence describing the look their video ads should have (setting, lighting, color palette, energy).
- offers: promotions, prices, guarantees or calls to action that appear on the site. Use an empty list if none appear. Never invent offers or prices.
- primaryColor, secondaryColor, accentColor: 6-digit hex. Prefer real brand colors from the hints; otherwise infer from the business.
- logoUrl: the best candidate that looks like a logo, or an empty string.

Ad idea rules:
- Exactly 6 ideas, mostly video (at least 5). Mix formats that fit this business, e.g. product showcase, UGC-style testimonial, offer promo, behind the scenes, before and after, problem and solution.
- title: short and specific. concept: one sentence. why: one sentence on why it should perform for this audience.
- aspectRatio: "9:16" for Reels, TikTok and Shorts (default), "16:9" only when YouTube or web clearly suits it better.
- length: 10 or 20 seconds (use 20 only for ideas that need more story).
- prompt: a complete, ready-to-run brief for an AI video model (or image model when format is "image"), 60 to 110 words. Describe concrete shots, people, setting, motion, lighting and music using this business's real products or services. Use the brand colors in wardrobe, props or set design. Open with "Vertical" or "Widescreen" to match aspectRatio.
- Prompts must never ask for on-screen text, logos, captions or prices, because the model can't render them. End video prompts with "No text on screen."
- Only UGC-style ideas may include speech: one short line in quotes, said to camera. Otherwise end with "No dialogue."
- Never put placeholders or square brackets in prompts. Never claim results, awards or prices the site doesn't state.`;
}

function hex(value: unknown, fallback: string) {
  const v = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : fallback;
}

function text(value: unknown, max: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function list(value: unknown, maxItems: number, maxLen: number) {
  return (Array.isArray(value) ? value : [])
    .map((item) => text(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeIdeas(raw: unknown): BrandAdIdea[] {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map((item: any, index): BrandAdIdea | null => {
      const prompt = text(item?.prompt, 1500).replace(/\[[^\]]*\]/g, '').trim();
      const title = text(item?.title, 80);
      if (!prompt || prompt.length < 40 || !title) return null;
      const length = Number(item?.length) >= 20 ? 20 : 10;
      return {
        id: `idea-${index + 1}`,
        title,
        concept: text(item?.concept, 240),
        why: text(item?.why, 240),
        format: item?.format === 'image' ? 'image' : 'video',
        aspectRatio: item?.aspectRatio === '16:9' ? '16:9' : '9:16',
        length,
        prompt,
      };
    })
    .filter((idea): idea is BrandAdIdea => idea !== null)
    .slice(0, 6);
}

export interface BrandAnalysis {
  fields: Omit<BrandProfileFields, 'applyToAds'>;
  ideas: BrandAdIdea[];
}

export async function analyzeBrand(site: ScrapedWebsite): Promise<BrandAnalysis> {
  const apiKey = getApiKey();
  const response = await fetch(`${API_BASE}/models/${BRAND_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(site) }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const body = await response.text();
  let raw: any = {};
  try {
    raw = body ? JSON.parse(body) : {};
  } catch {
    raw = {};
  }
  if (!response.ok) {
    throw new Error(raw?.error?.message || `Brand analysis failed (HTTP ${response.status}).`);
  }

  const output = (raw?.candidates?.[0]?.content?.parts || [])
    .map((part: any) => part?.text || '')
    .join('');
  let parsed: any;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('The brand analysis came back incomplete. Try again.');
  }

  const logo = text(parsed.logoUrl, 600);
  return {
    fields: {
      name: text(parsed.name, 80) || site.title.slice(0, 80) || new URL(site.url).hostname,
      summary: text(parsed.summary, 400),
      offerings: list(parsed.offerings, 6, 80),
      audience: text(parsed.audience, 240),
      tone: text(parsed.tone, 120),
      visualStyle: text(parsed.visualStyle, 300),
      offers: list(parsed.offers, 5, 120),
      colors: {
        primary: hex(parsed.primaryColor, '#1F2937'),
        secondary: hex(parsed.secondaryColor, '#F3F4F6'),
        accent: hex(parsed.accentColor, '#F59E0B'),
      },
      logoUrl: /^https?:\/\//i.test(logo) ? logo : site.logoCandidates[0] || null,
    },
    ideas: normalizeIdeas(parsed.ideas),
  };
}
