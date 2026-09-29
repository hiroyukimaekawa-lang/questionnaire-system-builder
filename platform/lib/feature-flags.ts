// Server-only feature flag reads. Flags resolve to a plain boolean before ever
// reaching a client component prop - never pass the raw env value or a secret to
// the browser. Landing this code must not change any existing user-visible
// behavior; a flag defaults to false until explicitly turned on in an environment.

function readBooleanFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return defaultValue;
  return raw === 'true' || raw === '1' || raw === 'on';
}

// Gates the internal Help/Improvement assistant (floating button + chat drawer +
// its API routes). Off by default: merging this feature does not expose it to
// employees until an environment explicitly sets
// QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED=true.
export function isInternalAssistantEnabled(): boolean {
  return readBooleanFlag('QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED', false);
}
