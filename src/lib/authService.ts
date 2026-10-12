import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { get, ref, onValue, onDisconnect, set, remove, serverTimestamp } from 'firebase/database'
import { usernameEmail } from './username'
import { auth, db, persistenceReady } from './firebase'
import { accessRole, canEnter } from './access'
import type { Role, AccountAccess, Profile } from '../authTypes'
interface SessionState { user: User | null; role: Role | null; profile: Profile | null; loading: boolean; error: string; signedIn: boolean }
class AuthService {
  private state: SessionState = { user: null, role: null, profile: null, loading: true, error: '', signedIn: false }
  private listeners = new Set<() => void>()
  private initialized = false
  private revision = 0
  private stops: (() => void)[] = []
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private presenceRef: ReturnType<typeof ref> | null = null
  private reason = ''
  snapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private patch(next: Partial<SessionState>) { this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener()) }
  private cleanup() { this.stops.forEach(stop => stop()); this.stops = []; clearInterval(this.heartbeat); if (this.presenceRef) void remove(this.presenceRef).catch(() => undefined); this.presenceRef = null }
  mount() { if (this.initialized) return; this.initialized = true; void persistenceReady.then(() => onAuthStateChanged(auth, user => { void this.accept(user) })).catch(error => this.patch({ loading: false, error: String(error) })) }
  private async accept(user: User | null) {
    const revision = ++this.revision
    this.cleanup()
    this.patch({ user, signedIn: false, role: null, profile: null, loading: !!user, error: this.reason })
    if (!user) return
    if (user.isAnonymous) { await signOut(auth); return }
    try {
      const token = await user.getIdTokenResult()
      if (token.signInProvider !== 'password' || !user.email?.endsWith('@accounts.share-location.invalid')) throw new Error('Dùng tài khoản/mật khẩu được admin cấp.')
      const access = (await get(ref(db, `access/${user.uid}`))).val() as AccountAccess | null
      const role = accessRole(access), authTime = Number(token.claims.auth_time)
      if (!role) throw new Error('Tài khoản chưa được cấp role. Admin cần thiết lập access cho UID này trong Firebase hoặc bảng quản trị.')
      if (!canEnter(access, authTime)) { await this.logout(access?.blocked ? 'Tài khoản bị block quyền truy cập.' : 'Phiên đã bị kick. Đợi một giây rồi đăng nhập lại.'); return }
      if (revision !== this.revision) return
      const profileRef = ref(db, `profiles/${user.uid}`), previous = (await get(profileRef)).val() as Profile | null
      const profile = { uid: user.uid, username: user.email.split('@')[0], email: user.email, displayName: previous?.displayName || access?.displayName || user.displayName || user.email.split('@')[0], role, createdAt: previous?.createdAt || serverTimestamp(), lastLoginAt: serverTimestamp() }
      await set(profileRef, profile)
      if (revision !== this.revision) return
      this.patch({ signedIn: true, loading: false, role, error: '' })
      this.stops.push(onValue(ref(db, `access/${user.uid}`), snapshot => {
        const next = snapshot.val() as AccountAccess | null
        if (!canEnter(next, authTime) || accessRole(next) !== role) void this.logout(next?.blocked ? 'Admin đã block tài khoản.' : 'Phiên/quyền đã thay đổi. Đăng nhập lại.')
      }, () => { void this.logout('Không còn quyền truy cập.') }))
      this.stops.push(onValue(profileRef, snapshot => this.patch({ profile: snapshot.val() as Profile | null }), error => this.patch({ error: error.message })))
      const sessionId = crypto.randomUUID().replaceAll('-', '')
      this.presenceRef = ref(db, `presence/${user.uid}/${sessionId}`)
      const target = this.presenceRef
      this.stops.push(onValue(ref(db, '.info/connected'), async snapshot => {
        if (!snapshot.val()) return
        try { await onDisconnect(target).remove(); if (revision !== this.revision) return; await set(target, { startedAt: serverTimestamp(), lastSeen: serverTimestamp() }) } catch (error) { if (revision === this.revision) this.patch({ error: String(error) }) }
      }))
      this.heartbeat = setInterval(() => { if (revision === this.revision) void set(ref(db, `presence/${user.uid}/${sessionId}/lastSeen`), serverTimestamp()).catch(() => undefined) }, 30000)
    } catch (error) { if (revision === this.revision) this.patch({ loading: false, signedIn: false, error: error instanceof Error ? error.message : String(error) }) }
  }
  login = async (username: string, password: string) => { this.reason = ''; this.patch({ error: '' }); try { await persistenceReady; await signInWithEmailAndPassword(auth, usernameEmail(username), password) } catch (error) { const code = (error as { code?: string }).code; this.patch({ error: code === 'auth/operation-not-allowed' ? 'Bật Email/Password trong Firebase Authentication.' : code === 'auth/invalid-credential' ? 'Sai tài khoản/mật khẩu hoặc tài khoản chưa được tạo trong Firebase Console.' : String(error) }) } }
  logout = async (reason = '') => { this.reason = reason; this.revision++; this.cleanup(); this.patch({ signedIn: false, user: null, role: null, profile: null, loading: false, error: reason }); await signOut(auth) }
  retry = () => { if (auth.currentUser) void this.accept(auth.currentUser); else this.patch({ error: '' }) }
}
export const authService = new AuthService()

