import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * AppSumo redemption codes: RW-<10 random chars>-<10 char HMAC signature>.
 * Codes verify against APPSUMO_CODE_SECRET without a stored code list;
 * single use is enforced by appsumo_redemptions/{code} in Firestore.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PART_LENGTH = 10;
const PREFIX = 'RW';

function toAlphabet(bytes: Buffer, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function sign(body: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(`${PREFIX}-${body}`).digest();
  return toAlphabet(digest, PART_LENGTH);
}

export function getCodeSecret(): string {
  const secret = process.env.APPSUMO_CODE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('APPSUMO_CODE_SECRET is not configured.');
  }
  return secret;
}

export function generateCode(secret: string): string {
  const body = toAlphabet(randomBytes(PART_LENGTH), PART_LENGTH);
  return `${PREFIX}-${body}-${sign(body, secret)}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidCode(input: string, secret: string): boolean {
  const code = normalizeCode(input);
  const match = /^RW-([A-Z0-9]{10})-([A-Z0-9]{10})$/.exec(code);
  if (!match) return false;
  const expected = Buffer.from(sign(match[1], secret));
  const actual = Buffer.from(match[2]);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
