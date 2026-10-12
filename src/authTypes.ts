export type Role = 'admin' | 'user'
export interface Profile { uid: string; username: string; displayName: string; email: string; role: Role; createdAt: number; lastLoginAt: number }
export interface AccountAccess { username?: string; displayName?: string; role: Role; blocked: boolean; kickedAt: number }
export interface AccountRow extends Profile { blocked: boolean; online: boolean; lastSeen: number }
