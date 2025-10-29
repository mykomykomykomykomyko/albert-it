/**
 * Simple In-Memory Rate Limiter
 * 
 * Prevents abuse by limiting requests per IP address or user.
 * For production, consider using Redis or Supabase for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const defaultRateLimit: RateLimitConfig = {
  maxRequests: 100, // 100 requests
  windowMs: 60 * 1000, // per minute
};

/**
 * Check if request should be rate limited
 * @param identifier Unique identifier (IP address, user ID, etc.)
 * @param config Rate limit configuration
 * @returns Object with allowed status and retry information
 */
export const checkRateLimit = (
  identifier: string,
  config: RateLimitConfig = defaultRateLimit
): { allowed: boolean; remaining: number; resetAt: number } => {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment counter
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
};

/**
 * Get client identifier from request
 * Uses IP address or authenticated user ID
 */
export const getClientIdentifier = (req: Request): string => {
  // Try to get user ID from authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Use token as identifier (in production, decode JWT to get user ID)
    return `user:${token.slice(0, 20)}`;
  }

  // Fall back to IP address
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() || 
             req.headers.get("x-real-ip") || 
             "unknown";
  return `ip:${ip}`;
};

/**
 * Create rate limit response
 */
export const createRateLimitResponse = (resetAt: number, corsHeaders: Record<string, string>): Response => {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    }
  );
};
