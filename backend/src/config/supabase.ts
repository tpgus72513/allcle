import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 .env에 설정해주세요.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
