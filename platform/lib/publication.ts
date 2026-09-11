type Publication={id:string;status:string;slug:string;current_published_version_id:string|null;current_draft_version_id:string|null;published_at:string|null};
export function isVerifiedPublication(survey:Publication|null,id:string,publishedId:string):survey is Publication {
  return Boolean(survey&&survey.id===id&&survey.status==='published'&&survey.slug&&survey.current_published_version_id===publishedId&&survey.current_draft_version_id&&survey.published_at&&Number.isFinite(Date.parse(survey.published_at)));
}
