import {SignupForm} from '@/components/admin/SignupForm';
import {isSupabaseConfigured} from '@/lib/env';

export default function Signup(){return <main className="shell login-shell"><section className="card stack login-card"><div><p className="muted">アンケートシステム</p><h1>営業メンバー新規登録</h1></div><p className="muted">登録後、管理者の承認を受けると利用を開始できます。</p>{!isSupabaseConfigured&&<p className="error">Supabase環境変数を設定してください。</p>}<SignupForm disabled={!isSupabaseConfigured}/></section></main>}
