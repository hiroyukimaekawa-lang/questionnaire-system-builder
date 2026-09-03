'use client';
import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
export function PublicUrlActions({url,surveyId}:{url:string;surveyId?:string}){
  const [copied,setCopied]=useState(false),[showQr,setShowQr]=useState(false),[qr,setQr]=useState('');
  useEffect(()=>{if(showQr&&!qr)QRCode.toDataURL(url,{width:280,margin:2}).then(setQr)},[showQr,qr,url]);
  return <div className="public-url-actions"><span title={url}>{url.replace(/^https?:\/\//,'')}</span><a className="btn secondary" href={url} target="_blank" rel="noreferrer">開く</a><button className="btn secondary" type="button" onClick={async()=>{await navigator.clipboard.writeText(url);setCopied(true)}}>コピー</button><button className="btn secondary" type="button" onClick={()=>setShowQr(value=>!value)}>QR表示</button>{surveyId&&<Link className="btn secondary" href={`/admin/surveys/${surveyId}`}>編集</Link>}{copied&&<small role="status">コピーしました</small>}{showQr&&<div className="url-qr-popover">{qr&&<Image unoptimized src={qr} width={150} height={150} alt="公開URLのQRコード"/>}<small>スマートフォンで読み取れます</small></div>}</div>;
}
