export function load(key: string): string | null { try { return localStorage.getItem(`oday-${key}`) } catch { return null } }
export function persist(key: string, value: string) { try { localStorage.setItem(`oday-${key}`, value) } catch { /* Private browsers can disable storage. */ } }
export function randomId(): string { return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('') }
export function getRoom(): string { const link = new URLSearchParams(location.hash.slice(1)).get('room'); const stored = load('room'); const valid = (value: string | null) => value !== null && /^[a-f0-9]{32}$/.test(value); return valid(link) ? link! : valid(stored) ? stored! : randomId() }
