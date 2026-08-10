/** sessionStorage key: set when signup should send (or re-send) a verification email. */
export const VERIFY_EMAIL_PENDING_KEY = 'reelwright.verifyEmailPending';

export function markVerificationEmailPending(email: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      VERIFY_EMAIL_PENDING_KEY,
      JSON.stringify({ email, at: Date.now() })
    );
  } catch {
    // ignore quota / private mode
  }
}

export function consumeVerificationEmailPending(): { email: string; at: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(VERIFY_EMAIL_PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(VERIFY_EMAIL_PENDING_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
