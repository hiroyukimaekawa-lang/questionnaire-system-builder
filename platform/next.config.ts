import type { NextConfig } from 'next';
const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Content-Security-Policy',value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"},
];
const privateHeaders=[...securityHeaders,{key:'Cache-Control',value:'private, no-store, max-age=0'},{key:'Vary',value:'Cookie'}];
const nextConfig: NextConfig = { poweredByHeader: false,async headers(){return [{source:'/:path*',headers:securityHeaders},{source:'/login',headers:privateHeaders},{source:'/admin/:path*',headers:privateHeaders},{source:'/auth/:path*',headers:privateHeaders}]}};
export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
if (process.env.NODE_ENV === 'development') initOpenNextCloudflareForDev();
