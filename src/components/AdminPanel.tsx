import { useEffect, useState } from 'react'
import { App, Button, Drawer, Form, Input, Modal, Popconfirm, Space, Table, Tag, Alert, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { UserAddOutlined, ReloadOutlined } from '@ant-design/icons'
import { onValue, ref } from 'firebase/database'
import { db } from '../lib/firebase'
import { blockAccount, kickAccount, provisionUser } from '../lib/adminAccounts'
import { usernameEmail } from '../lib/username'
import type { AccountAccess, AccountRow, Profile } from '../authTypes'
interface Props { onClose: () => void; currentUid: string }
const consoleUsers = 'https://console.firebase.google.com/project/share-location-ecfea/authentication/users'
export function AdminPanel({ onClose, currentUid }: Props) {
  const { message } = App.useApp()
  const [profiles, setProfiles] = useState<Profile[]>([]), [access, setAccess] = useState<Record<string, AccountAccess>>({}), [presence, setPresence] = useState<Record<string, Record<string, { lastSeen: number }>>>({})
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [provisioning, setProvisioning] = useState(false), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now())
  const [form] = Form.useForm()
  const enteredUsername = Form.useWatch('username', form) as string | undefined
  let internalEmail = ''
  try { if (enteredUsername) internalEmail = usernameEmail(enteredUsername) } catch { /* Invalid input is shown by form validation. */ }
  useEffect(() => {
    const fail = (failure: Error) => setError(failure.message)
    const stops = [onValue(ref(db, 'profiles'), snapshot => setProfiles(Object.values(snapshot.val() || {})), fail), onValue(ref(db, 'access'), snapshot => setAccess(snapshot.val() || {}), fail), onValue(ref(db, 'presence'), snapshot => setPresence(snapshot.val() || {}), fail)]
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => { stops.forEach(stop => stop()); clearInterval(timer) }
  }, [])
  const registered = new Map(profiles.map(profile => [profile.uid, profile]))
  for (const [uid, account] of Object.entries(access)) if (!registered.has(uid)) registered.set(uid, { uid, username: account.username || uid, email: '', displayName: account.displayName || account.username || uid, role: account.role, createdAt: 0, lastLoginAt: 0 })
  const allRows: AccountRow[] = Array.from(registered.values()).map(profile => { const lastSeen = Math.max(0, ...Object.values(presence[profile.uid] || {}).map(session => session.lastSeen || 0)); return { ...profile, blocked: access[profile.uid]?.blocked === true, lastSeen, online: now - lastSeen < 90000 && !access[profile.uid]?.blocked } })
  const rows = allRows.filter(profile => `${profile.displayName} ${profile.username || profile.email}`.toLowerCase().includes(search.toLowerCase()))
  const action = async (task: () => Promise<void>) => { setBusy(true); try { await task(); void message.success('Đã cập nhật.') } catch (failure) { void message.error(failure instanceof Error ? failure.message : String(failure)) } finally { setBusy(false) } }
  const columns: TableColumnsType<AccountRow> = [
    { title: 'Người dùng', width: 290, render: (_, row) => <><strong>{row.displayName}</strong><div className="text-xs text-stone-500">{row.username || row.email}</div><div className="text-[10px] text-stone-400">{row.uid}</div></> },
    { title: 'Role', dataIndex: 'role', render: role => <Tag color={role === 'admin' ? 'green' : 'blue'}>{role}</Tag> },
    { title: 'Trạng thái', render: (_, row) => <Tag color={row.blocked ? 'red' : row.online ? 'green' : 'default'}>{row.blocked ? 'Đã block' : row.online ? 'Online' : 'Offline'}</Tag> },
    { title: 'Truy cập gần nhất', dataIndex: 'lastLoginAt', width: 190, render: value => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa đăng nhập' },
    { title: 'Thao tác', width: 250, render: (_, row) => row.uid === currentUid || row.role === 'admin' ? <span className="text-xs text-stone-400">Tài khoản admin</span> : <Space><Popconfirm title="Kick phiên đăng nhập?" description="Người này có thể đăng nhập lại. Block mới chặn truy cập tiếp." onConfirm={() => action(() => kickAccount(row.uid))}><Button disabled={busy || row.blocked}>Kick</Button></Popconfirm><Popconfirm title={row.blocked ? 'Mở lại quyền dữ liệu?' : 'Block quyền truy cập ứng dụng?'} description="Tài khoản Auth vẫn tồn tại; Database Rules sẽ chặn dữ liệu." onConfirm={() => action(() => blockAccount(row.uid, !row.blocked))}><Button danger={!row.blocked} disabled={busy}>{row.blocked ? 'Unblock' : 'Block'}</Button></Popconfirm></Space> },
  ]
  return <><Drawer title="Quản trị người dùng · Firebase Spark" open onClose={onClose} styles={{ wrapper: { width: 'min(1180px, 100vw)' } }}>
    <div className="mb-5 grid grid-cols-3 gap-3">{[{ title: 'Tài khoản ghi nhận', value: allRows.length }, { title: 'Đang online', value: allRows.filter(row => row.online).length }, { title: 'Đã block', value: Object.values(access).filter(item => item.blocked).length }].map(item => <div key={item.title} className="rounded-2xl bg-[#f1f4ea] p-4"><p className="text-xs text-stone-500">{item.title}</p><strong className="mt-2 block text-2xl">{item.value}</strong></div>)}</div>
    <Alert type="info" showIcon className="mb-4" title="Không dùng backend riêng" description="Tạo tài khoản trong Firebase Console, sau đó cấp quyền user tại đây. Kick/block áp dụng trực tiếp bằng Database Rules, không disable tài khoản Auth." />
    {error && <Alert type="error" className="mb-4" title="Không đọc được bảng" description={error} />}
    <div className="my-4 flex flex-wrap justify-between gap-3"><Input.Search placeholder="Tìm tên hoặc tài khoản" value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: 340 }} /><Space><Button icon={<ReloadOutlined />} onClick={() => setNow(Date.now())}>Cập nhật</Button><Button type="primary" icon={<UserAddOutlined />} onClick={() => setProvisioning(true)}>Thêm user từ Console</Button></Space></div><Table rowKey="uid" columns={columns} dataSource={rows} scroll={{ x: 1000 }} pagination={{ pageSize: 10 }} />
  </Drawer><Modal title="Thêm tài khoản user" open={provisioning} confirmLoading={busy} okText="Cấp quyền user" cancelText="Đóng" onCancel={() => { setProvisioning(false); form.resetFields() }} onOk={() => form.submit()}>
    <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-stone-500"><li>Nhập tên tài khoản bên dưới để lấy email nội bộ.</li><li>Mở <a href={consoleUsers} target="_blank" rel="noopener noreferrer">Firebase Console → Authentication → Users</a>, chọn Add user, nhập email nội bộ và mật khẩu.</li><li>Copy UID vừa tạo, dán vào form rồi cấp quyền user.</li></ol>
    <Form form={form} layout="vertical" onFinish={async (values: { uid: string; username: string; displayName: string }) => { setBusy(true); try { await provisionUser(values.uid.trim(), values.username, values.displayName); void message.success('Đã cấp quyền user.'); setProvisioning(false); form.resetFields() } catch (failure) { void message.error(String(failure)) } finally { setBusy(false) } }}><Form.Item label="Tài khoản" name="username" rules={[{ required: true }, { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}$/, message: '3–32 ký tự không dấu.' }]}><Input autoComplete="off" /></Form.Item>{internalEmail && <div className="mb-4 rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Email nội bộ để tạo trong Console</p><Typography.Text copyable>{internalEmail}</Typography.Text></div>}<Form.Item label="UID từ Firebase Authentication" name="uid" rules={[{ required: true, whitespace: true, max: 128 }]}><Input /></Form.Item><Form.Item label="Tên hiển thị" name="displayName" rules={[{ required: true, whitespace: true, max: 40 }]}><Input /></Form.Item></Form>
  </Modal></>
}
