// Best-effort in-memory rate limit for the internal assistant routes. This is
// per-warm-instance, not distributed (unlike rateLimitSurveyResponse, which has a
// real Cloudflare Rate Limiting binding) - acceptable for V1 because these routes
// already require an authenticated, active admin/sales profile, which is a much
// smaller abuse surface than the public survey-response endpoint.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, {count: number; resetAt: number}>();

export function checkRateLimit(key: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, {count: 1, resetAt: now + WINDOW_MS});
    return true;
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}
