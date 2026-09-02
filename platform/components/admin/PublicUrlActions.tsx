'use client';
import {useState} from 'react';
export function PublicUrlActions({url}:{url:string}){const [copied,setCopied]=useState(false);return <div className="public-url-actions"><span title={url}>{url.replace(/^https?:\/\//,'')}</span><a className="btn secondary" href={url} target="_blank" rel="noreferrer">開く</a><button className="btn secondary" type="button" onClick={async()=>{await navigator.clipboard.writeText(url);setCopied(true)}}>コピー</button>{copied&&<small role="status">コピーしました</small>}</div>}
