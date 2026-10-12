import type { AccountAccess } from '../authTypes'
export function accessRole(value: unknown): AccountAccess['role'] | null { if (!value || typeof value !== 'object') return null; const role = (value as AccountAccess).role; return role === 'admin' || role === 'user' ? role : null }
export function canEnter(access: AccountAccess | null, authTimeSeconds: number) { return !!accessRole(access) && access?.blocked === false && Number.isFinite(access?.kickedAt) && authTimeSeconds * 1000 > (access?.kickedAt || 0) }
