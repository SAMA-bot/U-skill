/**
 * Shared CORS configuration for Edge Functions
 * Restricts origins to known application domains for security
 */

// Allowed origins for CORS requests
// Add your production and development domains here
const ALLOWED_ORIGINS = [
  'https://faculty-spark-boost.lovable.app',
  'https://id-preview--a38a92b7-1e4f-46c5-8f7e-8a0544f61dd7.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

/**
 * Validates the origin and returns appropriate CORS headers
 * Falls back to the first allowed origin if the request origin is not allowed
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

/**
 * Checks if the given origin is in the allowed list
 */
export function isOriginAllowed(origin: string | null): boolean {
  return origin !== null && ALLOWED_ORIGINS.includes(origin);
}
