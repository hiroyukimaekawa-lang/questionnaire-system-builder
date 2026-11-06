'use client';
import type {SurveyConfig} from '@/types/database';
import {AssetUrlField} from './AssetUrlField';

const colorThemes = [
  {name:'ブルー',primary:'#2563EB',background:'#EFF6FF',secondary:'#DBEAFE'},
  {name:'レッド',primary:'#DC3545',background:'#FFF1F2',secondary:'#FFE4E6'},
  {name:'グリーン',primary:'#27866B',background:'#EDF8F2',secondary:'#D6F5E5'},
  {name:'ネイビー',primary:'#24466F',background:'#F1F5F9',secondary:'#DCE6F1'},
  {name:'ホワイト',primary:'#374151',background:'#FFFFFF',secondary:'#F3F4F6'},
] as const;

export function DesignFields({config,onChange,surveyId,localPreview=false}:{
  config:SurveyConfig;
  onChange:(patch:Partial<SurveyConfig>)=>void;
  surveyId:string;
  localPreview?:boolean;
}) {
  const currentTheme=colorThemes.find(theme=>theme.primary.toLowerCase()===config.primaryColor.toLowerCase());
  const logoEnabled=(config.logoMode??'none')!=='none';

  const applyTheme=(theme:typeof colorThemes[number])=>onChange({
    primaryColor:theme.primary,
    backgroundColor:theme.background,
    secondaryColor:theme.secondary,
    accentColor:theme.primary,
    heroOverlayColor:theme.primary,
    heroTextColor:'#FFFFFF',
    cardBackground:'#FFFFFF',
    buttonBackground:theme.primary,
    buttonTextColor:'#FFFFFF',
    logoBadgeBackground:theme.secondary,
    heroBackgroundType:'solid',
  });

  return <div className="stack">
    <div className="stack" style={{gap:8}}>
      <strong>1. カラーテーマを選択</strong>
      <p className="muted" style={{margin:0,fontSize:13}}>色をひとつ選ぶと、背景・見出し・ボタンの色をまとめて変更できます。</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10}}>
        {colorThemes.map(theme=>{
          const selected=currentTheme?.name===theme.name;
          return <button type="button" key={theme.name} aria-pressed={selected} onClick={()=>applyTheme(theme)}
            style={{display:'grid',gap:8,textAlign:'center',padding:9,cursor:'pointer',border:selected?'2px solid #315f67':'1px solid #dbe2ea',borderRadius:12,background:'#fff',color:'#172033'}}>
            <span aria-hidden="true" style={{display:'grid',alignContent:'center',justifyItems:'center',gap:5,height:62,borderRadius:8,background:theme.background,border:'1px solid #e5e7eb'}}>
              <span style={{width:'73%',height:15,background:theme.primary,borderRadius:4}}/>
              <span style={{width:'65%',height:12,background:'#fff',border:'1px solid #e5e7eb',borderRadius:4}}/>
            </span>
            <span style={{fontSize:13,fontWeight:selected?800:600}}>{selected?'✓ ':''}{theme.name}</span>
          </button>;
        })}
      </div>
      {!currentTheme&&<small className="muted">現在はカスタムカラーです。上の色を選ぶと全体の配色を変更できます。</small>}
    </div>

    <div className="stack" style={{gap:10}}>
      <strong>2. ロゴ画像（任意）</strong>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
        <input type="checkbox" checked={logoEnabled} style={{width:18,height:18,flexShrink:0}} onChange={e=>onChange({logoMode:e.target.checked?'upload':'none'})}/>
        ロゴを使用する
      </label>
      {logoEnabled&&config.logoMode==='icon'&&<p className="muted" style={{margin:0,fontSize:12}}>現在はアイコン表示です。画像に変更する場合は詳細設定から切り替えられます。</p>}
      {config.logoMode==='upload'&&(localPreview
        ?<p className="muted" style={{margin:0,fontSize:12}}>ローカルUI確認中はロゴ画像をアップロードできません。</p>
        :<AssetUrlField name="logoUrl" label="ロゴ画像を設定" initial={config.logoUrl??''} surveyId={surveyId} onChange={value=>onChange({logoUrl:value})}/>)}
    </div>

    <p className="muted" style={{fontSize:13,margin:0}}>右側のスマホプレビューに変更内容が反映されます。</p>

    <details style={{border:'1px solid #dbe2ea',borderRadius:12,padding:14,background:'#fff'}}>
      <summary style={{cursor:'pointer',fontWeight:700}}>詳細デザイン設定（上級者向け）</summary>
      <div className="stack" style={{marginTop:16}}>
        <label className="field">ロゴの表示方法
          <select value={config.logoMode??'none'} onChange={e=>onChange({logoMode:e.target.value as SurveyConfig['logoMode']})}>
            <option value="none">表示しない</option><option value="icon">アイコンを表示</option><option value="upload">画像を表示</option>
          </select>
        </label>
        <div className="theme-color-grid">
          {([['primaryColor','メインカラー'],['backgroundColor','背景色'],['cardBackground','カード背景'],['buttonBackground','ボタン背景'],['buttonTextColor','ボタン文字']] as const).map(([key,label])=>
            <label className="field" key={key}>{label}
              <input type="color" value={config[key]??'#ffffff'} onChange={e=>onChange({[key]:e.target.value,...(key==='primaryColor'?{heroOverlayColor:e.target.value,buttonBackground:e.target.value}:{})})}/>
            </label>
          )}
        </div>
        {([['completionText','サンクス画面の文章'],['submitLabel','ボタン文言']] as const).map(([key,label])=>
          <label className="field" key={key}>{label}<textarea value={config[key]??''} onChange={e=>onChange({[key]:e.target.value,...(key==='submitLabel'?{buttonLabel:e.target.value}:{})})}/></label>
        )}
        <fieldset className="stack">
          <legend>文字サイズ</legend>
          {([['business','店舗・医院名',16,18,22],['title','メインタイトル',22,26,30],['description','説明文',13,15,17],['choice','選択肢',16,17,19],['button','ボタン',16,17,19]] as const).map(([key,label,small,normal,large])=>
            <label className="field" key={key}>{label}
              <select value={config.fontSizes?.[key]??normal} onChange={e=>onChange({fontSizes:{...config.fontSizes,[key]:Number(e.target.value)}})}>
                <option value={small}>小さい</option><option value={normal}>標準</option><option value={large}>大きい</option>
              </select>
            </label>
          )}
          <label className="field">質問文
            <select value={config.questionFontSize??17} onChange={e=>onChange({questionFontSize:Number(e.target.value)})}>
              <option value="15">小さい</option><option value="17">標準</option><option value="20">大きい</option>
            </select>
          </label>
        </fieldset>
      </div>
    </details>
  </div>;
}
