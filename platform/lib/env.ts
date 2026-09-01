const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const isSupabaseConfigured = Boolean(url && anonKey);
export function publicEnv() {
  if (!url || !anonKey) throw new Error('Supabase環境変数が設定されていません。');
  return { url, anonKey };
}
export function appUrl() { return (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(/\/$/, ''); }
