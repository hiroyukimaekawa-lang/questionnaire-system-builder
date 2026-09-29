import type {AssistantPageType} from './types';

// Pure route -> pageType / IDs mapping, kept separate from anything DOM/React so it
// can be unit tested without a browser. Mirrors the actual app/admin route tree -
// update this alongside new routes, don't infer from URL shape alone.
export function inferPageType(pathname: string): AssistantPageType {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  if (path === '/admin/users') return 'users';
  if (path.startsWith('/admin/account')) return 'account';
  if (path === '/admin/surveys/new') return 'survey_builder';
  if (/^\/admin\/surveys\/[^/]+(\/(preview|questions))?$/.test(path)) return 'survey_editor';
  if (/^\/admin\/surveys\/[^/]+\/responses$/.test(path)) return 'responses';
  if (/^\/admin\/manage\/[^/]+\/analytics$/.test(path)) return 'analytics';
  if (/^\/admin\/manage\/[^/]+\/responses$/.test(path)) return 'responses';
  if (/^\/admin\/manage(\/[^/]+)?$/.test(path)) return 'manage_list';
  if (path === '/admin') return 'manage_list';
  return 'unknown';
}

// surveyId only, never anything about the survey's content/answers.
export function inferSurveyId(pathname: string): string | undefined {
  const path = pathname.split('?')[0];
  const match = path.match(/^\/admin\/(?:surveys|manage)\/([^/]+)/);
  const id = match?.[1];
  // /admin/surveys/new is the create form, not an existing survey's id.
  return id && id !== 'new' ? id : undefined;
}
