'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useState} from 'react';
import type {Role} from '@/types/database';

type RecentSurvey={id:string;name:string;status:string};
type SidebarProps={role:Role;counts:{inProgress:number;draft:number;published:number;withResponses:number;archived:number};recent:RecentSurvey[]};

export function AdminSidebar({role,counts,recent}:SidebarProps){
  const pathname=usePathname(),searchParams=useSearchParams(),status=searchParams.get('status'),[menuOpen,setMenuOpen]=useState(false);
  const active=(target:string)=>target==='management'?pathname==='/admin'&&!status:target==='users'?pathname.startsWith('/admin/users'):pathname==='/admin'&&status===target;
  const navClass=(target:string)=>active(target)?'active':undefined;
  const closeMenu=()=>setMenuOpen(false);

  return <aside className={`crm-sidebar${menuOpen?' mobile-open':''}`}>
    <div className="sidebar-brand"><span className="sidebar-brand-mark">Q</span><div><strong>アンケートシステム</strong><small>営業管理</small></div><button className="sidebar-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={()=>setMenuOpen(value=>!value)}><span aria-hidden="true">☰</span><span className="sr-only">管理メニューを開く</span></button></div>
    <Link className="sidebar-create" href="/admin/surveys/new" onClick={closeMenu}><span>＋</span> 新しいアンケート</Link>
    <nav id="admin-navigation" className="sidebar-nav" aria-label="管理メニュー"><p>メインメニュー</p><Link className={navClass('management')} aria-current={active('management')?'page':undefined} href="/admin" onClick={closeMenu}><span>▤</span>アンケート管理</Link><Link className={navClass('in_progress')} href="/admin?status=in_progress"><span>◷</span>作成途中<em>{counts.inProgress}</em></Link><Link className={navClass('draft')} href="/admin?status=draft"><span>◫</span>下書き<em>{counts.draft}</em></Link><Link className={navClass('published')} href="/admin?status=published"><span>●</span>公開中<em>{counts.published}</em></Link><Link className={navClass('responses')} href="/admin?status=responses"><span>↳</span>回答一覧<em>{counts.withResponses}</em></Link><Link className={navClass('archived')} href="/admin?status=archived" onClick={closeMenu}><span>⌫</span>削除済み<em>{counts.archived}</em></Link><p>管理</p>{role==='admin'?<Link className={navClass('users')} aria-current={active('users')?'page':undefined} href="/admin/users" onClick={closeMenu}><span>♙</span>ユーザー管理</Link>:null}<span className="sidebar-disabled" aria-disabled="true"><span>⚙</span>設定<small>準備中</small></span></nav>
    {recent.length>0?<section className="sidebar-recent"><p>最近更新</p>{recent.map(item=><Link href={`/admin/surveys/${item.id}`} key={item.id}><span className={`mini-status ${item.status}`}/><span>{item.name}</span></Link>)}</section>:null}
  </aside>;
}
