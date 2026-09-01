import type { Metadata } from 'next'; import './globals.css';
export const metadata:Metadata={title:'Questionnaire Platform',description:'営業担当者向けアンケート管理プラットフォーム'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
