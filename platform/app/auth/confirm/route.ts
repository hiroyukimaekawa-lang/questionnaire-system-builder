import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/security';
import {acceptVerifiedInvitations} from '@/lib/invitations';
export async function GET(request: Request) {const url=new URL(request.url),tokenHash=url.searchParams.get('token_hash'),type=url.searchParams.get('type') as EmailOtpType|null,next=safeNextPath(url.searchParams.get('next'),'/login');if(tokenHash&&type){const supabase=await createClient();const {data,error}=await supabase.auth.verifyOtp({type,token_hash:tokenHash});if(!error){const user=data.user??(await supabase.auth.getUser()).data.user;if(user?.email)await acceptVerifiedInvitations(user.id,user.email);return NextResponse.redirect(new URL(next,url.origin));}}return NextResponse.redirect(new URL('/login?recovery=invalid',url.origin));}
