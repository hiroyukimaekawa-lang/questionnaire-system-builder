import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {publicEnv} from '@/lib/env';

export function createAdminClient(){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if(!key)throw new Error('招待機能のサーバー設定が不足しています。');
  const {url}=publicEnv();
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
