import { onValue, ref, set, get, child, update, serverTimestamp } from 'firebase/database'
import { db } from './firebase'
import { load, persist } from './storage'
import { isMember } from './positions'
import type { LocationState, Member } from '../types'
import type { Role } from '../authTypes'

class LocationService {
  private listeners = new Set<() => void>()
  private state: LocationState = { room: '', name: '', members: [], sharing: false, connected: false, current: null, status: 'Chưa đăng nhập', error: '' }
  private uid: string | null = null
  private role: Role = 'user'
  private subscriptions: (() => void)[] = []
  private watch: number | null = null
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private epoch = 0
  private lastSent = 0
  private serverMembers: Member[] = []
  private ownMember: Member | null = null
  snapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private patch(next: Partial<LocationState>) { this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener()) }
  private fail(error: unknown) { this.patch({ error: error instanceof Error ? error.message : String(error) }) }
  private enqueue(task: () => Promise<unknown>) { this.queue = this.queue.catch(() => undefined).then(task); return this.queue }
  clearError = () => this.patch({ error: '' })
  private members() { this.patch({ members: this.role === 'admin' ? this.serverMembers : [...this.serverMembers, ...(this.ownMember ? [this.ownMember] : [])] }) }
  bind(uid: string, role: Role, name: string) {
    this.unbind()
    this.uid = uid; this.role = role
    this.patch({ name, status: 'Đang kết nối vị trí…', error: '' })
    const source = role === 'admin' ? 'locations' : 'adminLocations'
    this.subscriptions.push(onValue(ref(db, source), snapshot => {
      this.serverMembers = []
      for (const [id, value] of Object.entries(snapshot.val() || {})) if (isMember(value)) this.serverMembers.push({ ...value, id, isSelf: id === uid })
      this.members()
    }, error => { this.pause(false); this.fail(error) }))
    if (role === 'user') this.subscriptions.push(onValue(ref(db, `locations/${uid}`), snapshot => {
      const value = snapshot.val(); this.ownMember = isMember(value) ? { ...value, id: uid, isSelf: true } : null; this.members()
    }, error => this.fail(error)))
    this.subscriptions.push(onValue(ref(db, '.info/connected'), snapshot => {
      const connected = snapshot.val() === true
      this.patch({ connected, status: connected ? this.state.sharing ? 'GPS đang bật' : 'Đã kết nối' : 'Mất mạng · giữ vị trí cuối' })
      if (connected && this.state.sharing) this.publish(true)
    }))
    if (load(`auto-${uid}`) !== 'off') this.start()
  }
  unbind() { this.pause(false); this.subscriptions.forEach(stop => stop()); this.subscriptions = []; this.uid = null; this.serverMembers = []; this.ownMember = null; this.patch({ members: [], connected: false, name: '', current: null }) }
  resume() { if (this.uid && load(`auto-${this.uid}`) !== 'off') this.start() }
  syncName(name: string) { this.patch({ name }) }
  start = () => {
    if (!this.uid || this.state.sharing) return
    if (!window.isSecureContext || !navigator.geolocation) { this.fail('GPS cần HTTPS hoặc localhost.'); return }
    persist(`auto-${this.uid}`, 'on')
    const epoch = ++this.epoch
    this.patch({ sharing: true, status: 'Đang chờ GPS…', error: '' })
    this.watch = navigator.geolocation.watchPosition(position => {
      if (epoch !== this.epoch || !this.state.sharing) return
      this.patch({ current: { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: Math.min(100000, Math.max(0, position.coords.accuracy)), capturedAt: position.timestamp } })
      this.publish()
    }, error => { if (epoch !== this.epoch) return; this.pause(false); this.fail(error.code === 1 ? 'Bạn chưa cấp quyền GPS.' : error.code === 3 ? 'GPS chưa phản hồi. Bật lại để thử.' : 'Không lấy được vị trí.') }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 })
    this.heartbeat = setInterval(() => this.publish(true), 15000)
  }
  private publish(force = false) {
    const current = this.state.current, uid = this.uid, role = this.role
    if (!uid || !this.state.sharing || !this.state.connected || !current || Date.now() - current.capturedAt > 90000 || (!force && Date.now() - this.lastSent < 3000)) return
    this.lastSent = Date.now()
    const epoch = this.epoch, payload = { ...current, name: this.state.name, updatedAt: serverTimestamp() }
    void this.enqueue(async () => {
      if (epoch !== this.epoch || !this.state.sharing || !this.state.connected) return
      const changes: Record<string, unknown> = { [`locations/${uid}`]: payload }
      if (role === 'admin') changes[`adminLocations/${uid}`] = payload
      await update(ref(db), changes)
      if (epoch === this.epoch) this.patch({ status: `Đang chia sẻ · sai số ${Math.round(current.accuracy)} m` })
    }).catch(error => { if (epoch === this.epoch) this.fail(error) })
  }
  pause = (remember = true) => { if (remember && this.uid) persist(`auto-${this.uid}`, 'off'); this.epoch++; if (this.watch !== null) navigator.geolocation.clearWatch(this.watch); this.watch = null; if (this.heartbeat !== null) clearInterval(this.heartbeat); this.heartbeat = null; this.patch({ sharing: false, current: null, status: 'Dừng GPS · giữ vị trí cuối' }) }
  deletePosition = async () => {
    if (!this.uid || !this.state.connected) { this.fail('Kết nối trước khi xóa vị trí.'); return }
    this.pause(); const uid = this.uid, role = this.role
    try { await this.enqueue(() => update(ref(db), { [`locations/${uid}`]: null, ...(role === 'admin' ? { [`adminLocations/${uid}`]: null } : {}) })); this.patch({ status: 'Đã xóa vị trí của bạn' }) } catch (error) { this.fail(error) }
  }
  rename = async (value: string) => {
    const name = value.trim(), uid = this.uid, role = this.role
    if (!name || name.length > 40 || !uid) { this.fail('Tên cần từ 1 đến 40 ký tự.'); return }
    try {
      await set(ref(db, `profiles/${uid}/displayName`), name); if (this.uid !== uid) return; this.patch({ name, error: '' })
      await this.enqueue(async () => { const target = ref(db, `locations/${uid}`); if ((await get(target)).exists()) await set(child(target, 'name'), name); if (role === 'admin' && (await get(ref(db, `adminLocations/${uid}`))).exists()) await set(ref(db, `adminLocations/${uid}/name`), name) })
    } catch (error) { this.fail(error) }
  }
  retry = () => { this.clearError(); this.start() }
}
export const locationService = new LocationService()
window.addEventListener('pagehide', () => locationService.pause(false))
window.addEventListener('pageshow', event => { if (event.persisted) locationService.resume() })


