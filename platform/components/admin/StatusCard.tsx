import Link from 'next/link';
export function StatusCard({label,count,description,href,tone}:{label:string;count:number;description:string;href:string;tone:'slate'|'amber'|'green'|'blue'}){return <Link className={`status-card tone-${tone}`} href={href}><div><span>{label}</span><strong>{count}</strong></div><p>{description}</p><small>一覧を見る →</small></Link>}
