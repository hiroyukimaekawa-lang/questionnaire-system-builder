import {notFound} from 'next/navigation';
import {SurveyEditorWorkspace} from '@/components/admin/SurveyEditorWorkspace';
import {getDraftForSurvey,getSurvey} from '@/lib/data';
import {ActionForm} from '@/components/admin/ActionForm';
import {PublicUrlActions} from '@/components/admin/PublicUrlActions';
import {publishAction,unpublishAction} from '@/app/actions';
import {appUrl} from '@/lib/env';
export default async function Edit({params}:{params:Promise<{id:string}>}){const {id}=await params;const [survey,draft]=await Promise.all([getSurvey(id),getDraftForSurvey(id)]);if(!survey||!draft)notFound();return <><header className="editor-page-header"><div><p className="form-kicker">アンケート編集</p><h1>{survey.name}</h1><p className="muted">状態: {survey.status} · 下書き v{draft.version}</p></div><div className="editor-publish-actions">{survey.status==='published'?<PublicUrlActions url={`${appUrl()}/${survey.slug}`} surveyId={id}/>:<span className="muted">公開URL: 未公開</span>}{survey.status==='published'?<ActionForm action={unpublishAction.bind(null,id)} label="非公開にする"/>:<ActionForm action={publishAction.bind(null,id)} label="この下書きを公開"/>}</div></header><SurveyEditorWorkspace survey={survey} draft={draft}/></>}
