'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useState} from 'react';
import type {Role} from '@/types/database';

type RecentSurvey={id:string;name:string;status:string};
type SidebarProps={role:Role;counts:{inProgress:number;draft:number;published:number;withResponses:number;archived:number}|null;recent:RecentSurvey[]};

export function AdminSidebar({role,recent}:SidebarProps){
  const pathname=usePathname(),searchParams=useSearchParams(),status=searchParams.get('status'),[menuOpen,setMenuOpen]=useState(false);
  const active=(target:string)=>target==='management'?pathname==='/admin'&&!status:target==='users'?pathname.startsWith('/admin/users'):pathname==='/admin'&&status===target;
  const navClass=(target:string)=>active(target)?'active':undefined;
  const closeMenu=()=>setMenuOpen(false);

  if(role==='viewer')return <aside className={`crm-sidebar${menuOpen?' mobile-open':''}`}><div className="sidebar-brand"><span className="sidebar-brand-mark">Q</span><div><strong>アンケートシステム</strong><small>閲覧者</small></div></div><nav className="sidebar-nav"><p>メニュー</p><Link className={pathname==='/admin/manage'?'active':undefined} href="/admin/manage" onClick={closeMenu}><span>▤</span>共有された案件</Link></nav></aside>;
  return <aside className={`crm-sidebar${menuOpen?' mobile-open':''}`}>
    <div className="sidebar-brand"><span className="sidebar-brand-mark">Q</span><div><strong>アンケートシステム</strong><small>営業管理</small></div><button className="sidebar-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={()=>setMenuOpen(value=>!value)}><span aria-hidden="true">☰</span><span className="sr-only">管理メニューを開く</span></button></div>
    <Link className="sidebar-create" href="/admin/surveys/new" onClick={closeMenu}><span>＋</span> 新しいアンケート</Link>
    <nav id="admin-navigation" className="sidebar-nav" aria-label="管理メニュー"><p>メインメニュー</p><Link className={pathname==='/admin'?'active':undefined} href="/admin" onClick={closeMenu}><span>⌂</span>ホーム</Link><Link className={pathname.startsWith('/admin/manage')?'active':undefined} href="/admin/manage" onClick={closeMenu}><span>▤</span>管理</Link><Link href="/admin/surveys/new" onClick={closeMenu}><span>＋</span>案件作成</Link><p>管理者メニュー</p>{role==='admin'?<><Link className={navClass('users')} aria-current={active('users')?'page':undefined} href="/admin/users" onClick={closeMenu}><span>♙</span>ユーザー管理</Link><Link className={pathname.startsWith('/admin/invitations')?'active':undefined} href="/admin/invitations" onClick={closeMenu}><span>✉</span>招待管理</Link></>:null}<span className="sidebar-disabled" aria-disabled="true"><span>⚙</span>アカウント</span></nav>
    {recent.length>0?<section className="sidebar-recent"><p>最近更新</p>{recent.map(item=><Link href={`/admin/manage/${item.id}`} key={item.id}><span className={`mini-status ${item.status}`}/><span>{item.name}</span></Link>)}</section>:null}
  </aside>;
}
