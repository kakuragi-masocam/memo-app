import 'server-only'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const createSupabaseServerClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL 또는 SUPABASE_PUBLISHABLE_KEY 환경변수가 설정되어 있지 않습니다.'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
