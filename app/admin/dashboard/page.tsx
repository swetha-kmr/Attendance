'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { UserProfile } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  subscribeToUsers, subscribeToAttendance, subscribeToLeaveRequests,
  AttendanceRecord, LeaveRequest,
} from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── MUI Icons ──────────────────────────────────────────────────────────────────
import DashboardRoundedIcon      from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon         from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon     from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon      from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon       from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon           from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon    from '@mui/icons-material/FingerprintRounded'
import CheckCircleRoundedIcon    from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon         from '@mui/icons-material/CancelRounded'
import BeachAccessRoundedIcon    from '@mui/icons-material/BeachAccessRounded'
import HowToRegRoundedIcon       from '@mui/icons-material/HowToRegRounded'
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded'
import WarningAmberRoundedIcon   from '@mui/icons-material/WarningAmberRounded'
import AssignmentRoundedIcon    from '@mui/icons-material/AssignmentRounded'
import SpeedRoundedIcon          from '@mui/icons-material/SpeedRounded'

// ── Sad Person Illustration ───────────────────────────────────────────────────
function SadPersonIllustration() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" className="w-40 h-36 mx-auto">
      <rect x="20" y="120" width="160" height="10" rx="5" fill="#e53e3e" />
      <rect x="20" y="108" width="160" height="10" rx="5" fill="#fc8181" />
      <rect x="28" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="164" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="70" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="122" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="82" y="80" width="36" height="40" rx="8" fill="#bee3f8" />
      <polygon points="100,85 97,100 100,110 103,100" fill="#2d3748" />
      <rect x="83" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      <rect x="103" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      <ellipse cx="90" cy="140" rx="9" ry="5" fill="#1a202c" />
      <ellipse cx="110" cy="140" rx="9" ry="5" fill="#1a202c" />
      <path d="M82 90 Q68 100 66 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <path d="M118 90 Q132 100 134 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <circle cx="100" cy="65" r="22" fill="#fbd38d" />
      <path d="M78 60 Q80 42 100 42 Q120 42 122 60" fill="#2d3748" />
      <path d="M90 62 Q93 58 96 62" stroke="#2d3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M104 62 Q107 58 110 62" stroke="#2d3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M91 72 Q100 68 109 72" stroke="#c53030" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="90" cy="69" rx="2" ry="3" fill="#90cdf4" opacity="0.8"/>
    </svg>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  show, onClose, onConfirm, illustration, title, subtitle,
  confirmLabel, confirmClass, loading = false,
}: {
  show: boolean; onClose: () => void; onConfirm: () => void
  illustration: React.ReactNode; title: string; subtitle: string
  confirmLabel: string; confirmClass: string; loading?: boolean
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center animate-in fade-in zoom-in duration-200">
        {illustration}
        <h2 className="text-xl font-bold text-slate-900 mt-2 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 h-11 rounded-xl text-white font-semibold transition-colors ${confirmClass}`}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient, iconBg }: {
  icon: React.ReactNode; label: string; value: number | string; sub: string
  gradient: string; iconBg: string
}) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} relative overflow-hidden group`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ts: any): string {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
function formatWorkHours(ci: any, co: any): string {
  if (!ci) return '—'
  if (!co) return 'Working…'
  try {
    const ms = co.toDate().getTime() - ci.toDate().getTime()
    if (ms <= 0) return '—'
    const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  } catch { return '—' }
}
function timeAgo(ts: any): string {
  if (!ts) return ''
  try {
    const m = Math.floor((Date.now() - ts.toDate().getTime()) / 60000)
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
    return ts.toDate().toLocaleDateString()
  } catch { return '' }
}

// ── Main Content ──────────────────────────────────────────────────────────────
function AdminDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers]       = useState<UserProfile[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves]     = useState<LeaveRequest[]>([])
  const [now, setNow]           = useState(new Date())
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading]         = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const u1 = subscribeToUsers(setUsers)
    const u2 = subscribeToAttendance(setAttendance)
    const u3 = subscribeToLeaveRequests(setLeaves)
    return () => { u1(); u2(); u3() }
  }, [])

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const employees     = useMemo(() => users.filter(u => u.role === 'employee'), [users])
  const todayStr      = now.toDateString()
  const todayAtt      = useMemo(() => attendance.filter(a => { try { return a.date.toDate().toDateString() === todayStr } catch { return false } }), [attendance, todayStr])
  const nameMap       = useMemo(() => { const m = new Map<string, UserProfile>(); users.forEach(u => m.set(u.uid, u)); return m }, [users])
  const todayAttMap   = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    todayAtt.forEach(a => {
      const ex = m.get(a.uid)
      if (!ex) { m.set(a.uid, a); return }
      try { if (a.date.toDate().getTime() > ex.date.toDate().getTime()) m.set(a.uid, a) } catch { m.set(a.uid, a) }
    }); return m
  }, [todayAtt])

  const presentCount    = Array.from(todayAttMap.values()).filter(a => a.checkInTime).length
  const checkedOutCount = Array.from(todayAttMap.values()).filter(a => a.checkInTime && a.checkOutTime).length
  const absentCount     = Math.max(0, employees.length - presentCount)
  const onLeaveCount    = leaves.filter(l => {
    if (l.status !== 'approved') return false
    const today = now.toISOString().split('T')[0]
    try { const s = l.startDate.toDate().toISOString().split('T')[0], e = l.endDate.toDate().toISOString().split('T')[0]; return today >= s && today <= e } catch { return false }
  }).length
  const attendancePct = employees.length > 0 ? Math.round((presentCount / employees.length) * 100) : 0

  const liveActivity = useMemo(() => {
    const events: { type: 'in' | 'out'; ts: any; name: string; dept: string }[] = []
    todayAtt.forEach(a => {
      const u = nameMap.get(a.uid)
      if (a.checkInTime)  events.push({ type: 'in',  ts: a.checkInTime,  name: u?.name || 'Unknown', dept: u?.department || '' })
      if (a.checkOutTime) events.push({ type: 'out', ts: a.checkOutTime, name: u?.name || 'Unknown', dept: u?.department || '' })
    })
    return events.sort((a, b) => { try { return b.ts.toDate().getTime() - a.ts.toDate().getTime() } catch { return 0 } }).slice(0, 15)
  }, [todayAtt, nameMap])

  const todaySummary = useMemo(() =>
    employees.map(e => ({ uid: e.uid, name: e.name, dept: e.department || '—', att: todayAttMap.get(e.uid) || null }))
      .sort((a, b) => { if (a.att?.checkInTime && !b.att?.checkInTime) return -1; if (!a.att?.checkInTime && b.att?.checkInTime) return 1; return a.name.localeCompare(b.name) }),
    [employees, todayAttMap])

  const pendingLeaves = useMemo(() => leaves.filter(l => l.status === 'pending').slice(0, 5), [leaves])

  const navItems = [
    { href: '/admin/dashboard', icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Dashboard',      active: true  },
    { href: '/admin/employees', icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Employees',      active: false },
    { href: '/admin/attendance',icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,label: 'Attendance',     active: false },
    // { href: '/admin/leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />, label: 'Leave Requests', active: false },
    {href: '/admin/daily-status', icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />, label: 'Daily Status', active: false },
    { href: '/admin/settings',  icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Settings',       active: false },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      <ConfirmModal
        show={showLogoutConfirm}  onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />}
        title="Comeback Soon!"    subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
              <FingerprintRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm leading-tight">SeyonSync</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Menu</p>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${item.active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <span className={item.active ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
                {item.active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
              </button>
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100 space-y-3">
          <div className="px-3 py-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userProfile?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{userProfile?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-slate-400 truncate">{userProfile?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm"
          >
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-slate-400">
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700">Live</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={<PeopleRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />} label="Total" value={employees.length} sub="employees" gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900" iconBg="bg-blue-200" />
            <StatCard icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />} label="Present" value={presentCount} sub={`${attendancePct}% rate`} gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard icon={<CancelRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />} label="Absent" value={absentCount} sub="not checked in" gradient="bg-gradient-to-br from-red-50 to-red-100 text-red-900" iconBg="bg-red-200" />
            <StatCard icon={<BeachAccessRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />} label="On Leave" value={onLeaveCount} sub="approved today" gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900" iconBg="bg-amber-200" />
            <StatCard icon={<HowToRegRoundedIcon sx={{ fontSize: 20, color: '#7c3aed' }} />} label="Checked Out" value={checkedOutCount} sub="done for today" gradient="bg-gradient-to-br from-violet-50 to-violet-100 text-violet-900" iconBg="bg-violet-200" />
          </div>

          {/* Attendance Rate Bar */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUpRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                <span className="font-extrabold text-slate-900 text-sm">Today's Attendance Rate</span>
              </div>
              <span className="text-2xl font-black text-blue-600">{attendancePct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700" style={{ width: `${attendancePct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
              <span>{presentCount} present</span>
              <span>{absentCount} absent · {onLeaveCount} on leave</span>
            </div>
          </div>

          {/* Live Feed + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Activity */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <SpeedRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                <h2 className="font-extrabold text-slate-900 text-sm">Live Activity</h2>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600 font-semibold">Live</span>
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-slate-50">
                {liveActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                    <AccessTimeRoundedIcon sx={{ fontSize: 36 }} />
                    <p className="text-sm mt-2 font-medium">No activity yet today</p>
                  </div>
                ) : liveActivity.map((ev, i) => {
                  const initials = ev.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${ev.type === 'in' ? 'bg-green-500' : 'bg-slate-400'}`}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{ev.name}</p>
                        <p className="text-xs text-slate-400">{ev.type === 'in' ? '🟢 Checked in' : '🔴 Checked out'} · {formatTime(ev.ts)}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(ev.ts)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Today's Summary Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <PeopleRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                <h2 className="font-extrabold text-slate-900 text-sm">Today's Summary</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{todaySummary.length} employees</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-80">
                {todaySummary.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                    <PeopleRoundedIcon sx={{ fontSize: 36 }} />
                    <p className="text-sm mt-2 font-medium">No employees found</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {['Employee','Check In','Check Out','Hours','Status'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {todaySummary.map(row => {
                        const checkedIn  = !!row.att?.checkInTime
                        const checkedOut = !!row.att?.checkOutTime
                        const status     = checkedOut ? 'Done' : checkedIn ? 'Working' : 'Absent'
                        return (
                          <tr key={row.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${checkedIn ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                  {row.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 text-xs leading-tight">{row.name}</p>
                                  <p className="text-[11px] text-slate-400">{row.dept}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">{formatTime(row.att?.checkInTime)}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{checkedOut ? formatTime(row.att?.checkOutTime) : <span className="text-slate-300">—</span>}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-700">{formatWorkHours(row.att?.checkInTime, row.att?.checkOutTime)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                status === 'Done'    ? 'bg-blue-100 text-blue-700' :
                                status === 'Working' ? 'bg-green-100 text-green-700' :
                                                       'bg-red-100 text-red-600'
                              }`}>
                                {status === 'Working' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                {status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Pending Leaves + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#d97706' }} />
                  <h2 className="font-extrabold text-slate-900 text-sm">Pending Leave Requests</h2>
                </div>
                {pendingLeaves.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{pendingLeaves.length}</span>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {pendingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-slate-300">
                    <CheckCircleRoundedIcon sx={{ fontSize: 28 }} />
                    <p className="text-sm mt-2 font-medium">No pending requests</p>
                  </div>
                ) : pendingLeaves.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{l.employeeName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)} leave ·{' '}
                        {l.startDate.toDate().toLocaleDateString()} → {l.endDate.toDate().toLocaleDateString()} · {l.days} day{l.days > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link href="/admin/leaves">
                      <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">Review</button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-extrabold text-slate-900 text-sm mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Manage Employees', icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} />,     href: '/admin/employees' },
                  { label: 'View Attendance',  icon: <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />, href: '/admin/attendance' },
                  // { label: 'Approve Leaves',   icon: <EventNoteRoundedIcon sx={{ fontSize: 18 }} />,  href: '/admin/leaves' },
                ].map(a => (
                  <Link key={a.label} href={a.href}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-semibold hover:-translate-y-0.5 active:translate-y-0">
                      <span className="text-slate-400">{a.icon}</span>{a.label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}