import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Supabase is used ONLY for authentication/session management in this
 * app. All product/order/customer data goes through the Node.js API —
 * never query Supabase tables directly from the frontend.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
