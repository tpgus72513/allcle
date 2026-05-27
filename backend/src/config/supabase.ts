import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase 서버사이드 클라이언트.
 * Service Role Key를 쓰므로 RLS 우회 — 운영에선 RLS 정책 켜고 anon key로 분리하는 게 정석.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
