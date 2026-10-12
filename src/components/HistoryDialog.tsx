import { useEffect, useRef } from 'react'
import type { Member } from '../types'
import { ageLabel } from '../lib/positions'
interface Props { members: Member[]; onClose: () => void; onSelect: (member: Member) => void; onDelete: () => Promise<void> }
export function HistoryDialog({ members, onClose, onSelect, onDelete }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="m-auto w-[min(560px,92vw)] rounded-3xl p-6 text-[#24352c] shadow-xl backdrop:bg-black/35">
    <h2 className="text-xl font-bold">Vị trí gần nhất của bạn bè</h2><p className="my-3 text-sm leading-6 text-stone-500">Tọa độ cuối đã chia sẻ trong ứng dụng, kể cả khi GPS tắt. Đây không phải lịch sử di chuyển.</p>
    <div className="max-h-[50dvh] overflow-auto">{members.length ? [...members].sort((a, b) => b.capturedAt - a.capturedAt).map(member => <button key={member.id} className="w-full rounded-xl p-3 text-left hover:bg-[#edf0e5]" onClick={() => { onSelect(member); onClose() }}><strong>{member.name}{member.isSelf ? ' (Bạn)' : ''}</strong><p className="mt-1 text-xs text-stone-500">{new Date(member.capturedAt).toLocaleString('vi-VN')} · {ageLabel(member.capturedAt)}</p><p className="mt-1 text-xs text-stone-500">{member.lat.toFixed(6)}, {member.lng.toFixed(6)} · sai số {Math.round(member.accuracy)} m</p></button>) : <p className="p-3 text-sm text-stone-500">Chưa có vị trí được lưu trong ứng dụng.</p>}</div>
    <div className="mt-5 flex gap-3"><button className="button-secondary flex-1" onClick={onClose}>Đóng</button><button className="button-secondary flex-1 text-red-700" onClick={() => void onDelete()}>Xóa vị trí của tôi</button></div>
  </dialog>
}
