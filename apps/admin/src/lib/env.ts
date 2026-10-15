/**
 * Centralized, validated access to build-time env vars. Importing this
 * module anywhere guarantees required vars are present at startup
 * instead of failing deep inside a component or API call.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    )
  }
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiBaseUrl: required('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
  imageKitUrlEndpoint: required(
    'VITE_IMAGEKIT_URL_ENDPOINT',
    import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
  ),
}
