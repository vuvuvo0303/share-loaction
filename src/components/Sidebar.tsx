import { useState } from 'react'
import type { Member } from '../types'
import { ageLabel, positionLabel } from '../lib/positions'
interface Props { name: string; status: string; connected: boolean; sharing: boolean; members: Member[]; onRename: (name: string) => Promise<void>; onToggle: () => void; onSelect: (member: Member) => void; onHistory: () => void }
export function Sidebar({ name, status, connected, sharing, members, onRename, onToggle, onSelect, onHistory }: Props) {
  const [draft, setDraft] = useState(name)
  const [query, setQuery] = useState('')
  const filtered = members.filter(member => member.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
  return <aside className="z-[1001] -mt-4 flex h-[48dvh] shrink-0 flex-col overflow-y-auto rounded-t-3xl border-stone-200 bg-[#f9faf5] px-5 py-5 md:mt-0 md:h-full md:w-[350px] md:rounded-none md:border-r md:px-6 md:py-8">
    <div className="flex items-center gap-3 text-3xl font-extrabold tracking-tight"><span className="inline-block -rotate-9 rounded-2xl bg-[#dcec88] px-3 py-1">↗</span> ở đây <span className="text-sm text-[#91a174]">●</span></div>
    <p className="mb-5 mt-2 hidden text-xs text-stone-500 md:block">Một chấm nhỏ. Một chút gần nhau hơn.</p>
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e3edbd] text-2xl">😎</div><div className="min-w-0"><strong className="block truncate">{name}</strong><p role="status" className="mt-1 text-xs text-stone-500">{status}</p></div></div>
    <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); void onRename(draft) }}><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={40} required aria-label="Tên của bạn" placeholder="Tên của bạn" className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" /><button className="button-secondary text-sm" type="submit">Lưu tên</button></form>
    <div className="mb-3 mt-5 flex items-center justify-between text-sm font-bold">Vị trí được phép xem <span className="rounded-full bg-[#e8eddc] px-2 py-1 text-[10px] font-medium text-[#59704c]">{connected ? 'Đã kết nối' : 'Chưa kết nối'}</span></div>
    <button className="button-secondary mb-3 w-full text-sm" onClick={onHistory}>◷ Vị trí gần nhất</button>
    <input value={query} onChange={event => setQuery(event.target.value)} aria-label="Tìm bạn bè" placeholder="Tìm một người bạn…" className="mb-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
    <div className="flex-1">{filtered.map(member => <button key={member.id} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-[#edf0e5]" onClick={() => onSelect(member)}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eee5d8] text-xl">{member.isSelf ? '😎' : '📍'}</span><span className="min-w-0"><strong className="block truncate text-sm">{member.name}{member.isSelf ? ' (Bạn)' : ''}</strong><span className="mt-1 block text-[11px] text-stone-500">{positionLabel(member.capturedAt)} · {ageLabel(member.capturedAt)}</span></span></button>)}{!filtered.length && <p className="py-3 text-xs leading-5 text-stone-500">{members.length ? 'Không tìm thấy người này.' : 'Chưa có tọa độ. Chưa có tọa độ được chia sẻ. User chỉ thấy admin; admin thấy tất cả.'}</p>}</div>
    <div className="pt-4"><button onClick={onToggle} className="w-full rounded-2xl bg-[#315f48] px-4 py-3 text-sm font-bold text-white hover:bg-[#254d38]">{sharing ? '◉ Tắt chia sẻ vị trí' : '◎ Bật vị trí của tôi'}</button><p className="mt-3 text-[11px] leading-5 text-stone-500">Tắt GPS vẫn giữ vị trí cuối. Xóa dữ liệu trong “Vị trí gần nhất”. Dữ liệu được giới hạn theo role của tài khoản.</p></div>
  </aside>
}
