'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, Clock, CheckCircle, XCircle, FileText,
  BarChart3, LogOut, Menu, X, TrendingUp,
  UserCheck, AlertCircle, Activity,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { UserProfile } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  subscribeToUsers, subscribeToAttendance, subscribeToLeaveRequests,
  AttendanceRecord, LeaveRequest,
} from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: any): string {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function formatWorkHours(checkInTime: any, checkOutTime: any): string {
  if (!checkInTime) return '—'
  if (!checkOutTime) return 'Working…'
  try {
    const ms = checkOutTime.toDate().getTime() - checkInTime.toDate().getTime()
    if (ms <= 0) return '—'
    const h = Math.floor(ms / 3600000)
    const m = Math.round((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  } catch { return '—' }
}

function timeAgo(ts: any): string {
  if (!ts) return ''
  try {
    const diff = Date.now() - ts.toDate().getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return ts.toDate().toLocaleDateString()
  } catch { return '' }
}

// ─── Sad Person SVG (same as employee logout modal) ───────────────────────────
function SadPersonIllustration() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" className="w-40 h-36 mx-auto">
      {/* Bench */}
      <rect x="20" y="120" width="160" height="10" rx="5" fill="#e53e3e" />
      <rect x="20" y="108" width="160" height="10" rx="5" fill="#fc8181" />
      <rect x="28" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="164" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="70" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="122" y="130" width="8" height="30" rx="3" fill="#c53030" />
      {/* Body */}
      <rect x="82" y="80" width="36" height="40" rx="8" fill="#bee3f8" />
      <polygon points="100,85 97,100 100,110 103,100" fill="#2d3748" />
      <rect x="83" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      <rect x="103" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      <ellipse cx="90" cy="140" rx="9" ry="5" fill="#1a202c" />
      <ellipse cx="110" cy="140" rx="9" ry="5" fill="#1a202c" />
      {/* Arms drooping */}
      <path d="M82 90 Q68 100 66 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <path d="M118 90 Q132 100 134 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none"/>
      {/* Head */}
      <circle cx="100" cy="65" r="22" fill="#fbd38d" />
      <path d="M78 60 Q80 42 100 42 Q120 42 122 60" fill="#2d3748" />
      {/* Sad eyes */}
      <path d="M90 62 Q93 58 96 62" stroke="#2d3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M104 62 Q107 58 110 62" stroke="#2d3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Sad mouth */}
      <path d="M91 72 Q100 68 109 72" stroke="#c53030" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Tear */}
      <ellipse cx="90" cy="69" rx="2" ry="3" fill="#90cdf4" opacity="0.8"/>
    </svg>
  )
}

