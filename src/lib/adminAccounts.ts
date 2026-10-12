import { ref, update, get, set, serverTimestamp } from 'firebase/database'
import { db, auth } from './firebase'
import { normalizeUsername } from './username'
function target(uid: string) { if (!uid || uid.length > 128 || /[.#$\[\]/]/.test(uid) || uid === auth.currentUser?.uid) throw new Error('UID không hợp lệ hoặc là chính bạn.'); return uid }
export async function kickAccount(uid: string) { target(uid); await update(ref(db), { [`access/${uid}/kickedAt`]: serverTimestamp(), [`presence/${uid}`]: null }) }
export async function blockAccount(uid: string, blocked: boolean) { target(uid); await update(ref(db), { [`access/${uid}/blocked`]: blocked, ...(blocked ? { [`presence/${uid}`]: null } : {}) }) }
export async function provisionUser(uid: string, value: string, displayName: string) {
  target(uid)
  const username = normalizeUsername(value)
  if (username === 'admin') throw new Error('Tên admin dành cho quản trị viên.')
  const name = displayName.trim()
  if (!name || name.length > 40) throw new Error('Tên cần từ 1 đến 40 ký tự.')
  const account = ref(db, `access/${uid}`)
  if ((await get(account)).exists()) throw new Error('UID đã được cấp quyền. Dùng Unblock nếu tài khoản bị khóa.')
  await set(account, { role: 'user', blocked: false, kickedAt: 0, username, displayName: name })
}
