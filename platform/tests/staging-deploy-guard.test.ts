import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const platformDir=fileURLToPath(new URL('..',import.meta.url));
const appUrl='https://questionnaire-staging.survey-system.workers.dev';

function runGuard(projectRef:string,supabaseUrl=`https://${projectRef}.supabase.co`){
  return spawnSync(process.execPath,['scripts/check-staging.mjs'],{
    cwd:platformDir,
    encoding:'utf8',
    env:{
      ...process.env,
      WORKERS_CI_WORKER_NAME:'questionnaire-staging',
      NEXT_PUBLIC_APP_URL:appUrl,
      STAGING_SUPABASE_PROJECT_REF:projectRef,
      NEXT_PUBLIC_SUPABASE_URL:supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-public-key',
      SUPABASE_SERVICE_ROLE_KEY:'test-server-only-key'
    }
  });
}

test('staging guard accepts a separately identified staging project',()=>{
  const result=runGuard('stagingprojectref123');
  assert.equal(result.status,0,result.stderr);
});

test('staging guard rejects the production Supabase project',()=>{
  const result=runGuard('acfheksrpwdbxoahnwit');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Production Supabase is forbidden/);
});

test('staging guard rejects a URL that does not match the declared project ref',()=>{
  const result=runGuard('stagingprojectref123','https://differentprojectref.supabase.co');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/dedicated staging Supabase URL/);
});

test('production and staging deploy commands keep separate guards and configs',async()=>{
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(pkg.scripts.deploy,/check-production\.mjs/);
  assert.doesNotMatch(pkg.scripts.deploy,/staging/);
  assert.match(pkg.scripts['deploy:staging'],/check-staging\.mjs/);
  assert.match(pkg.scripts['deploy:staging'],/wrangler\.staging\.jsonc/);
});

test('production guard requires the production project and server-only service role key',()=>{
  const validEnv={
    ...process.env,
    WORKERS_CI_WORKER_NAME:'questionnaire',
    NEXT_PUBLIC_APP_URL:'https://questionnaire.survey-system.workers.dev',
    NEXT_PUBLIC_SUPABASE_URL:'https://acfheksrpwdbxoahnwit.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-public-key',
    SUPABASE_SERVICE_ROLE_KEY:'test-server-only-key'
  };
  const valid=spawnSync(process.execPath,['scripts/check-production.mjs'],{cwd:platformDir,encoding:'utf8',env:validEnv});
  assert.equal(valid.status,0,valid.stderr);

  const missingSecretEnv={...validEnv,SUPABASE_SERVICE_ROLE_KEY:''};
  const missingSecret=spawnSync(process.execPath,['scripts/check-production.mjs'],{cwd:platformDir,encoding:'utf8',env:missingSecretEnv});
  assert.notEqual(missingSecret.status,0);
  assert.match(missingSecret.stderr,/Runtime Secret/);

  const wrongProject=spawnSync(process.execPath,['scripts/check-production.mjs'],{
    cwd:platformDir,
    encoding:'utf8',
    env:{...validEnv,NEXT_PUBLIC_SUPABASE_URL:'https://wrongprojectref.supabase.co'}
  });
  assert.notEqual(wrongProject.status,0);
  assert.match(wrongProject.stderr,/production Supabase public URL/);
});
