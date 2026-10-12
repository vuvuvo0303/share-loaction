import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordinates, Member } from '../types'
import { ageLabel, positionLabel } from '../lib/positions'
interface Props { members: Member[]; current: Coordinates | null; selected: Member | null; onSelect: (member: Member) => void }
function pin(self: boolean) { return L.divIcon({ className: '', html: `<div class="map-pin ${self ? 'self' : ''}">${self ? '😎' : '📍'}</div>`, iconSize: [54, 62], iconAnchor: [27, 62] }) }
export function MapView({ members, current, selected, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const circle = useRef<L.Circle | null>(null)
  const tileLayer = useRef<L.TileLayer | null>(null)
  const firstGps = useRef(true)
  const [notice, setNotice] = useState('Đang tải bản đồ…')
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { zoomControl: false }).setView([10.789, 106.710], 14)
    map.current = instance
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance)
    tileLayer.current = tiles
    let loaded = false
    tiles.on('tileload', () => { loaded = true; setNotice('') })
    tiles.on('tileerror', () => setNotice('Không tải được bản đồ. Kiểm tra kết nối rồi thử lại.'))
    const timer = setTimeout(() => { if (!loaded) setNotice('Bản đồ tải quá lâu. Kiểm tra kết nối rồi thử lại.') }, 12000)
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => { clearTimeout(timer); observer.disconnect(); instance.remove(); map.current = null; markers.current.clear(); circle.current = null }
  }, [])
  useEffect(() => {
    if (!map.current) return
    const visible = members.filter(member => !(member.isSelf && current))
    const positions: Member[] = current ? [...visible, { ...current, id: 'my-gps', isSelf: true, name: 'Bạn', updatedAt: current.capturedAt }] : visible
    const ids = new Set(positions.map(member => member.id))
    for (const [id, marker] of markers.current) if (!ids.has(id)) { marker.remove(); markers.current.delete(id) }
    for (const member of positions) {
      let marker = markers.current.get(member.id)
      if (!marker) { marker = L.marker([member.lat, member.lng], { icon: pin(member.isSelf), title: member.name }).addTo(map.current); markers.current.set(member.id, marker) }
      marker.setLatLng([member.lat, member.lng]); marker.getElement()?.setAttribute('title', member.name)
      marker.off('click').on('click', () => onSelect(member))
    }
    if (current) {
      if (!circle.current) circle.current = L.circle([current.lat, current.lng], { radius: current.accuracy, color: '#527944', weight: 1, fillOpacity: 0.09 }).addTo(map.current)
      else circle.current.setLatLng([current.lat, current.lng]).setRadius(current.accuracy)
      if (firstGps.current) { map.current.flyTo([current.lat, current.lng], 16); firstGps.current = false }
    } else { circle.current?.remove(); circle.current = null }
  }, [members, current, onSelect])
  useEffect(() => { if (selected) map.current?.flyTo([selected.lat, selected.lng], 16) }, [selected])
  const center = () => { const position = current || members.find(member => member.isSelf); if (position) map.current?.flyTo([position.lat, position.lng], 16); else setNotice('Chưa có tọa độ của bạn. Bật GPS để định vị.') }
  return <main className="relative min-h-[43dvh] min-w-0 flex-1 overflow-hidden bg-[#e6ebdf]">
    <div ref={container} className="absolute inset-0" aria-label="Bản đồ vị trí" />
    <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] flex items-start justify-between gap-3 md:inset-x-6 md:top-6">
      <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-sm"><strong className="text-sm">Thế giới nhỏ của mình 🌿</strong><p className="mt-1 text-xs text-stone-500">Vị trí theo quyền truy cập</p></div>
      <span className="rounded-xl border border-stone-200 bg-white/95 px-3 py-3 text-xs font-medium md:text-sm">Made By Vũ Lê</span>
    </div>
    {notice && <div role="status" className="absolute inset-x-4 top-24 z-[1000] rounded-xl bg-amber-50 p-3 text-sm shadow-sm">{notice}<button className="ml-3 rounded-lg bg-[#315f48] px-3 py-1 text-white" onClick={() => { setNotice('Đang tải lại…'); tileLayer.current?.redraw() }}>Thử lại</button></div>}
    <div className="absolute bottom-9 right-4 z-[1000] grid gap-2 md:right-6">{[{ text: '◎', label: 'Về vị trí của tôi', action: center }, { text: '+', label: 'Phóng to', action: () => map.current?.zoomIn() }, { text: '−', label: 'Thu nhỏ', action: () => map.current?.zoomOut() }].map(button => <button key={button.label} aria-label={button.label} onClick={button.action} className="h-12 w-12 rounded-2xl bg-white text-2xl shadow-md hover:bg-stone-50">{button.text}</button>)}</div>
    <div className="absolute bottom-9 left-4 z-[1000] max-w-[calc(100%-100px)] rounded-2xl bg-white/95 px-4 py-3 shadow-sm md:left-6">{selected ? <><strong>{selected.name}</strong><p className="mt-1 text-xs text-stone-500">{positionLabel(selected.capturedAt)} · {ageLabel(selected.capturedAt)} · sai số {Math.round(selected.accuracy)} m</p></> : <><strong>Gần nhau, dù ở đâu.</strong><p className="mt-1 text-xs text-stone-500">Chọn tên để xem vị trí cuối của bạn bè.</p></>}</div>
  </main>
}
