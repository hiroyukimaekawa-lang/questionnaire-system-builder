'use client';
import {isAnonymousSurvey} from '@/lib/public-survey';
import {useActionState,useState} from 'react';
import {createSurveyAction,saveConfigAction,saveSurveyAction} from '@/app/actions';
import {slugify,normalizeQuestionFontSize} from '@/lib/survey';
import {getThemeTemplate} from '@/lib/theme/templates';
import type {SurveyConfig} from '@/types/database';
import {AssetUrlField} from '@/components/admin/AssetUrlField';

const DEFAULT_REVIEW_PROMPT='よろしければ、Googleでもご感想をお聞かせください。';
type OptionalCopyKey='heroLabel'|'heroSubtitle'|'description'|'introText'|'anonymousText'|'googleReviewPromptText';

function Result({state}:{state:any}){return <>{state?.error&&<p className="error" role="alert">{state.error}</p>}{state?.success&&<p className="notice" role="status">{state.success}</p>}</>}
export function CreateSurveyForm(){const [state,action,pending]=useActionState(createSurveyAction,null);const [slug,setSlug]=useState('');return <form action={action} className="card stack" style={{padding:24,maxWidth:680}}><label className="field">店舗・医院名<input name="name" required onChange={e=>{if(!slug)setSlug(slugify(e.target.value))}}/></label><label className="field">公開URLの名前<input name="slug" value={slug} onChange={e=>setSlug(e.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/><small className="muted">公開URL: /{slug||'slug'}</small></label><label className="field">業種<input name="industry" placeholder="例: クリニック、飲食店、美容室"/></label><Result state={state}/><button className="btn" disabled={pending}>{pending?'作成中…':'作成して編集へ'}</button></form>}
export function BasicForm({survey}:{survey:any}){const [state,action,pending]=useActionState(saveSurveyAction.bind(null,survey.id),null);return <form action={action} className="card stack admin-form-card"><div><p className="form-kicker">店舗情報</p><h2>基本情報</h2></div><label className="field">店舗・医院名<input name="name" defaultValue={survey.name} required/></label><label className="field">公開URLの名前<input name="slug" defaultValue={survey.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/></label><label className="field">業種<input name="industry" defaultValue={survey.industry}/></label><Result state={state}/><button className="btn" disabled={pending}>{pending?'保存中…':'基本情報を保存'}</button></form>}
export function ConfigForm({surveyId,versionId,config,onChange}:{surveyId:string;versionId:string;config:SurveyConfig;onChange?:(patch:Partial<SurveyConfig>)=>void}){
  const [state,action,pending]=useActionState(saveConfigAction.bind(null,surveyId,versionId),null);
  const themeId=config.themeId??'clinic-clean';
  const defaults=getThemeTemplate(themeId).config;
  const [anonymous,setAnonymous]=useState(isAnonymousSurvey(config));
  const initialCopy:Record<OptionalCopyKey,string>={
    heroLabel:config.heroLabel===undefined?'QUESTIONNAIRE':config.heroLabel??'',
    heroSubtitle:config.heroSubtitle===undefined?(config.description??''):config.heroSubtitle??'',
    description:config.description??'',
    introText:config.introText??'',
    anonymousText:config.anonymousText===undefined?'※こちらのアンケートは匿名です。':config.anonymousText??'',
    googleReviewPromptText:config.googleReviewPromptText===undefined?DEFAULT_REVIEW_PROMPT:config.googleReviewPromptText??'',
  };
  const [copyValues,setCopyValues]=useState<Record<OptionalCopyKey,string>>(initialCopy);
  const [copyEnabled,setCopyEnabled]=useState<Record<OptionalCopyKey,boolean>>({
    heroLabel:Boolean(initialCopy.heroLabel.trim()),heroSubtitle:Boolean(initialCopy.heroSubtitle.trim()),description:Boolean(initialCopy.description.trim()),introText:Boolean(initialCopy.introText.trim()),anonymousText:Boolean(initialCopy.anonymousText.trim()),googleReviewPromptText:Boolean(initialCopy.googleReviewPromptText.trim()),
  });
  const effectiveCopy=(key:OptionalCopyKey)=>copyEnabled[key]?copyValues[key]:'';
  const updateCopy=(key:OptionalCopyKey,value:string)=>{setCopyValues(current=>({...current,[key]:value}));onChange?.({[key]:value} as Partial<SurveyConfig>);};
  const toggleCopy=(key:OptionalCopyKey)=>{const enabled=!copyEnabled[key];setCopyEnabled(current=>({...current,[key]:enabled}));onChange?.({[key]:enabled?copyValues[key]:''} as Partial<SurveyConfig>);};
  const copyHelp='改行したい位置でEnterを押してください。改行を入れない場合は画面幅に合わせて自動で折り返します。';
  const optionalField=(key:OptionalCopyKey,label:string,rows=3,singleLine=false)=><div className={`optional-copy-field ${copyEnabled[key]?'enabled':'disabled'}`} key={key}><div className="optional-copy-heading"><strong>{label}</strong><button type="button" className={copyEnabled[key]?'btn secondary optional-copy-toggle':'btn secondary optional-copy-toggle'} aria-pressed={copyEnabled[key]} onClick={()=>toggleCopy(key)}>{copyEnabled[key]?'使用中（非表示にする）':'＋ 使用する'}</button></div>{copyEnabled[key]?<label className="field">{singleLine?<input name={key} value={copyValues[key]} onChange={e=>updateCopy(key,e.target.value)} placeholder="文章を入力"/>:<textarea rows={rows} name={key} value={copyValues[key]} onChange={e=>updateCopy(key,e.target.value)} placeholder="文章を入力"/>}<small className="editor-field-help">不要になった場合は「非表示にする」を押してください。{singleLine?'':copyHelp}</small></label>:<input type="hidden" name={key} value=""/>}</div>;
  const copyPatch=Object.fromEntries((Object.keys(copyValues) as OptionalCopyKey[]).map(key=>[key,effectiveCopy(key)]));
  return <form action={action} className="card stack admin-form-card design-settings-form"><div><p className="form-kicker">公開画面</p><h2>文章・ロゴ設定</h2><p className="muted">文章は実際に回答者が見る順番で設定します。右側のプレビュー内の文章をクリックすると、対応する編集欄へ移動できます。</p></div>
    <section className="copy-flow-section"><div className="copy-flow-heading"><span>1</span><div><h3>回答画面の文章</h3><p className="muted">アンケートを開いて、回答を送信するまでに表示される内容です。</p></div></div>
      <label className="field">画面タイトル<input name="title" defaultValue={config.title} required/></label>
      {optionalField('heroLabel','上部ラベル',1,true)}
      <label className="field">ヒーロータイトル<input name="heroTitle" defaultValue={config.heroTitle??config.title}/></label>
      {optionalField('heroSubtitle','ヒーローの説明',3)}
      {optionalField('description','説明文',3)}
      {optionalField('introText','冒頭文章',4)}
      <label className="field">匿名設定<select name="anonymous" value={String(anonymous)} onChange={e=>{const value=e.target.value==='true';setAnonymous(value);onChange?.({anonymous:value});}}><option value="true">匿名にする</option><option value="false">匿名にしない</option></select></label>
      {anonymous&&optionalField('anonymousText','匿名案内文',2)}
      <label className="field">送信ボタンの文言<input name="submitLabel" defaultValue={config.buttonLabel??config.submitLabel} required/></label>
      <label className="field editor-field-label question-font-size-field">質問文の文字サイズ<span className="question-font-size-control"><input name="questionFontSize" type="number" min="14" max="22" step="1" defaultValue={normalizeQuestionFontSize(config.questionFontSize)} onChange={e=>onChange?.({questionFontSize:Number(e.target.value)})}/><span className="question-font-size-unit">px</span></span><small className="editor-field-help">公開アンケートの質問文に反映されます。標準は17pxです。</small></label>
      <label className="field">ロゴ表示<select name="logoMode" defaultValue={config.logoMode??'icon'}><option value="none">表示しない</option><option value="icon">アイコン</option><option value="upload">ロゴ画像</option></select></label>
      <AssetUrlField name="logoUrl" label="ロゴ画像" initial={config.logoUrl??''} surveyId={surveyId} onChange={value=>onChange?.({logoUrl:value})}/>
      <AssetUrlField name="iconUrl" label="店舗アイコン" initial={config.iconUrl??''} surveyId={surveyId} onChange={value=>onChange?.({iconUrl:value})}/>
    </section>
    <section className="copy-flow-section"><div className="copy-flow-heading"><span>2</span><div><h3>サンクスページの文章</h3><p className="muted">回答を送信した直後に表示する文章です。</p></div></div><label className="field">回答後の文章<textarea rows={4} name="completionText" defaultValue={config.completionText} required/><small className="editor-field-help">{copyHelp}</small></label></section>
    <section className="copy-flow-section"><div className="copy-flow-heading"><span>3</span><div><h3>Google口コミへ進む直前の文章</h3><p className="muted">口コミ対象者に、Google口コミボタンの直前で表示する案内文です。</p></div></div>{optionalField('googleReviewPromptText','口コミ遷移前の案内文',3)}<small className="muted">Google口コミを表示する条件やURLは、下の「口コミ・完了条件」で設定します。</small></section>
    <input type="hidden" name="themeId" value={themeId}/>
    <input type="hidden" name="primaryColor" value={config.primaryColor??defaults.primaryColor}/>
    <input type="hidden" name="secondaryColor" value={config.secondaryColor??defaults.secondaryColor}/>
    <input type="hidden" name="backgroundColor" value={config.backgroundColor??defaults.backgroundColor}/>
    <input type="hidden" name="accentColor" value={config.accentColor??defaults.accentColor}/>
    <input type="hidden" name="heroOverlayColor" value={config.heroOverlayColor??defaults.heroOverlayColor}/>
    <input type="hidden" name="heroTextColor" value={config.heroTextColor??defaults.heroTextColor}/>
    <input type="hidden" name="buttonBackground" value={config.buttonBackground??defaults.buttonBackground}/>
    <input type="hidden" name="buttonTextColor" value={config.buttonTextColor??defaults.buttonTextColor}/>
    <input type="hidden" name="cardBackground" value={config.cardBackground??defaults.cardBackground}/>
    <input type="hidden" name="logoBadgeBackground" value={config.logoBadgeBackground??defaults.logoBadgeBackground}/>
    <input type="hidden" name="heroBackgroundType" value={config.heroBackgroundType??defaults.heroBackgroundType}/>
    <input type="hidden" name="cardRadius" value={config.cardRadius??defaults.cardRadius}/>
    <input type="hidden" name="designPatch" value={JSON.stringify(copyPatch)}/>
    <Result state={state}/><button className="btn" disabled={pending}>{pending?'保存中…':'文章・ロゴ設定を下書き保存'}</button>
  </form>;
}
