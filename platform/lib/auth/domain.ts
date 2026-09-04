export const CRESTIX_EMAIL_DOMAIN='crestix-inc.com';

/**
 * Strict full-domain match on whatever follows the LAST '@' in the address.
 * Rejects "user@crestix-inc.com.evil.com" and "crestix-inc.com@evil.com" alike -
 * mirrors is_crestix_email() in supabase/migrations/202609050001_crestix_domain_auto_approval.sql.
 */
export function isCrestixEmail(email:string):boolean{
  const at=email.lastIndexOf('@');
  if(at===-1)return false;
  return email.slice(at+1).trim().toLowerCase()===CRESTIX_EMAIL_DOMAIN;
}
