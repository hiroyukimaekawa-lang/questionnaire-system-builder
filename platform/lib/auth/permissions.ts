import type { Role } from '@/types/database';

export type Permission='read'|'create'|'edit'|'preview'|'publish'|'responses'|'csv'|'archive'|'manage_users';
const shared:Permission[]=['read','create','edit','preview','publish','responses','csv'];
export function can(role:Role,permission:Permission){return role==='admin'||shared.includes(permission);}
