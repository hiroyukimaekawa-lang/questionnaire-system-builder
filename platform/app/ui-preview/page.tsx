import { notFound } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

// Visual QA only. This route must never be served outside local development.
export default function UiPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const sample = [
    { name: 'さくやま眼科', date: '2026/11/05' },
    { name: 'たまプラーザテラス むくもと眼科', date: '2026/11/04' },
    { name: 'さんさん眼科クリニック', date: '2026/10/15' },
  ];
  return (
    <div className="crm-shell">
      <AdminSidebar role="admin" counts={null} recent={[]} />
      <div className="crm-workspace">
        <header className="crm-topbar">
          <div><strong>UI確認用（ダミーデータ）</strong><span>ログイン・DB接続なし</span></div>
        </header>
        <main className="crm-main">
          <div className="crm-dashboard">
            <header className="dashboard-heading">
              <div><p>ホーム</p><h1>アンケート管理画面プレビュー</h1><span>サイドメニューをローカルで確認するための画面です。実際の案件・回答データは取得していません。</span></div>
            </header>
            <section className="status-grid home-status-grid">
              <div className="status-card"><span>担当案件（サンプル）</span><strong>13</strong><p>件</p></div>
              <div className="status-card"><span>公開中（サンプル）</span><strong>13</strong><p>件</p></div>
              <div className="status-card"><span>作成途中（サンプル）</span><strong>0</strong><p>件</p></div>
            </section>
            <section className="card recent-card">
              <div className="list-heading"><div><h2>最近更新した案件（サンプル）</h2><p>ここでは見た目だけを確認します。</p></div></div>
              <div className="recent-list">{sample.map(item => (
                <div key={item.name} style={{display:'flex',gap:16,alignItems:'center',padding:'14px 6px',borderBottom:'1px solid #e5eaed'}}>
                  <span className="status-badge published">公開中</span>
                  <strong style={{flex:1}}>{item.name}</strong><time>{item.date}</time>
                </div>
              ))}</div>
            </section>
            <p className="muted" style={{fontSize:12}}>※サイドメニューの各リンクは本来の管理画面へ移動するため、認証なしでは開けません。このページは外観確認専用です。</p>
          </div>
        </main>
      </div>
    </div>
  );
}
