// In-memory sliding window rate limiter
// Suitable for single-instance Next.js deployment

const tracker = new Map();

/**
 * Clean up old keys every 5 minutes to prevent memory leak
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of tracker.entries()) {
    if (record.resetAt <= now) {
      tracker.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Check if a request exceeds the limit
 * @param {string} identifier - e.g. IP or IP:action
 * @param {number} max - maximum allowed attempts within window
 * @param {number} windowSeconds - time window in seconds
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function checkRateLimit(identifier, max = 10, windowSeconds = 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  let record = tracker.get(identifier);

  if (!record || record.resetAt <= now) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    tracker.set(identifier, record);
    return { allowed: true, remaining: max - 1, retryAfter: 0 };
  }

  if (record.count >= max) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: max - record.count, retryAfter: 0 };
}

/**
 * Extract client IP from Request headers
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
