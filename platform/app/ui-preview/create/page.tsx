import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SurveyWizard } from '@/components/builder/SurveyWizard';

export const dynamic = 'force-dynamic';

export default function LocalBuilderPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <div className="crm-shell">
      <AdminSidebar role="admin" counts={null} recent={[]} />
      <div className="crm-workspace">
        <header className="crm-topbar">
          <div><strong>UI確認用（ローカル）</strong><span>ログイン・DB接続なし</span></div>
        </header>
        <main className="crm-main">
          <p style={{margin:'0 0 16px'}}><Link href="/ui-preview">← ホームに戻る</Link></p>
          <SurveyWizard previewOnly />
        </main>
      </div>
    </div>
  );
}
