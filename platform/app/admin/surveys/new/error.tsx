'use client';

import Link from 'next/link';

export default function NewSurveyError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <section className="card stack" style={{maxWidth:680,padding:28}} role="alert"><div><p className="form-kicker">Questionnaire Platform</p><h1>アンケート作成画面でエラーが発生しました</h1></div><p>画面が更新された直後などに発生することがあります。<br/>再読み込みしてもう一度お試しください。</p><div className="row"><button className="btn" type="button" onClick={reset}>もう一度試す</button><Link className="btn secondary" href="/admin">アンケート管理へ戻る</Link></div></section>;
}
