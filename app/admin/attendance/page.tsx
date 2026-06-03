'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { UserProfile } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  subscribeToUsers,
  subscribeToAttendance,
  subscribeToLeaveRequests,
  AttendanceRecord,
  LeaveRequest,
} from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'

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
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded'
import DownloadRoundedIcon       from '@mui/icons-material/DownloadRounded'
import FilterListRoundedIcon     from '@mui/icons-material/FilterListRounded'
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateString(ts: Timestamp): string {
  try { return ts.toDate().toISOString().split('T')[0] } catch { return '' }
}
function formatTime(ts: Timestamp | undefined | null): string {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
function calcWorkHours(ci?: Timestamp | null, co?: Timestamp | null): string {
  if (!ci) return '—'
  if (!co) return 'In progress'
  try {
    const ms = co.toDate().getTime() - ci.toDate().getTime()
    if (ms <= 0) return '—'
    const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  } catch { return '—' }
}
function exportCSV(rows: FlatRecord[], date: string) {
  const header = ['Name','Email','Department','Check In','Check Out','Work Hours','Status']
  const lines = rows.map(r => [r.name,r.email,r.department,r.checkIn,r.checkOut,r.workHours,r.status].join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `attendance-${date}.csv`; a.click()
  URL.revokeObjectURL(url)
}

interface FlatRecord {
  uid: string; name: string; email: string; department: string
  checkIn: string; checkOut: string; workHours: string
  status: 'Present' | 'Absent' | 'On Leave'
}

const DEPARTMENTS = ['Engineering','HR','Finance','Marketing','Operations','Design']

// ── Stat Card — exact same as dashboard ──────────────────────────────────────

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

// ── Main Content ──────────────────────────────────────────────────────────────

function AttendanceContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    let count = 0
    const done = () => { count++; if (count === 3) setLoading(false) }
    const u1 = subscribeToUsers(d => { setUsers(d); done() })
    const u2 = subscribeToAttendance(d => { setAttendance(d); done() })
    const u3 = subscribeToLeaveRequests(d => { setLeaves(d); done() })
    return () => { u1(); u2(); u3() }
  }, [])

  const records: FlatRecord[] = useMemo(() => {
    const employees = users.filter(u => u.role === 'employee' && u.status === 'active')
    const onLeaveUids = new Set(
      leaves.filter(l => {
        if (l.status !== 'approved') return false
        const s = toDateString(l.startDate), e = toDateString(l.endDate)
        return selectedDate >= s && selectedDate <= e
      }).map(l => l.uid)
    )
    const attMap = new Map<string, AttendanceRecord>()
    attendance.filter(a => toDateString(a.date) === selectedDate).forEach(a => {
      const ex = attMap.get(a.uid)
      if (!ex) { attMap.set(a.uid, a); return }
      try { if (a.date.toDate().getTime() > ex.date.toDate().getTime()) attMap.set(a.uid, a) } catch { attMap.set(a.uid, a) }
    })
    return employees.map(emp => {
      const dept = emp.department || '—'
      if (onLeaveUids.has(emp.uid)) return { uid: emp.uid, name: emp.name, email: emp.email, department: dept, checkIn: '—', checkOut: '—', workHours: 'On Leave', status: 'On Leave' }
      const att = attMap.get(emp.uid)
      if (att) return { uid: emp.uid, name: emp.name, email: emp.email, department: dept, checkIn: formatTime(att.checkInTime), checkOut: formatTime(att.checkOutTime), workHours: calcWorkHours(att.checkInTime, att.checkOutTime), status: 'Present' }
      return { uid: emp.uid, name: emp.name, email: emp.email, department: dept, checkIn: '—', checkOut: '—', workHours: '—', status: 'Absent' }
    })
  }, [users, attendance, leaves, selectedDate])

  const filtered = useMemo(() =>
    records.filter(r => {
      const ms = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.email.toLowerCase().includes(searchTerm.toLowerCase())
      const ss = statusFilter === 'all' || r.status === statusFilter
      const ds = deptFilter === 'all' || r.department === deptFilter
      return ms && ss && ds
    }), [records, searchTerm, statusFilter, deptFilter])

  const total   = records.length
  const present = records.filter(r => r.status === 'Present').length
  const absent  = records.filter(r => r.status === 'Absent').length
  const onLeave = records.filter(r => r.status === 'On Leave').length
  const checkedOut = records.filter(r => r.status === 'Present' && r.checkOut !== '—').length
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0

  const handleLogout = async () => {
    await signOut(); router.push('/')
  }

  const navItems = [
    { href: '/admin/dashboard', icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Dashboard',      active: false },
    { href: '/admin/employees', icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Employees',      active: false },
    { href: '/admin/attendance',icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />, label: 'Attendance',     active: true  },
    { href: '/admin/leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Leave Requests', active: false },
    { href: '/admin/settings',  icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Settings',       active: false },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── Sidebar — identical to dashboard ── */}
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
          {navItems.map(item => (
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
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm">
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Attendance</h1>
            <p className="text-xs text-slate-400">
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => exportCSV(filtered, selectedDate)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <DownloadRoundedIcon sx={{ fontSize: 16 }} />Export CSV
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Stat Cards — same as dashboard ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={<PeopleRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />}
              label="Total" value={total} sub="employees"
              gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"
              iconBg="bg-blue-200"
            />
            <StatCard
              icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />}
              label="Present" value={present} sub={`${attendancePct}% rate`}
              gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900"
              iconBg="bg-emerald-200"
            />
            <StatCard
              icon={<CancelRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />}
              label="Absent" value={absent} sub="not checked in"
              gradient="bg-gradient-to-br from-red-50 to-red-100 text-red-900"
              iconBg="bg-red-200"
            />
            <StatCard
              icon={<BeachAccessRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />}
              label="On Leave" value={onLeave} sub="approved today"
              gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900"
              iconBg="bg-amber-200"
            />
            <StatCard
              icon={<HowToRegRoundedIcon sx={{ fontSize: 20, color: '#7c3aed' }} />}
              label="Checked Out" value={checkedOut} sub="done for today"
              gradient="bg-gradient-to-br from-violet-50 to-violet-100 text-violet-900"
              iconBg="bg-violet-200"
            />
          </div>

          {/* ── Attendance Rate Bar — same as dashboard ── */}
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
              <span>{present} present</span>
              <span>{absent} absent · {onLeave} on leave</span>
            </div>
          </div>

          {/* ── Filters — same panel style as dashboard ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <FilterListRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <h2 className="font-extrabold text-slate-900 text-sm">Filter Records</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date" value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
                <div className="relative">
                  <SearchRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Name or email…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                <select
                  value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              Showing <span className="font-bold text-slate-700">{filtered.length}</span> of {total} employees
            </p>
          </div>

          {/* ── Table — same panel style as dashboard ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <AccessTimeRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <h2 className="font-extrabold text-slate-900 text-sm">Attendance Records</h2>
              <span className="ml-auto text-xs text-slate-400 font-medium">{filtered.length} employees</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-500 text-sm font-medium">Loading attendance data…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <AccessTimeRoundedIcon sx={{ fontSize: 40 }} />
                <p className="text-sm mt-2 font-medium text-slate-400">No records found</p>
                <p className="text-xs text-slate-300 mt-1">Try changing the date or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {['Employee', 'Department', 'Check In', 'Check Out', 'Work Hours', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(record => {
                      const initials = record.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                      return (
                        <tr key={record.uid} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-xs leading-tight">{record.name}</p>
                                <p className="text-[11px] text-slate-400">{record.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                              {record.department}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {record.checkIn === '—' ? <span className="text-slate-300">—</span> : record.checkIn}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {record.checkOut === '—' ? <span className="text-slate-300">—</span> : <span className="font-medium">{record.checkOut}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                            {record.workHours === 'In progress'
                              ? <span className="flex items-center gap-1.5 text-green-600 text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />In progress</span>
                              : record.workHours
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              record.status === 'Present'  ? 'bg-emerald-100 text-emerald-700' :
                              record.status === 'Absent'   ? 'bg-red-100 text-red-600' :
                                                             'bg-amber-100 text-amber-700'
                            }`}>
                              {record.status === 'Present' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AttendanceContent />
    </ProtectedRoute>
  )
}