import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {publicEnv} from '@/lib/env';

/** Cookie-free client for published survey reads and anonymous submissions. */
export function createPublicClient(){
  const {url,anonKey}=publicEnv();
  return createSupabaseClient(url,anonKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
