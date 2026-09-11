import {existsSync,readFileSync} from 'node:fs';
const localEnv=new URL('../.env.local',import.meta.url);
if(existsSync(localEnv))process.loadEnvFile(localEnv);
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const expected='questionnaire';
if(config.name!==expected||config.account_id!=='739ef6b0d4cc5d4e1b5fb1a1ebae94af'||config.services?.some(binding=>binding.service!==expected))throw new Error('Production must deploy to questionnaire in the survey account.');
if(process.env.WORKERS_CI_WORKER_NAME&&process.env.WORKERS_CI_WORKER_NAME!==expected)throw new Error('Unexpected Cloudflare build target. Disconnect the old Worker Git integration.');
if(process.env.NEXT_PUBLIC_APP_URL!=='https://questionnaire.survey-system.workers.dev')throw new Error('NEXT_PUBLIC_APP_URL must use the production questionnaire URL.');
if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://acfheksrpwdbxoahnwit.supabase.co'||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)throw new Error('Configure the production Supabase public URL and key before deploying.');
