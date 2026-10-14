'use client';
import type {SurveyConfig,SurveyQuestion} from '@/types/database';
import {safeGoogleReviewUrl} from '@/lib/google-review';

export function ReviewSettings({config,questions,onChange}:{config:SurveyConfig;questions:SurveyQuestion[];onChange:(patch:Partial<SurveyConfig>)=>void}) {
  const storedMode=String((config as unknown as Record<string,unknown>).googleReviewMode??(config.googleReviewUrl?'all':'disabled'));
  const visibleMode=storedMode==='disabled'?'disabled':'all';
  const link=safeGoogleReviewUrl(config.googleReviewUrl);
  return <div className="stack review-settings">
    <fieldset className="stack"><legend>Google口コミへの案内</legend><input type="hidden" name="googleReviewMode" value={storedMode}/><div className="row" role="group" aria-label="Google口コミへの案内方法">{([['disabled','使用しない'],['all','全回答者へ表示']] as const).map(([value,label])=><button type="button" className={visibleMode===value?'btn':'btn secondary'} key={value} aria-pressed={visibleMode===value} onClick={()=>onChange({googleReviewMode:value})}>{visibleMode===value?'✓ ':''}{label}</button>)}</div></fieldset>
    {(storedMode==='score'||storedMode==='conditional')&&<p className="notice">既存のスコア条件設定はデータとして保持されていますが、Google口コミCTAの表示選別には使用しません。</p>}
    {visibleMode!=='disabled'&&<><label className="field">Google口コミURL<input name="googleReviewUrl" type="url" value={config.googleReviewUrl??''} onChange={e=>onChange({googleReviewUrl:e.target.value})} placeholder="https://g.page/r/…/review"/></label>{link&&<a className="btn secondary" href={link} target="_blank" rel="noopener noreferrer">口コミページを確認</a>}</>}
    {visibleMode!=='disabled'&&<label className="field">口コミ用文章として使用する質問<select name="reviewTextQuestionId" value={config.reviewTextQuestionId===undefined?'__legacy':config.reviewTextQuestionId??''} onChange={e=>onChange({reviewTextQuestionId:e.target.value||null})}>{config.reviewTextQuestionId===undefined&&<option value="__legacy">既存設定：最初の入力済み長文</option>}<option value="">使用しない</option>{questions.filter(q=>q.type==='textarea').map(q=><option key={q.id} value={q.id}>Q{questions.indexOf(q)+1} {q.title}</option>)}</select></label>}
  </div>;
}
