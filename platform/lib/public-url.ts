export function publicSurveyUrl(baseUrl: string, slug: string) {
  return `${baseUrl.replace(/\/$/, '')}/${slug}`;
}

export function hasPublicUrl(status: string) { return status === 'published'; }
