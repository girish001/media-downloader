/**
 * middleware/captcha.ts
 * ──────────────────────
 * Cloudflare Turnstile CAPTCHA verification.
 *
 * Configuration:
 *   CAPTCHA_SECRET_KEY  — Turnstile secret key from Cloudflare dashboard.
 *                         Leave unset to disable CAPTCHA entirely.
 *   CAPTCHA_SITE_KEY    — Public site key (used by the frontend widget).
 *
 * Frontend integration:
 *   1. Add the Turnstile widget to your form:
 *      <div class="cf-turnstile" data-sitekey="${NEXT_PUBLIC_CAPTCHA_SITE_KEY}"></div>
 *   2. Include the script: https://challenges.cloudflare.com/turnstile/v0/api.js
 *   3. Pass the cf-turnstile-response token in the POST /api/download body as captchaToken.
 *
 * To switch to reCAPTCHA v3 or hCaptcha, replace VERIFY_URL and adjust the
 * response parsing below — the interface stays the same.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResponse {
  success:      boolean;
  'error-codes'?: string[];
  hostname?:    string;
  action?:      string;
  cdata?:       string;
}

/**
 * Verify a Cloudflare Turnstile token.
 *
 * @param token   The token from cf-turnstile-response form field.
 * @param ip      The client's IP address (optional but recommended).
 * @returns       true if verification passed, false otherwise.
 */
export async function verifyCaptcha(token: string | undefined, ip?: string): Promise<boolean> {
  const secretKey = process.env.CAPTCHA_SECRET_KEY;

  // If no secret key configured, captcha is disabled — always pass
  if (!secretKey) return true;

  // Token is required when captcha is enabled
  if (!token || token.trim().length === 0) {
    return false;
  }

  try {
    const formData = new URLSearchParams({
      secret:   secretKey,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    });

    const res = await fetch(VERIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    formData.toString(),
      signal:  AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      console.warn(`[captcha] Turnstile API returned HTTP ${res.status}`);
      // Fail open if Cloudflare is unreachable (degrade gracefully)
      return process.env.CAPTCHA_FAIL_OPEN === 'true';
    }

    const data = (await res.json()) as TurnstileResponse;

    if (!data.success) {
      console.warn('[captcha] Verification failed:', data['error-codes']);
    }

    return data.success;
  } catch (err: any) {
    console.error('[captcha] Verification error:', err.message);
    // Fail open on network errors — don't block legitimate users
    return process.env.CAPTCHA_FAIL_OPEN === 'true';
  }
}
