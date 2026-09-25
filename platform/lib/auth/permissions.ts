import type { Role } from '@/types/database';

export type Permission='read'|'create'|'edit'|'preview'|'publish'|'responses'|'analytics'|'csv'|'archive'|'manage_users'|'manage_invitations';
const shared:Permission[]=['read','create','edit','preview','publish','responses','csv'];
export function can(role:Role,permission:Permission){if(role==='admin')return true;if(role==='viewer')return ['read','responses','analytics'].includes(permission);return shared.includes(permission)||permission==='analytics';}
