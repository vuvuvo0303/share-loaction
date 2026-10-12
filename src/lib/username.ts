export const ACCOUNT_DOMAIN = 'accounts.share-location.invalid'
export function normalizeUsername(value: string) { const username = value.trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)) throw new Error('Tài khoản cần 3–32 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.'); return username }
export function usernameEmail(value: string) { return `${normalizeUsername(value)}@${ACCOUNT_DOMAIN}` }
