import {createClient} from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AssistantAuthOk {
  user: {id: string};
  role: 'admin' | 'sales';
  // Returned so routes can make further authenticated, RLS-scoped queries (e.g.
  // resolving a survey's current draft) without creating a second client and
  // without ever trusting a client-supplied id for that lookup.
  s: SupabaseClient;
}

export interface AssistantAuthError {
  error: string;
  status: 401 | 403;
}

// Shared server-side gate for every /api/internal-assistant/* route: authenticated,
// active profile, admin or sales only. viewer and anonymous callers are rejected
// here regardless of what the UI shows - a direct API call can never bypass this.
export async function authorizeAssistantRequest(): Promise<AssistantAuthOk | AssistantAuthError> {
  const s = await createClient();
  const {data: {user}, error: authError} = await s.auth.getUser();
  if (authError || !user) return {error: 'ログインが必要です。', status: 401};
  const {data: profile, error: profileError} = await s.from('profiles').select('role,is_active').eq('id', user.id).single();
  if (profileError || !profile || !profile.is_active) return {error: '権限がありません。', status: 403};
  if (profile.role !== 'admin' && profile.role !== 'sales') return {error: '権限がありません。', status: 403};
  return {user: {id: user.id}, role: profile.role, s};
}

export function isAssistantAuthError(value: AssistantAuthOk | AssistantAuthError): value is AssistantAuthError {
  return 'error' in value;
}
