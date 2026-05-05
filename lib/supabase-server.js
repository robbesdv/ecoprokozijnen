import { createClient } from '@supabase/supabase-js'

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL ontbreekt')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt')

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
