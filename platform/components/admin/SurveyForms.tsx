'use client';
import {isAnonymousSurvey} from '@/lib/public-survey';
import {useActionState,useState} from 'react';
import {createSurveyAction,saveConfigAction,saveSurveyAction} from '@/app/actions';
import {slugify,normalizeQuestionFontSize} from '@/lib/survey';
import {getThemeTemplate} from '@/lib/theme/templates';
import type {SurveyConfig} from '@/types/database';
import {AssetUrlField} from '@/components/admin/AssetUrlField';

function Result({state}:{state:any}){return <>{state?.error&&<p className="error" role="alert">{state.error}</p>}{state?.success&&<p className="notice" role="status">{state.success}</p>}</>}
export function CreateSurveyForm(){const [state,action,pending]=useActionState(createSurveyAction,null);const [slug,setSlug]=useState('');return <form action={action} className="card stack" style={{padding:24,maxWidth:680}}><label className="field">店舗・医院名<input name="name" required onChange={e=>{if(!slug)setSlug(slugify(e.target.value))}}/></label><label className="field">公開URLの名前<input name="slug" value={slug} onChange={e=>setSlug(e.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/><small className="muted">公開URL: /{slug||'slug'}</small></label><label className="field">業種<input name="industry" placeholder="例: クリニック、飲食店、美容室"/></label><Result state={state}/><button className="btn" disabled={pending}>{pending?'作成中…':'作成して編集へ'}</button></form>}
export function BasicForm({survey}:{survey:any}){const [state,action,pending]=useActionState(saveSurveyAction.bind(null,survey.id),null);return <form action={action} className="card stack admin-form-card"><div><p className="form-kicker">店舗情報</p><h2>基本情報</h2></div><label className="field">店舗・医院名<input name="name" defaultValue={survey.name} required/></label><label className="field">公開URLの名前<input name="slug" defaultValue={survey.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/></label><label className="field">業種<input name="industry" defaultValue={survey.industry}/></label><Result state={state}/><button className="btn" disabled={pending}>{pending?'保存中…':'基本情報を保存'}</button></form>}
export function ConfigForm({surveyId,versionId,config,onChange}:{surveyId:string;versionId:string;config:SurveyConfig;onChange?:(patch:Partial<SurveyConfig>)=>void}){
  const [state,action,pending]=useActionState(saveConfigAction.bind(null,surveyId,versionId),null);
  const themeId=config.themeId??'clinic-clean';
  const defaults=getThemeTemplate(themeId).config;
  const initialHeroLabel=config.heroLabel===undefined?'QUESTIONNAIRE':config.heroLabel??'';
  const initialHeroSubtitle=config.heroSubtitle===undefined?(config.description??''):config.heroSubtitle??'';
  const [copyPatch,setCopyPatch]=useState<Pick<SurveyConfig,'heroLabel'|'heroSubtitle'>>({heroLabel:initialHeroLabel,heroSubtitle:initialHeroSubtitle});
  const updateCopy=(key:'heroLabel'|'heroSubtitle',value:string)=>{setCopyPatch(current=>({...current,[key]:value}));onChange?.({[key]:value});};
  const copyHelp='空欄にするとプレビュー・公開画面から非表示になります。改行したい位置でEnterを押してください。改行を入れない場合は画面幅に合わせて自動で折り返します。';
  return <form action={action} className="card stack admin-form-card design-settings-form"><div><p className="form-kicker">公開画面</p><h2>文章・ロゴ設定</h2><p className="muted">右側のプレビュー内の文章をクリックすると、対応する編集欄へ移動できます。不要な文章は空欄にしてください。</p></div>
    <label className="field">画面タイトル<input name="title" defaultValue={config.title} required/></label>
    <label className="field editor-field-label">上部ラベル<input name="heroLabel" value={copyPatch.heroLabel??''} onChange={e=>updateCopy('heroLabel',e.target.value)} placeholder="不要な場合は空欄"/><small className="editor-field-help">空欄にすると表示されません。</small></label>
    <label className="field">ヒーロータイトル<input name="heroTitle" defaultValue={config.heroTitle??config.title}/></label>
    <label className="field editor-field-label question-font-size-field">質問文の文字サイズ<span className="question-font-size-control"><input name="questionFontSize" type="number" min="14" max="22" step="1" defaultValue={normalizeQuestionFontSize(config.questionFontSize)} onChange={e=>onChange?.({questionFontSize:Number(e.target.value)})}/><span className="question-font-size-unit">px</span></span><small className="editor-field-help">公開アンケートの質問文に反映されます。標準は17pxです。</small></label>
    <label className="field">ヒーローの説明<textarea rows={3} name="heroSubtitle" value={copyPatch.heroSubtitle??''} onChange={e=>updateCopy('heroSubtitle',e.target.value)} placeholder="不要な場合は空欄"/><small className="editor-field-help">{copyHelp}</small></label>
    <label className="field">説明文<textarea rows={3} name="description" defaultValue={config.description} placeholder="不要な場合は空欄"/><small className="editor-field-help">{copyHelp}</small></label>
    <label className="field">冒頭文章<textarea rows={4} name="introText" defaultValue={config.introText} placeholder="不要な場合は空欄"/><small className="editor-field-help">{copyHelp}</small></label>
    <label className="field">匿名設定<select name="anonymous" defaultValue={String(isAnonymousSurvey(config))}><option value="true">匿名にする</option><option value="false">匿名にしない</option></select></label>
    <label className="field">匿名案内文<textarea name="anonymousText" defaultValue={config.anonymousText} placeholder="不要な場合は空欄"/><small className="editor-field-help">{copyHelp}</small></label>
    <label className="field">回答後の文章<textarea name="completionText" defaultValue={config.completionText} required/><small className="editor-field-help">改行したい位置でEnterを押してください。改行を入れない場合は画面幅に合わせて自動で折り返します。</small></label>
    <label className="field">送信ボタンの文言<input name="submitLabel" defaultValue={config.buttonLabel??config.submitLabel} required/></label>
    <label className="field">ロゴ表示<select name="logoMode" defaultValue={config.logoMode??'icon'}><option value="none">表示しない</option><option value="icon">アイコン</option><option value="upload">ロゴ画像</option></select></label>
    <AssetUrlField name="logoUrl" label="ロゴ画像" initial={config.logoUrl??''} surveyId={surveyId} onChange={value=>onChange?.({logoUrl:value})}/>
    <AssetUrlField name="iconUrl" label="店舗アイコン" initial={config.iconUrl??''} surveyId={surveyId} onChange={value=>onChange?.({iconUrl:value})}/>
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
