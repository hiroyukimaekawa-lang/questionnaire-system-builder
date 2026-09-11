'use client';
export default function AdminError({reset}:{reset:()=>void}){
  return <section className="card stack" style={{padding:28}} role="alert">
    <h1>アンケート一覧の取得に失敗しました。</h1>
    <p>時間をおいて、もう一度お試しください。</p>
    <button className="btn" onClick={reset}>再試行する</button>
  </section>;
}