// ─── Reusable Confirm Modal ───────────────────────────────────────────────────
function ConfirmModal({
  show, onClose, onConfirm,
  illustration, title, subtitle,
  confirmLabel, confirmClass, loading = false,
}: {
  show: boolean
  onClose: () => void
  onConfirm: () => void
  illustration: React.ReactNode
  title: string
  subtitle: string
  confirmLabel: string
  confirmClass: string
  loading?: boolean
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center">
        {illustration}
        <h2 className="text-xl font-bold text-slate-900 mt-2 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-11 rounded-xl text-white font-semibold transition-colors ${confirmClass}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

function AdminDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [now, setNow] = useState(new Date())

  // ── Logout modal state ──────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const u1 = subscribeToUsers(setUsers)
    const u2 = subscribeToAttendance(setAttendance)
    const u3 = subscribeToLeaveRequests(setLeaves)
    return () => { u1(); u2(); u3() }
  }, [])

  // ── Logout with confirm ─────────────────────────────────────────────────
  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try {
      await signOut()
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
      setLogoutLoading(false)
      setShowLogoutConfirm(false)
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────

  const employees = useMemo(() => users.filter(u => u.role === 'employee'), [users])
  const todayStr  = now.toDateString()

  const todayAttendance = useMemo(() =>
    attendance.filter(a => {
      try { return a.date.toDate().toDateString() === todayStr }
      catch { return false }
    }),
    [attendance, todayStr]
  )

  const nameMap = useMemo(() => {
    const m = new Map<string, UserProfile>()
    users.forEach(u => m.set(u.uid, u))
    return m
  }, [users])

  const todayAttMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    todayAttendance.forEach(a => {
      const existing = m.get(a.uid)
      if (!existing) {
        m.set(a.uid, a)
      } else {
        try {
          const existingTime = existing.date.toDate().getTime()
          const newTime      = a.date.toDate().getTime()
          if (newTime > existingTime) m.set(a.uid, a)
        } catch {
          m.set(a.uid, a)
        }
      }
    })
    return m
  }, [todayAttendance])

  const presentCount    = Array.from(todayAttMap.values()).filter(a => a.checkInTime).length
  const checkedOutCount = Array.from(todayAttMap.values()).filter(a => a.checkInTime && a.checkOutTime).length
  const employeeCount   = employees.length
  const absentCount     = Math.max(0, employeeCount - presentCount)
  const onLeaveCount    = leaves.filter(l => {
    if (l.status !== 'approved') return false
    const today = now.toISOString().split('T')[0]
    try {
      const start = l.startDate.toDate().toISOString().split('T')[0]
      const end   = l.endDate.toDate().toISOString().split('T')[0]
      return today >= start && today <= end
    } catch { return false }
  }).length
  const attendancePct = employeeCount > 0 ? Math.round((presentCount / employeeCount) * 100) : 0

  const liveActivity = useMemo(() => {
    const events: { uid: string; type: 'in' | 'out'; ts: any; name: string; dept: string }[] = []
    todayAttendance.forEach(a => {
      const user = nameMap.get(a.uid)
      const name = user?.name || 'Unknown'
      const dept = user?.department || ''
      if (a.checkInTime)  events.push({ uid: a.uid, type: 'in',  ts: a.checkInTime,  name, dept })
      if (a.checkOutTime) events.push({ uid: a.uid, type: 'out', ts: a.checkOutTime, name, dept })
    })
    return events
      .sort((a, b) => {
        try { return b.ts.toDate().getTime() - a.ts.toDate().getTime() }
        catch { return 0 }
      })
      .slice(0, 15)
  }, [todayAttendance, nameMap])

  const todaySummary = useMemo(() =>
    employees.map(emp => ({
      uid: emp.uid,
      name: emp.name,
      dept: emp.department || '—',
      att: todayAttMap.get(emp.uid) || null,
    })).sort((a, b) => {
      if (a.att?.checkInTime && !b.att?.checkInTime) return -1
      if (!a.att?.checkInTime && b.att?.checkInTime) return 1
      return a.name.localeCompare(b.name)
    }),
    [employees, todayAttMap]
  )

  const pendingLeaves = useMemo(() =>
    leaves.filter(l => l.status === 'pending').slice(0, 5),
    [leaves]
  )

  const menuItems = [
    { label: 'Dashboard',      icon: BarChart3, href: '/admin/dashboard', active: true },
    { label: 'Employees',      icon: Users,     href: '/admin/employees' },
    { label: 'Attendance',     icon: Clock,     href: '/admin/attendance' },
    { label: 'Leave Requests', icon: FileText,  href: '/admin/leaves' },
      { label: 'Settings', icon: Settings, href: '/admin/settings' },
  ]

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ══════════ LOGOUT CONFIRM MODAL ══════════ */}
      <ConfirmModal
        show={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed}
        illustration={<SadPersonIllustration />}
        title="Comeback Soon!"
        subtitle="Are You Sure You Want to Logout?"
        confirmLabel="Yes, Logout"
        confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow">A</div>
              <div>
                <h1 className="font-bold text-slate-900">Attendance</h1>
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map(item => (
              <Link key={item.label} href={item.href}>
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left font-medium ${item.active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <item.icon className="w-5 h-5" />{item.label}
                </button>
              </Link>
            ))}
          </nav>
          <div className="px-4 py-5 border-t border-slate-200 space-y-3">
            <div className="px-4 py-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">Logged in as</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{userProfile?.name}</p>
              <p className="text-xs text-slate-400">{userProfile?.email}</p>
            </div>
            {/* Sign Out → opens confirm modal */}
            <Button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700">Live</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Users,      label: 'Total',       value: employeeCount,   sub: 'employees',         color: 'bg-blue-600',   light: 'bg-blue-50 text-blue-700' },
              { icon: CheckCircle,label: 'Present',     value: presentCount,    sub: `${attendancePct}%`, color: 'bg-green-600',  light: 'bg-green-50 text-green-700' },
              { icon: XCircle,    label: 'Absent',      value: absentCount,     sub: 'not checked in',    color: 'bg-red-500',    light: 'bg-red-50 text-red-700' },
              { icon: Clock,      label: 'On Leave',    value: onLeaveCount,    sub: 'approved today',    color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700' },
              { icon: UserCheck,  label: 'Checked Out', value: checkedOutCount, sub: 'done for today',    color: 'bg-purple-600', light: 'bg-purple-50 text-purple-700' },
            ].map((s, i) => (
              <Card key={i} className="p-5 bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${s.light}`}>{s.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${s.color} text-white flex items-center justify-center`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
              </Card>
            ))}
          </div>

          {/* Progress bar */}
          <Card className="p-5 bg-white shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800 text-sm">Today's Attendance Rate</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{attendancePct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700" style={{ width: `${attendancePct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{presentCount} present</span>
              <span>{absentCount} absent · {onLeaveCount} on leave</span>
            </div>
          </Card>

          {/* Live Feed + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-white shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <Activity className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-900 text-sm">Live Activity</h2>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">Live</span>
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-slate-50">
                {liveActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Clock className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No activity yet today</p>
                  </div>
                ) : liveActivity.map((ev, i) => {
                  const initials = ev.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${ev.type === 'in' ? 'bg-green-500' : 'bg-slate-400'}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{ev.name}</p>
                        <p className="text-xs text-slate-500">
                          {ev.type === 'in' ? '🟢 Checked in' : '🔴 Checked out'} · {formatTime(ev.ts)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(ev.ts)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-900 text-sm">Today's Summary</h2>
                <span className="ml-auto text-xs text-slate-500">{todaySummary.length} employees</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-80">
                {todaySummary.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Users className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No employees found</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Check In</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Out</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {todaySummary.map(row => {
                        const checkedIn  = !!row.att?.checkInTime
                        const checkedOut = !!row.att?.checkOutTime
                        const status     = checkedOut ? 'Done' : checkedIn ? 'Working' : 'Absent'
                        return (
                          <tr key={row.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${checkedIn ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                  {row.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 leading-tight">{row.name}</p>
                                  <p className="text-xs text-slate-400">{row.dept}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700 text-xs">{formatTime(row.att?.checkInTime)}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                              {checkedOut
                                ? <span className="text-slate-700">{formatTime(row.att?.checkOutTime)}</span>
                                : <span className="text-slate-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                              {formatWorkHours(row.att?.checkInTime, row.att?.checkOutTime)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`text-xs border-0 ${
                                status === 'Done'    ? 'bg-blue-100 text-blue-700' :
                                status === 'Working' ? 'bg-green-100 text-green-700' :
                                                       'bg-red-100 text-red-600'
                              }`}>
                                {status === 'Working' && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block mr-1" />
                                )}
                                {status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>

          {/* Pending Leaves + Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-100">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-sm">Pending Leave Requests</h2>
                </div>
                {pendingLeaves.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0">{pendingLeaves.length}</Badge>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {pendingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-slate-400">
                    <CheckCircle className="w-7 h-7 mb-2 opacity-40" />
                    <p className="text-sm">No pending requests</p>
                  </div>
                ) : pendingLeaves.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{l.employeeName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)} leave ·{' '}
                        {l.startDate.toDate().toLocaleDateString()} → {l.endDate.toDate().toLocaleDateString()} · {l.days} day{l.days > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link href="/admin/leaves">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white shadow-sm border border-slate-100 p-5">
              <h2 className="font-bold text-slate-900 text-sm mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Manage Employees', icon: Users,    href: '/admin/employees' },
                  { label: 'View Attendance',  icon: Clock,    href: '/admin/attendance' },
                  { label: 'Approve Leaves',   icon: FileText, href: '/admin/leaves' },
                ].map(a => (
                  <Link key={a.label} href={a.href}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-sm font-medium">
                      <a.icon className="w-4 h-4" />{a.label}
                    </button>
                  </Link>
                ))}
              </div>
            </Card>
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