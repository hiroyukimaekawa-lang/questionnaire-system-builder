'use client';
import {useEffect,useState} from 'react';
import {ThanksPanel} from '@/components/survey/ThanksPanel';
import {SurveyRenderer} from '@/components/survey/SurveyRenderer';
import {googleReviewMode} from '@/lib/survey';
import type {SurveyVersion} from '@/types/database';

type View='survey'|'thanks'|'review';

export function LiveSurveyPreview({name,version,onEdit,className=''}:{name:string;version:SurveyVersion;onEdit?:(target:string)=>void;className?:string}){
  const [view,setView]=useState<View>('survey'),[open,setOpen]=useState(false);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>event.key==='Escape'&&setOpen(false);document.body.classList.add('preview-modal-open');document.addEventListener('keydown',close);return()=>{document.body.classList.remove('preview-modal-open');document.removeEventListener('keydown',close)}},[open]);

  const edit=(target:string)=>{
    if(!onEdit)return;
    if(open){
      setOpen(false);
      window.setTimeout(()=>onEdit(target),120);
      return;
    }
    onEdit(target);
  };

  const config=version.config,reviewMode=googleReviewMode(config);
  const panel=<div className="live-preview-shell"><div className="preview-toolbar" role="tablist" aria-label="プレビュー表示"><button type="button" className={view==='survey'?'active':''} onClick={()=>setView('survey')}>本編</button><button type="button" className={view==='thanks'?'active':''} onClick={()=>setView('thanks')}>サンクス</button><button type="button" className={view==='review'?'active':''} onClick={()=>setView('review')}>口コミ導線</button></div><div className="admin-phone-frame">{view==='survey'?<SurveyRenderer name={name} slug="preview" version={version} preview onEditTarget={edit}/>:<ThanksPanel key={view} slug="preview" text={config.completionText} reviewUrl={config.googleReviewUrl} reviewMode={view==='thanks'?'disabled':reviewMode} primaryColor={config.primaryColor} previewCompletion={{reviewEligible:view==='review',comment:view==='review'&&config.reviewTextQuestionId!==null?'こちらに回答者が入力した感想が表示されます。':''}}/>}</div><p className="preview-hint">プレビュー内の店舗名・見出し・質問・ボタン・サンクス文・口コミ導線をクリックすると、対応する編集項目へ移動します。不要な質問は移動先の「削除」から消せます。</p></div>;
  return <><aside className={`live-preview-column ${className}`} aria-label="ライブプレビュー"><div className="preview-column-heading"><div><span>LIVE PREVIEW</span><strong>スマホでの見え方</strong></div><span className="live-badge">● リアルタイム</span></div>{panel}</aside><button className="mobile-preview-trigger" type="button" onClick={()=>setOpen(true)}>👁 プレビューを見る</button>{open&&<div className="mobile-preview-overlay" role="dialog" aria-modal="true" aria-label="ライブプレビュー"><button className="mobile-preview-close" type="button" onClick={()=>setOpen(false)}>× 閉じる</button>{panel}</div>}</>;
}
