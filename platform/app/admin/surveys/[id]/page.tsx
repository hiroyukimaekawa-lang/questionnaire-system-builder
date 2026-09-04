import {notFound} from 'next/navigation';
import {SurveyEditorWorkspace} from '@/components/admin/SurveyEditorWorkspace';
import {getDraftForSurvey,getSurvey,getUser} from '@/lib/data';
import {PublishSection} from '@/components/admin/PublishSection';
import {DeleteSurveySection} from '@/components/admin/DeleteSurveySection';
import {publishAction,unpublishAction} from '@/app/actions';
import {appUrl} from '@/lib/env';
export default async function Edit({params}:{params:Promise<{id:string}>}){const {id}=await params;const [survey,draft,user]=await Promise.all([getSurvey(id),getDraftForSurvey(id),getUser()]);if(!survey||!draft||survey.status==='archived')notFound();const publicUrl=`${appUrl()}/${survey.slug}`;return <><header className="editor-page-header"><div><p className="form-kicker">アンケート編集</p><h1>{survey.name}</h1><p className="muted">状態: {survey.status} · 下書き v{draft.version}</p></div><div className="editor-publish-actions"><PublishSection variant="compact" status={survey.status} hasPublishedBefore={Boolean(survey.current_published_version_id)} publicUrl={publicUrl} slug={survey.slug} publishAction={publishAction.bind(null,id)} unpublishAction={unpublishAction.bind(null,id)}/></div></header><SurveyEditorWorkspace survey={survey} draft={draft} publicUrl={publicUrl} publishAction={publishAction.bind(null,id)} unpublishAction={unpublishAction.bind(null,id)}/>{user?.role==='admin'?<DeleteSurveySection id={id} name={survey.name} slug={survey.slug} status={survey.status} baseUrl={appUrl()}/>:null}</>}
