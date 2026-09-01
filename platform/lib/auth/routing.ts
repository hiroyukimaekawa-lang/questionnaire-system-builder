export function authDestination(pathname:string,authenticated:boolean){
  if(pathname.startsWith('/admin')&&!authenticated)return '/login';
  return null;
}
