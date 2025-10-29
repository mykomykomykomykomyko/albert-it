/**
 * Secure CORS Configuration
 * 
 * Provides environment-aware CORS headers that restrict access to known origins.
 * In production, this prevents unauthorized cross-origin requests.
 */

// Get allowed origins from environment or use secure defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  
  // Default allowed origins for Lovable Cloud
  return [
    "https://irasizphibjnkhrpfoza.supabase.co",
    "https://albert.it.com",
    /https:\/\/.*\.lovable\.app$/.source, // All Lovable preview URLs
  ];
};

const allowedOrigins = getAllowedOrigins();

/**
 * Get CORS headers based on request origin
 * Returns appropriate Access-Control-Allow-Origin header
 */
export const getCorsHeaders = (origin?: string | null): Record<string, string> => {
  // For development/testing, allow wildcard if no origin specified
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed.startsWith("/") && allowed.endsWith("/")) {
      // Regex pattern
      const regex = new RegExp(allowed.slice(1, -1));
      return regex.test(origin);
    }
    return allowed === origin;
  });

  if (isAllowed) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // Return restrictive headers for unknown origins
  return {
    "Access-Control-Allow-Origin": "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

/**
 * Legacy CORS headers for backward compatibility
 * Use getCorsHeaders() for new implementations
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
