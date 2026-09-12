import {getCloudflareContext} from '@opennextjs/cloudflare';

export async function parseLimitedJson(request:Request,maxBytes:number):Promise<unknown>{
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>maxBytes)throw new Error('REQUEST_BODY_TOO_LARGE');
  if(!request.body)return null;
  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let received=0;
  let text='';
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    received+=value.byteLength;
    if(received>maxBytes){await reader.cancel();throw new Error('REQUEST_BODY_TOO_LARGE');}
    text+=decoder.decode(value,{stream:true});
  }
  text+=decoder.decode();
  return JSON.parse(text);
}

export async function rateLimitSurveyResponse(request:Request):Promise<boolean>{
  try{
    const env=getCloudflareContext().env as {SURVEY_RESPONSE_RATE_LIMITER?:{limit(input:{key:string}):Promise<{success:boolean}>}};
    const limiter=env.SURVEY_RESPONSE_RATE_LIMITER;
    if(!limiter)return true;
    const actor=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const {success}=await limiter.limit({key:`${actor}:${new URL(request.url).pathname}`});
    return success;
  }catch{
    return process.env.NODE_ENV!=='production';
  }
}
