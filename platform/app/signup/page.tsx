import {SignupForm} from '@/components/admin/SignupForm';
import {isSupabaseConfigured} from '@/lib/env';
import {CRESTIX_EMAIL_DOMAIN} from '@/lib/auth/domain';

export default function Signup(){return <main className="shell login-shell"><section className="card stack login-card"><div><p className="muted">アンケートシステム</p><h1>営業メンバー新規登録</h1></div><p className="muted">Crestix社内メンバー（@{CRESTIX_EMAIL_DOMAIN}）は、登録後すぐにログインして利用できます。</p>{!isSupabaseConfigured&&<p className="error">Supabase環境変数を設定してください。</p>}<SignupForm disabled={!isSupabaseConfigured}/></section></main>}
