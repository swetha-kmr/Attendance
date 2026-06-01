'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Download, Search, Clock, XCircle, CheckCircle,
  Users, BarChart3, FileText, LogOut, Menu, X,
  ChevronDown, Loader2,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
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
import { Timestamp } from 'firebase/firestore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(ts: Timestamp): string {
  try { return ts.toDate().toISOString().split('T')[0] }
  catch { return '' }
}

function formatTime(ts: Timestamp | undefined | null): string {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function calcWorkHours(checkIn?: Timestamp | null, checkOut?: Timestamp | null): string {
  if (!checkIn) return '—'
  if (!checkOut) return 'In progress'
  try {
    const diffMs = checkOut.toDate().getTime() - checkIn.toDate().getTime()
    if (diffMs <= 0) return '—'
    const totalMins = Math.round(diffMs / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return `${h}h ${m}m`
  } catch { return '—' }
}

function exportCSV(rows: FlatRecord[], date: string) {
  const header = ['Name', 'Email', 'Department', 'Check In', 'Check Out', 'Work Hours', 'Status']
  const lines = rows.map(r =>
    [r.name, r.email, r.department, r.checkIn, r.checkOut, r.workHours, r.status].join(',')
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatRecord {
  uid: string
  name: string
  email: string
  department: string
  checkIn: string
  checkOut: string
  workHours: string
  status: 'Present' | 'Absent' | 'On Leave'
}

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design']

// ─── Content ──────────────────────────────────────────────────────────────────

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

  // ── Subscriptions ────────────────────────────────────────────────────────

  useEffect(() => {
    let count = 0
    const done = () => { count++; if (count === 3) setLoading(false) }
    const unsubUsers  = subscribeToUsers(data  => { setUsers(data);      done() })
    const unsubAtt    = subscribeToAttendance(data => { setAttendance(data); done() })
    const unsubLeaves = subscribeToLeaveRequests(data => { setLeaves(data);  done() })
    return () => { unsubUsers(); unsubAtt(); unsubLeaves() }
  }, [])

  // ── Build flat records for the selected date ─────────────────────────────

  const records: FlatRecord[] = useMemo(() => {
    const employees = users.filter(u => u.role === 'employee' && u.status === 'active')

    // UIDs with an approved leave covering selectedDate
    const onLeaveUids = new Set(
      leaves
        .filter(l => {
          if (l.status !== 'approved') return false
          const start = toDateString(l.startDate)
          const end   = toDateString(l.endDate)
          return selectedDate >= start && selectedDate <= end
        })
        .map(l => l.uid)
    )

    // ── KEY FIX: keep only the MOST RECENT record per uid for this date ──
    // subscribeToAttendance returns records ordered by date desc, so iterating
    // them all and keeping the latest prevents an old check-in (no checkOutTime)
    // from overwriting a newer record that already has checkOutTime set.
    const attMap = new Map<string, AttendanceRecord>()
    attendance
      .filter(a => toDateString(a.date) === selectedDate)
      .forEach(a => {
        const existing = attMap.get(a.uid)
        if (!existing) {
          attMap.set(a.uid, a)
        } else {
          // Keep whichever record has the later date timestamp
          try {
            const existingMs = existing.date.toDate().getTime()
            const newMs      = a.date.toDate().getTime()
            if (newMs > existingMs) attMap.set(a.uid, a)
          } catch {
            attMap.set(a.uid, a)
          }
        }
      })

    return employees.map(emp => {
      const dept = emp.department || '—'

      if (onLeaveUids.has(emp.uid)) {
        return {
          uid: emp.uid, name: emp.name, email: emp.email, department: dept,
          checkIn: '—', checkOut: '—', workHours: 'On Leave', status: 'On Leave',
        }
      }

      const att = attMap.get(emp.uid)
      if (att) {
        return {
          uid: emp.uid,
          name: emp.name,
          email: emp.email,
          department: dept,
          checkIn:   formatTime(att.checkInTime),
          checkOut:  formatTime(att.checkOutTime),   // now correctly shows time
          workHours: calcWorkHours(att.checkInTime, att.checkOutTime),
          status: 'Present',
        }
      }

      return {
        uid: emp.uid, name: emp.name, email: emp.email, department: dept,
        checkIn: '—', checkOut: '—', workHours: '—', status: 'Absent',
      }
    })
  }, [users, attendance, leaves, selectedDate])

  // ── Filter ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    records.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchDept   = deptFilter   === 'all' || r.department === deptFilter
      return matchSearch && matchStatus && matchDept
    }),
    [records, searchTerm, statusFilter, deptFilter]
  )

  const total   = records.length
  const present = records.filter(r => r.status === 'Present').length
  const absent  = records.filter(r => r.status === 'Absent').length
  const onLeave = records.filter(r => r.status === 'On Leave').length

  const handleLogout = async () => { await signOut(); router.push('/') }

  const menuItems = [
    { label: 'Dashboard',      icon: BarChart3, href: '/admin/dashboard' },
    { label: 'Employees',      icon: Users,     href: '/admin/employees' },
    { label: 'Attendance',     icon: Clock,     href: '/admin/attendance', active: true },
    { label: 'Leave Requests', icon: FileText,  href: '/admin/leaves' },
      { label: 'Settings', icon: Settings, href: '/admin/settings' },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold">A</div>
              <div>
                <h1 className="font-bold text-slate-900">Attendance</h1>
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map(item => (
              <Link key={item.label} href={item.href}>
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left ${item.active ? 'bg-blue-50 text-blue-700' : ''}`}>
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </Link>
            ))}
          </nav>
          <div className="px-4 py-6 border-t border-slate-200 space-y-4">
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Logged in as</p>
              <p className="font-medium text-slate-900 text-sm">{userProfile?.name}</p>
              <p className="text-xs text-slate-500">{userProfile?.email}</p>
            </div>
            <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
              <p className="text-sm text-slate-500">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <Button onClick={() => exportCSV(filtered, selectedDate)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Download className="w-5 h-5" />Export CSV
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle, label: 'Present',         value: present, color: 'from-green-600 to-green-700', sub: total ? `${Math.round((present / total) * 100)}% attendance` : '0%' },
              { icon: XCircle,     label: 'Absent',          value: absent,  color: 'from-red-600 to-red-700',     sub: total ? `${Math.round((absent  / total) * 100)}% absent`     : '0%' },
              { icon: Clock,       label: 'On Leave',        value: onLeave, color: 'from-amber-600 to-amber-700', sub: total ? `${Math.round((onLeave / total) * 100)}% on leave`    : '0%' },
              { icon: Users,       label: 'Total Employees', value: total,   color: 'from-blue-600 to-blue-700',   sub: `${present} present today` },
            ].map((s, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{s.label}</p>
                    <h3 className="text-3xl font-bold text-slate-900">{s.value}</h3>
                    <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${s.color} text-white`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <Input type="date" value={selectedDate} max={new Date().toISOString().split('T')[0]} onChange={e => setSelectedDate(e.target.value)} className="bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-slate-50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 appearance-none">
                    <option value="all">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                <div className="relative">
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 appearance-none">
                    <option value="all">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of {records.length} employees
            </p>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-slate-600">Loading attendance data...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No records found</p>
                <p className="text-slate-400 text-sm mt-1">Try changing the date or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Employee</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Department</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Check In</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Check Out</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Work Hours</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map(record => (
                      <tr key={record.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                              {record.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{record.name}</p>
                              <p className="text-xs text-slate-500">{record.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-blue-100 text-blue-700 border-0">{record.department}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{record.checkIn}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {record.checkOut === '—'
                              ? <span className="text-slate-400">—</span>
                              : <span className="text-slate-700 font-medium">{record.checkOut}</span>
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {record.workHours === 'In progress'
                            ? <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />In progress</span>
                            : <span className="font-medium text-slate-700">{record.workHours}</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`border-0 ${
                            record.status === 'Present'  ? 'bg-green-100 text-green-700' :
                            record.status === 'Absent'   ? 'bg-red-100 text-red-700'     :
                                                           'bg-amber-100 text-amber-700'
                          }`}>
                            {record.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

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