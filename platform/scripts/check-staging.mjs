import {existsSync,readFileSync} from 'node:fs';

const localEnv=new URL('../.env.staging.local',import.meta.url);
if(existsSync(localEnv))process.loadEnvFile(localEnv);

const config=JSON.parse(readFileSync(new URL('../wrangler.staging.jsonc',import.meta.url),'utf8'));
const expectedWorker='questionnaire-staging';
const expectedAccount='739ef6b0d4cc5d4e1b5fb1a1ebae94af';
const expectedAppUrl='https://questionnaire-staging.survey-system.workers.dev';
const productionProjectRef='acfheksrpwdbxoahnwit';

if(config.name!==expectedWorker||config.account_id!==expectedAccount||config.services?.some(binding=>binding.service!==expectedWorker)){
  throw new Error('Staging must deploy only to questionnaire-staging in the survey account.');
}
if(process.env.WORKERS_CI_WORKER_NAME&&process.env.WORKERS_CI_WORKER_NAME!==expectedWorker){
  throw new Error('Unexpected Cloudflare staging build target.');
}
if(config.vars?.NEXT_PUBLIC_APP_URL!==expectedAppUrl||process.env.NEXT_PUBLIC_APP_URL!==expectedAppUrl){
  throw new Error(`NEXT_PUBLIC_APP_URL must be ${expectedAppUrl} for staging.`);
}

const stagingProjectRef=process.env.STAGING_SUPABASE_PROJECT_REF?.trim();
if(!stagingProjectRef)throw new Error('Set STAGING_SUPABASE_PROJECT_REF to the dedicated staging project ref.');
if(stagingProjectRef===productionProjectRef)throw new Error('Production Supabase is forbidden for staging deploys.');

const expectedSupabaseUrl=`https://${stagingProjectRef}.supabase.co`;
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==expectedSupabaseUrl||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){
  throw new Error('Configure the dedicated staging Supabase URL and public key before deploying.');
}
if(!process.env.SUPABASE_SERVICE_ROLE_KEY){
  throw new Error('Configure the staging-only Supabase service role key for invitations and sync status updates.');
}
