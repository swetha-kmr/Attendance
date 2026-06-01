'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  getAttendanceByUser, getLeaveRequestsByUser,
  recordAttendance, updateAttendance,
  AttendanceRecord, LeaveRequest,
} from '@/lib/firestore-service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  CheckCircle, Clock, LogOut, Menu, X,
  Calendar, Briefcase, TrendingUp, AlertCircle, LogIn, LogOut as LogOutIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

// ── Sad person SVG illustration (like your screenshot) ────────────────────────
function SadPersonIllustration() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" className="w-40 h-36 mx-auto">
      {/* Bench */}
      <rect x="20" y="120" width="160" height="10" rx="5" fill="#e53e3e" />
      <rect x="20" y="108" width="160" height="10" rx="5" fill="#fc8181" />
      {/* Bench legs */}
      <rect x="28" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="164" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="70" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="122" y="130" width="8" height="30" rx="3" fill="#c53030" />

      {/* Person body */}
      <rect x="82" y="80" width="36" height="40" rx="8" fill="#bee3f8" />
      {/* Tie */}
      <polygon points="100,85 97,100 100,110 103,100" fill="#2d3748" />
      {/* Legs */}
      <rect x="83" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      <rect x="103" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      {/* Shoes */}
      <ellipse cx="90" cy="140" rx="9" ry="5" fill="#1a202c" />
      <ellipse cx="110" cy="140" rx="9" ry="5" fill="#1a202c" />
      {/* Arms - drooping down (sad pose) */}
      <path d="M82 90 Q68 100 66 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <path d="M118 90 Q132 100 134 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none"/>

      {/* Head */}
      <circle cx="100" cy="65" r="22" fill="#fbd38d" />
      {/* Hair */}
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

// ── Check In illustration ─────────────────────────────────────────────────────
function CheckInIllustration() {
  return (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mx-auto">
      {/* Building */}
      <rect x="40" y="40" width="120" height="100" rx="6" fill="#ebf8ff" stroke="#bee3f8" strokeWidth="2"/>
      <rect x="55" y="55" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="90" y="55" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="125" y="55" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="55" y="90" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="125" y="90" width="25" height="25" rx="3" fill="#bee3f8"/>
      {/* Door */}
      <rect x="88" y="105" width="24" height="35" rx="3" fill="#3182ce"/>
      {/* Arrow going IN */}
      <circle cx="160" cy="80" r="18" fill="#48bb78"/>
      <path d="M152 80 L162 80 M157 74 L163 80 L157 86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Sun */}
      <circle cx="30" cy="25" r="12" fill="#f6e05e"/>
      <line x1="30" y1="8" x2="30" y2="2"  stroke="#f6e05e" strokeWidth="2"/>
      <line x1="43" y1="12" x2="47" y2="8" stroke="#f6e05e" strokeWidth="2"/>
      <line x1="47" y1="25" x2="53" y2="25" stroke="#f6e05e" strokeWidth="2"/>
    </svg>
  )
}

// ── Check Out illustration ────────────────────────────────────────────────────
function CheckOutIllustration() {
  return (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mx-auto">
      {/* Building */}
      <rect x="40" y="40" width="120" height="100" rx="6" fill="#fff5f5" stroke="#fed7d7" strokeWidth="2"/>
      <rect x="55" y="55" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="90" y="55" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="125" y="55" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="55" y="90" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="125" y="90" width="25" height="25" rx="3" fill="#fed7d7"/>
      {/* Door */}
      <rect x="88" y="105" width="24" height="35" rx="3" fill="#e53e3e"/>
      {/* Arrow going OUT */}
      <circle cx="160" cy="80" r="18" fill="#e53e3e"/>
      <path d="M152 80 L162 80 M157 74 L163 80 L157 86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Moon (end of day) */}
      <path d="M22 18 Q30 15 35 22 Q28 30 20 28 Q14 22 22 18Z" fill="#a0aec0"/>
      <circle cx="38" cy="12" r="2" fill="#a0aec0" opacity="0.6"/>
      <circle cx="28" cy="8"  r="1.5" fill="#a0aec0" opacity="0.6"/>
    </svg>
  )
}

function EmployeeDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ── Modal states ──────────────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showCheckInConfirm, setShowCheckInConfirm] = useState(false)
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!userProfile) return
    try {
      const [attendanceData, leavesData] = await Promise.all([
        getAttendanceByUser(userProfile.uid),
        getLeaveRequestsByUser(userProfile.uid),
      ])
      setAttendance(attendanceData)
      setLeaves(leavesData)
      const todayStr = new Date().toDateString()
      const found = attendanceData.find(a => a.date.toDate().toDateString() === todayStr) || null
      setTodayRecord(found)
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  useEffect(() => { loadData() }, [userProfile])

  // ── Check In (after confirm) ──────────────────────────────────────────────

  const handleCheckInConfirmed = async () => {
    if (!userProfile) return
    setShowCheckInConfirm(false)
    setActionLoading(true)
    setError('')
    try {
      const record = await recordAttendance({
        uid: userProfile.uid,
        date: Timestamp.now(),
        checkInTime: Timestamp.now(),
        status: 'present',
      })
      setTodayRecord(record)
      setSuccessMsg('Checked in successfully! Have a great day 🎉')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to check in')
    } finally {
      setActionLoading(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // ── Check Out (after confirm) ─────────────────────────────────────────────

  const handleCheckOutConfirmed = async () => {
    if (!userProfile || !todayRecord?.id) return
    setShowCheckOutConfirm(false)
    setActionLoading(true)
    setError('')
    try {
      const checkOutTime = Timestamp.now()
      let workHours = 0
      if (todayRecord.checkInTime) {
        const ms = checkOutTime.toDate().getTime() - todayRecord.checkInTime.toDate().getTime()
        workHours = Math.round((ms / 3600000) * 100) / 100
      }
      await updateAttendance(todayRecord.id, { checkOutTime, workHours })
      setSuccessMsg('Checked out! See you tomorrow 👋')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to check out')
    } finally {
      setActionLoading(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // ── Logout (after confirm) ────────────────────────────────────────────────

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

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasCheckedIn  = !!todayRecord?.checkInTime
  const hasCheckedOut = !!todayRecord?.checkOutTime

  const formatTime = (ts?: Timestamp | null) =>
    ts ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  const formatWorkHours = (wh?: number) => {
    if (!wh) return '—'
    const h = Math.floor(wh)
    const m = Math.round((wh - h) * 60)
    return `${h}h ${m}m`
  }

  const usedLeaves = leaves.filter(l => l.status === 'approved')
  const leaveBalance = { casual: 12, sick: 5, vacation: 15, personal: 3 }
  const leaveStats = [
    { type: 'Casual Leave', used: usedLeaves.filter(l => l.leaveType === 'casual').length,   total: leaveBalance.casual },
    { type: 'Sick Leave',   used: usedLeaves.filter(l => l.leaveType === 'sick').length,     total: leaveBalance.sick },
    { type: 'Vacation',     used: usedLeaves.filter(l => l.leaveType === 'vacation').length, total: leaveBalance.vacation },
  ]

  const attendancePercentage = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0

  const totalLeaveBalance =
    leaveBalance.casual + leaveBalance.sick + leaveBalance.vacation + leaveBalance.personal - usedLeaves.length

  const todayStatusLabel = () => {
    if (!hasCheckedIn)  return { text: 'Not checked in yet', color: 'text-slate-500' }
    if (!hasCheckedOut) return { text: `Checked in at ${formatTime(todayRecord?.checkInTime)} — working`, color: 'text-green-600' }
    return { text: `Done for today · ${formatWorkHours(todayRecord?.workHours)} worked`, color: 'text-blue-600' }
  }
  const status = todayStatusLabel()

  // ── Reusable confirm modal ────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Check In Confirm Modal ── */}
      <ConfirmModal
        show={showCheckInConfirm}
        onClose={() => setShowCheckInConfirm(false)}
        onConfirm={handleCheckInConfirmed}
        illustration={<CheckInIllustration />}
        title="Good Morning! 🌅"
        subtitle="Are you sure you want to check in now?"
        confirmLabel="Yes, Check In"
        confirmClass="bg-green-600 hover:bg-green-700"
      />

      {/* ── Check Out Confirm Modal ── */}
      <ConfirmModal
        show={showCheckOutConfirm}
        onClose={() => setShowCheckOutConfirm(false)}
        onConfirm={handleCheckOutConfirmed}
        illustration={<CheckOutIllustration />}
        title="Leaving Already? 🌙"
        subtitle="Are you sure you want to check out now?"
        confirmLabel="Yes, Check Out"
        confirmClass="bg-red-500 hover:bg-red-600"
      />

      {/* ── Logout Confirm Modal ── */}
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold">E</div>
              <div>
                <h1 className="font-bold text-slate-900">Attendance</h1>
                <p className="text-xs text-slate-500">Employee Portal</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <Link href="/employee/dashboard">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 text-left">
                <Clock className="w-5 h-5" /><span className="font-medium">Dashboard</span>
              </button>
            </Link>
            <Link href="/employee/profile">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left">
                <span className="w-5 h-5">👤</span><span className="font-medium">Profile</span>
              </button>
            </Link>
            <Link href="/employee/leaves">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left">
                <span className="w-5 h-5">📋</span><span className="font-medium">Leaves</span>
              </button>
            </Link>
          </nav>
          <div className="px-4 py-6 border-t border-slate-200 space-y-4">
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Logged in as</p>
              <p className="font-medium text-slate-900 text-sm">{userProfile?.name}</p>
              <p className="text-xs text-slate-500">{userProfile?.email}</p>
            </div>
            <Button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Employee Dashboard</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
          )}

          {/* Check In / Check Out Card */}
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Today's Attendance</h2>
                <p className={`text-sm font-medium ${status.color}`}>{status.text}</p>
                {hasCheckedIn && (
                  <div className="flex gap-6 mt-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <LogIn className="w-4 h-4 text-green-500" />
                      Check In: <strong>{formatTime(todayRecord?.checkInTime)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <LogOutIcon className="w-4 h-4 text-red-400" />
                      Check Out: <strong>{formatTime(todayRecord?.checkOutTime)}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {/* Check In → opens confirm modal */}
                <Button
                  onClick={() => setShowCheckInConfirm(true)}
                  disabled={hasCheckedIn || actionLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-5 text-base font-semibold shadow"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {hasCheckedIn ? 'Checked In ✓' : 'Check In'}
                </Button>
                {/* Check Out → opens confirm modal */}
                <Button
                  onClick={() => setShowCheckOutConfirm(true)}
                  disabled={!hasCheckedIn || hasCheckedOut || actionLoading}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-5 text-base font-semibold shadow"
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  {hasCheckedOut ? 'Checked Out ✓' : 'Check Out'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Calendar,    label: 'Working Days',  value: attendance.length.toString() },
              { icon: CheckCircle, label: 'Attendance %',  value: `${attendancePercentage}%` },
              { icon: TrendingUp,  label: 'Leave Balance', value: `${totalLeaveBalance} days` },
              { icon: Briefcase,   label: 'Status',        value: userProfile?.status === 'active' ? 'Active' : 'Inactive' },
            ].map((s, i) => (
              <Card key={i} className="p-6 shadow-md">
                <p className="text-slate-600 text-sm font-medium">{s.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Leave Balance + Recent Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 shadow-md">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Leave Balance</h2>
              <div className="space-y-4">
                {leaveStats.map((leave, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-700">{leave.type}</p>
                      <p className="text-sm text-slate-600">{leave.used}/{leave.total}</p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((leave.used / leave.total) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 shadow-md">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Attendance</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {attendance.slice(0, 7).length > 0 ? (
                  attendance.slice(0, 7).map((record, i) => (
                    <div key={i} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm text-slate-700">{record.date.toDate().toLocaleDateString()}</p>
                        {record.checkInTime && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatTime(record.checkInTime)} → {formatTime(record.checkOutTime)}
                            {record.workHours ? ` · ${formatWorkHours(record.workHours)}` : ''}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'present' ? 'bg-green-100 text-green-700' :
                        record.status === 'absent'  ? 'bg-red-100 text-red-700'    :
                                                      'bg-amber-100 text-amber-700'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No attendance records yet</p>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/employee/leaves">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Request Leave</Button>
            </Link>
            <Link href="/employee/profile">
              <Button variant="outline">Update Profile</Button>
            </Link>
          </div>

        </main>
      </div>
    </div>
  )
}

export default function EmployeeDashboardPage() {
  return (
    <ProtectedRoute requiredRole="employee">
      <EmployeeDashboardContent />
    </ProtectedRoute>
  )
}