import type { Member } from '../types'
export function isMember(value: unknown): value is Omit<Member, 'id' | 'isSelf'> {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return typeof p.name === 'string' && typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && typeof p.lng === 'number' && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180 && typeof p.accuracy === 'number' && Number.isFinite(p.accuracy) && typeof p.capturedAt === 'number' && Number.isFinite(p.capturedAt) && typeof p.updatedAt === 'number' && Number.isFinite(p.updatedAt)
}
export function ageLabel(timestamp: number, now = Date.now()) { const seconds = Math.max(0, Math.floor((now - timestamp) / 1000)); if (seconds < 60) return `${seconds} giây trước`; if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`; return `${Math.floor(seconds / 86400)} ngày trước` }
export function positionLabel(timestamp: number, now = Date.now()) { return now - timestamp < 90000 ? 'Tọa độ gần đây' : 'Vị trí cuối — chưa cập nhật' }
