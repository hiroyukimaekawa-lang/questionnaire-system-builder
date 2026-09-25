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
