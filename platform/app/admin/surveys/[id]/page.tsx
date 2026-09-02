import {notFound} from 'next/navigation';
import {BasicForm,ConfigForm} from '@/components/admin/SurveyForms';
import {CompletionSettingsForm} from '@/components/admin/CompletionSettingsForm';
import {getDraftForSurvey,getSurvey} from '@/lib/data';
import {ActionForm} from '@/components/admin/ActionForm';
import {PublicUrlActions} from '@/components/admin/PublicUrlActions';
import {publishAction,unpublishAction} from '@/app/actions';
import {appUrl} from '@/lib/env';
export default async function Edit({params}:{params:Promise<{id:string}>}){const {id}=await params;const [survey,draft]=await Promise.all([getSurvey(id),getDraftForSurvey(id)]);if(!survey||!draft)notFound();return <><div><h1>{survey.name}</h1><p className="muted">状態: {survey.status} · 下書き v{draft.version}</p>{survey.status==='published'?<div className="card public-url-card"><strong>公開URL</strong><PublicUrlActions url={`${appUrl()}/${survey.slug}`}/></div>:<p className="muted">公開URL: 未公開</p>}<div className="row">{survey.status==='published'?<ActionForm action={unpublishAction.bind(null,id)} label="非公開にする"/>:<ActionForm action={publishAction.bind(null,id)} label="この下書きを公開"/>}</div></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:18}}><BasicForm survey={survey}/><ConfigForm surveyId={id} versionId={draft.id} config={draft.config}/><CompletionSettingsForm surveyId={id} versionId={draft.id} config={draft.config} questions={draft.questions}/></div></>}
