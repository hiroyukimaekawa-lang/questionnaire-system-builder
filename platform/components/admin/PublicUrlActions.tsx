'use client';
import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
export function PublicUrlActions({url,surveyId,slug,compact=false}:{url:string;surveyId?:string;slug?:string;compact?:boolean}){
  const [copied,setCopied]=useState(false),[showQr,setShowQr]=useState(false),[qr,setQr]=useState('');
  useEffect(()=>{if(showQr&&!qr)QRCode.toDataURL(url,{width:280,margin:2}).then(setQr)},[showQr,qr,url]);
  return <div className={`public-url-actions${compact?' public-url-compact':''}`}><span title={url}>{compact?(slug??url.split('/').filter(Boolean).at(-1)):url.replace(/^https?:\/\//,'')}</span><div className="public-url-action-buttons"><a className="btn secondary" aria-label={`${url}を開く`} href={url} target="_blank" rel="noreferrer">開く</a><button className="btn secondary" aria-label={`${url}をコピー`} type="button" onClick={async()=>{await navigator.clipboard.writeText(url);setCopied(true)}}>コピー</button><button className="btn secondary" aria-label={`${url}のQRコードを表示`} type="button" onClick={()=>setShowQr(value=>!value)}>QR</button>{surveyId&&<Link className="btn secondary" href={`/admin/surveys/${surveyId}`}>編集</Link>}</div>{copied&&<small role="status">コピーしました</small>}{showQr&&<div className="url-qr-popover">{qr&&<Image unoptimized src={qr} width={150} height={150} alt="公開URLのQRコード"/>}<small>スマートフォンで読み取れます</small></div>}</div>;
}
