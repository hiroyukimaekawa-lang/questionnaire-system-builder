'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useState} from 'react';
import type {Role} from '@/types/database';

type RecentSurvey={id:string;name:string;status:string};
type SidebarProps={role:Role;counts:{inProgress:number;draft:number;published:number;withResponses:number;archived:number}|null;recent:RecentSurvey[]};

export function AdminSidebar({role}:SidebarProps){
  const pathname=usePathname(),[menuOpen,setMenuOpen]=useState(false);
  const localPreview=pathname.startsWith("/ui-preview");
  const active=(target:string)=>target==='users'?pathname.startsWith('/admin/users'):target==='sheets'?pathname.startsWith('/admin/system/google-sheets'):false;
  const navClass=(target:string)=>active(target)?'active':undefined;
  const closeMenu=()=>setMenuOpen(false);

  if(role==='viewer')return <aside className={`crm-sidebar${menuOpen?' mobile-open':''}`}><div className="sidebar-brand"><span className="sidebar-brand-mark">Q</span><div><strong>アンケートシステム</strong><small>閲覧者</small></div><button className="sidebar-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="viewer-navigation" onClick={()=>setMenuOpen(value=>!value)}><span aria-hidden="true">☰</span><span className="sr-only">管理メニューを開く</span></button></div><nav id="viewer-navigation" className="sidebar-nav"><p>メニュー</p><Link className={pathname==='/admin/manage'?'active':undefined} href="/admin/manage" onClick={closeMenu}><span>▤</span>共有された案件</Link></nav></aside>;
  return <aside className={`crm-sidebar${menuOpen?' mobile-open':''}`}>
    <div className="sidebar-brand"><span className="sidebar-brand-mark">Q</span><div><strong>アンケートシステム</strong><small>営業管理</small></div><button className="sidebar-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={()=>setMenuOpen(value=>!value)}><span aria-hidden="true">☰</span><span className="sr-only">管理メニューを開く</span></button></div>
    <Link className="sidebar-create" href={localPreview?"/ui-preview/create":"/admin/surveys/new"} onClick={closeMenu}><span>＋</span> アンケート作成</Link>
    <nav id="admin-navigation" className="sidebar-nav" aria-label="管理メニュー">
      <p>メインメニュー</p>
      <Link className={pathname==="/admin"||pathname==="/ui-preview"?"active":undefined} href={localPreview?"/ui-preview":"/admin"} onClick={closeMenu}><span>⌂</span>ホーム</Link>
      <Link className={pathname.startsWith('/admin/manage')?'active':undefined} href="/admin/manage" onClick={closeMenu}><span>▤</span>アンケート一覧</Link>
      {role==='admin'?<>
        <p>管理者設定</p>
        <Link className={navClass('users')} aria-current={active('users')?'page':undefined} href="/admin/users" onClick={closeMenu}><span>♙</span>ユーザー管理</Link>
        <details className="sidebar-settings" open={pathname.startsWith('/admin/invitations')||pathname.startsWith('/admin/system/google-sheets')?true:undefined}>
          <summary style={{cursor:'pointer',padding:'12px 14px',fontWeight:600}}>⚙　システム設定</summary>
          <div style={{paddingLeft:12}}>
            <Link className={pathname.startsWith('/admin/invitations')?'active':undefined} href="/admin/invitations" onClick={closeMenu}><span>✉</span>招待管理</Link>
            <Link className={navClass('sheets')} aria-current={active('sheets')?'page':undefined} href="/admin/system/google-sheets" onClick={closeMenu}><span>↻</span>Sheets同期</Link>
          </div>
        </details>
      </>:null}
    </nav>
  </aside>;
}
