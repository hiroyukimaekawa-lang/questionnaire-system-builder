export function requireQueryData<T>(data:T|null,error:{code?:string}|null,stage:string):T {
  if(error||data===null){
    console.error('[admin-query]',{stage,code:error?.code??'MISSING_DATA'});
    throw new Error('アンケート一覧の取得に失敗しました。');
  }
  return data;
}
