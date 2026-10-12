import { lazy, Suspense, useEffect, useState } from 'react'
import { Button, Spin, Tag, App as AntApp, ConfigProvider } from 'antd'
import { LogoutOutlined, TeamOutlined } from '@ant-design/icons'
import { useAuth } from './hooks/useAuth'
import { useLocations } from './hooks/useLocations'
import { LoginPage } from './components/LoginPage'
import { Sidebar } from './components/Sidebar'
import { HistoryDialog } from './components/HistoryDialog'
import type { Member } from './types'
import type { Role } from './authTypes'
const MapView = lazy(() => import('./components/MapView').then(module => ({ default: module.MapView })))
const AdminPanel = lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })))
function Workspace({ uid, role, name, onLogout }: { uid: string; role: Role; name: string; onLogout: () => Promise<void> }) {
  const locations = useLocations(uid, role, name)
  const [selected, select] = useState<Member | null>(null), [historyOpen, setHistoryOpen] = useState(false), [adminOpen, setAdminOpen] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const timer = setInterval(() => tick(value => value + 1), 10000); return () => clearInterval(timer) }, [])
  const selectedMember = selected ? locations.members.find(member => member.id === selected.id) || (selected.id === 'my-gps' && locations.current ? selected : null) : null
  return <div className="flex h-dvh flex-col bg-[#f9faf5]">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3"><div className="flex items-center gap-3"><Tag color={role === 'admin' ? 'green' : 'blue'}>{role === 'admin' ? 'Admin' : 'User'}</Tag><span className="text-xs text-stone-500">{role === 'admin' ? 'Bạn xem được tất cả người dùng' : 'Bạn chỉ xem được admin và vị trí của mình'}</span></div><div className="flex gap-2">{role === 'admin' && <Button type="primary" icon={<TeamOutlined />} onClick={() => setAdminOpen(true)}>Quản trị</Button>}<Button icon={<LogoutOutlined />} onClick={() => void onLogout()}>Đăng xuất</Button></div></header>
    <div className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden md:flex-row"><Sidebar name={locations.name || name} status={locations.status} connected={locations.connected} sharing={locations.sharing} members={locations.members} onRename={locations.rename} onToggle={() => locations.sharing ? locations.pause() : locations.start()} onSelect={select} onHistory={() => setHistoryOpen(true)} /><Suspense fallback={<main className="grid min-h-[40dvh] flex-1 place-items-center"><Spin /></main>}><MapView members={locations.members} current={locations.current} selected={selectedMember} onSelect={select} /></Suspense></div>
    {historyOpen && <HistoryDialog members={locations.members} onClose={() => setHistoryOpen(false)} onSelect={select} onDelete={locations.deletePosition} />}
    {adminOpen && role === 'admin' && <Suspense fallback={<Spin fullscreen />}><AdminPanel currentUid={uid} onClose={() => setAdminOpen(false)} /></Suspense>}
    {locations.error && <div role="alert" className="fixed bottom-5 left-1/2 z-[3000] flex w-[min(520px,92vw)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#24352c] p-4 text-sm text-white shadow-lg"><span className="flex-1">{locations.error}</span><button className="rounded-lg bg-white/15 px-2 py-1" onClick={locations.retry}>Thử lại</button><button aria-label="Đóng thông báo" onClick={locations.clearError}>×</button></div>}
  </div>
}
function Application() {
  const session = useAuth()
  if (session.loading) return <main className="grid min-h-dvh place-items-center bg-[#f9faf5]"><Spin description="Đang xác minh tài khoản…" /></main>
  if (!session.signedIn || !session.user || !session.role) return <LoginPage uid={session.user?.uid} error={session.error} hasAccount={!!session.user && !session.user.isAnonymous} onLogin={session.login} onRetry={session.retry} onLogout={() => session.logout()} />
  return <Workspace key={session.user.uid} uid={session.user.uid} role={session.role} name={session.profile?.displayName || session.user.displayName || session.user.email?.split('@')[0] || 'Người dùng'} onLogout={() => session.logout()} />
}
export default function Root() { return <ConfigProvider theme={{ token: { colorPrimary: '#315f48', zIndexPopupBase: 2000, borderRadius: 12, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' } }}><AntApp><Application /></AntApp></ConfigProvider> }

