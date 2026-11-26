import type {AssistantEnvironment} from './assistant/types';

// Best-effort, read-only identification of what's actually running - used to attach
// appCommitSha/environment to assistant context (and, later, to any Crestix AI OS
// change request). Never reads or exposes secrets; every value here is safe to send
// to the browser as plain metadata. No env var is set by this file - it only reads
// whatever the hosting platform (Vercel, Cloudflare Pages, GitHub Actions) already
// provides, and degrades to `undefined`/'development' when nothing is available.

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

// Short SHA is enough for a human/agent to identify a build; never the full env dump.
export function resolveAppCommitSha(): string | undefined {
  const sha = firstDefined(
    process.env.CF_PAGES_COMMIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
  );
  return sha?.slice(0, 12);
}

export function resolveEnvironment(): AssistantEnvironment {
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    return process.env.VERCEL_ENV;
  }
  if (process.env.NODE_ENV !== 'production') return 'development';
  const branch = process.env.CF_PAGES_BRANCH?.trim();
  if (branch && branch !== 'main') return 'preview';
  return 'production';
}
