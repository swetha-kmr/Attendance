'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  getAttendanceByUser, getLeaveRequestsByUser,
  recordAttendance, updateAttendance,
  AttendanceRecord, LeaveRequest,
} from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

// ── MUI Icons ─────────────────────────────────────────────────────────────────
import DashboardRoundedIcon     from '@mui/icons-material/DashboardRounded'
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded'
import EventNoteRoundedIcon     from '@mui/icons-material/EventNoteRounded'
import LogoutRoundedIcon        from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon          from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded'
import LoginRoundedIcon         from '@mui/icons-material/LoginRounded'
import LogoutRoundedIcon2       from '@mui/icons-material/MeetingRoomRounded'
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon         from '@mui/icons-material/ErrorRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import TrendingUpRoundedIcon    from '@mui/icons-material/TrendingUpRounded'
import WorkRoundedIcon          from '@mui/icons-material/WorkRounded'
import BeachAccessRoundedIcon   from '@mui/icons-material/BeachAccessRounded'
import AccessTimeRoundedIcon    from '@mui/icons-material/AccessTimeRounded'
import WbSunnyRoundedIcon       from '@mui/icons-material/WbSunnyRounded'
import NightlightRoundedIcon    from '@mui/icons-material/NightlightRounded'
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded'
import ManageAccountsRoundedIcon   from '@mui/icons-material/ManageAccountsRounded'
import FingerprintRoundedIcon   from '@mui/icons-material/FingerprintRounded'

// ── SVG Illustrations ─────────────────────────────────────────────────────────
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

function CheckInIllustration() {
  return (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mx-auto">
      <rect x="40" y="40" width="120" height="100" rx="6" fill="#ebf8ff" stroke="#bee3f8" strokeWidth="2"/>
      <rect x="55" y="55" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="90" y="55" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="125" y="55" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="55" y="90" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="125" y="90" width="25" height="25" rx="3" fill="#bee3f8"/>
      <rect x="88" y="105" width="24" height="35" rx="3" fill="#3182ce"/>
      <circle cx="160" cy="80" r="18" fill="#48bb78"/>
      <path d="M152 80 L162 80 M157 74 L163 80 L157 86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="30" cy="25" r="12" fill="#f6e05e"/>
      <line x1="30" y1="8" x2="30" y2="2"  stroke="#f6e05e" strokeWidth="2"/>
      <line x1="43" y1="12" x2="47" y2="8" stroke="#f6e05e" strokeWidth="2"/>
      <line x1="47" y1="25" x2="53" y2="25" stroke="#f6e05e" strokeWidth="2"/>
    </svg>
  )
}

function CheckOutIllustration() {
  return (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mx-auto">
      <rect x="40" y="40" width="120" height="100" rx="6" fill="#fff5f5" stroke="#fed7d7" strokeWidth="2"/>
      <rect x="55" y="55" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="90" y="55" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="125" y="55" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="55" y="90" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="125" y="90" width="25" height="25" rx="3" fill="#fed7d7"/>
      <rect x="88" y="105" width="24" height="35" rx="3" fill="#e53e3e"/>
      <circle cx="160" cy="80" r="18" fill="#e53e3e"/>
      <path d="M152 80 L162 80 M157 74 L163 80 L157 86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M22 18 Q30 15 35 22 Q28 30 20 28 Q14 22 22 18Z" fill="#a0aec0"/>
      <circle cx="38" cy="12" r="2" fill="#a0aec0" opacity="0.6"/>
      <circle cx="28" cy="8"  r="1.5" fill="#a0aec0" opacity="0.6"/>
    </svg>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  show, onClose, onConfirm,
  illustration, title, subtitle,
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, gradient, iconBg,
}: {
  icon: React.ReactNode; label: string; value: string
  gradient: string; iconBg: string
}) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} relative overflow-hidden group`}>
      {/* decorative circle */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
function EmployeeDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [attendance, setAttendance]   = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves]           = useState<LeaveRequest[]>([])
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError]       = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [showLogoutConfirm,   setShowLogoutConfirm]   = useState(false)
  const [showCheckInConfirm,  setShowCheckInConfirm]  = useState(false)
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  // ── Load data ───────────────────────────────────────────────────────────────
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
    } catch (err) { console.error('Error loading data:', err) }
  }

  useEffect(() => { loadData() }, [userProfile])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCheckInConfirmed = async () => {
    if (!userProfile) return
    setShowCheckInConfirm(false); setActionLoading(true); setError('')
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
    } catch (err: any) { setError(err.message || 'Failed to check in') }
    finally { setActionLoading(false); setTimeout(() => setSuccessMsg(''), 3000) }
  }

  const handleCheckOutConfirmed = async () => {
    if (!userProfile || !todayRecord?.id) return
    setShowCheckOutConfirm(false); setActionLoading(true); setError('')
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
    } catch (err: any) { setError(err.message || 'Failed to check out') }
    finally { setActionLoading(false); setTimeout(() => setSuccessMsg(''), 3000) }
  }

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error('Logout error:', err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
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
    { type: 'Casual Leave', used: usedLeaves.filter(l => l.leaveType === 'casual').length,   total: leaveBalance.casual,   color: 'from-blue-500 to-blue-600',   bg: 'bg-blue-100',   text: 'text-blue-700' },
    { type: 'Sick Leave',   used: usedLeaves.filter(l => l.leaveType === 'sick').length,     total: leaveBalance.sick,     color: 'from-rose-500 to-rose-600',   bg: 'bg-rose-100',   text: 'text-rose-700' },
    { type: 'Vacation',     used: usedLeaves.filter(l => l.leaveType === 'vacation').length, total: leaveBalance.vacation, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-100', text: 'text-violet-700' },
    { type: 'Personal',     used: usedLeaves.filter(l => l.leaveType === 'personal').length, total: leaveBalance.personal, color: 'from-amber-500 to-amber-600',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  ]

  const attendancePercentage = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0

  const totalLeaveBalance =
    leaveBalance.casual + leaveBalance.sick + leaveBalance.vacation + leaveBalance.personal - usedLeaves.length

  // greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  // today status
  const todayStatusLabel = () => {
    if (!hasCheckedIn)  return { text: 'Not checked in yet', color: 'text-slate-400', dot: 'bg-slate-300' }
    if (!hasCheckedOut) return { text: `Working · checked in at ${formatTime(todayRecord?.checkInTime)}`, color: 'text-emerald-600', dot: 'bg-emerald-500' }
    return { text: `Done · ${formatWorkHours(todayRecord?.workHours)} worked today`, color: 'text-blue-600', dot: 'bg-blue-500' }
  }
  const status = todayStatusLabel()

  // sidebar nav items
  const navItems = [
    { href: '/employee/dashboard', icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Dashboard', active: true },
    { href: '/employee/profile',   icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,    label: 'My Profile', active: false },
    { href: '/employee/leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />, label: 'Leave Requests', active: false },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Modals */}
      <ConfirmModal
        show={showCheckInConfirm}   onClose={() => setShowCheckInConfirm(false)}
        onConfirm={handleCheckInConfirmed}  illustration={<CheckInIllustration />}
        title="Good Morning! 🌅"    subtitle="Ready to start your day?"
        confirmLabel="Yes, Check In" confirmClass="bg-green-600 hover:bg-green-700"
      />
      <ConfirmModal
        show={showCheckOutConfirm}   onClose={() => setShowCheckOutConfirm(false)}
        onConfirm={handleCheckOutConfirmed}  illustration={<CheckOutIllustration />}
        title="Leaving Already? 🌙"  subtitle="Are you sure you want to check out?"
        confirmLabel="Yes, Check Out" confirmClass="bg-rose-500 hover:bg-rose-600"
      />
      <ConfirmModal
        show={showLogoutConfirm}    onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed}   illustration={<SadPersonIllustration />}
        title="Comeback Soon!"      subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout"  confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100
        flex flex-col shadow-lg transition-transform duration-300
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
              <FingerprintRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm leading-tight">AttendTrack</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Employee Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Menu</p>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <button className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left
                ${item.active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
              `}>
                <span className={item.active ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
                {item.active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
              </button>
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-3">
          <div className="px-3 py-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userProfile?.name?.charAt(0) ?? 'E'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{userProfile?.name ?? 'Employee'}</p>
              <p className="text-[11px] text-slate-400 truncate">{userProfile?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Dashboard</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* Greeting badge */}
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <WbSunnyRoundedIcon sx={{ fontSize: 16, color: '#d97706' }} />
            <span className="text-xs font-semibold text-amber-700">{greeting}, {userProfile?.name?.split(' ')[0] ?? 'there'}!</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Toast messages */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <ErrorRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />
              {successMsg}
            </div>
          )}

          {/* ── Today's Attendance Hero Card ── */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
            {/* decorative circles */}
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -right-2 top-20 w-24 h-24 rounded-full bg-white/5" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AccessTimeRoundedIcon sx={{ fontSize: 16 }} className="opacity-70" />
                  <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Today's Attendance</span>
                </div>
                <h2 className="text-2xl font-extrabold mb-1">
                  {!hasCheckedIn ? 'Not Checked In' : !hasCheckedOut ? 'Currently Working 💼' : 'Day Complete ✅'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status.dot} ring-2 ring-white/30`} />
                  <p className="text-blue-100 text-sm">{status.text}</p>
                </div>
                {hasCheckedIn && (
                  <div className="flex gap-5 mt-3 text-sm text-blue-100">
                    <span className="flex items-center gap-1.5">
                      <LoginRoundedIcon sx={{ fontSize: 15 }} className="text-green-300" />
                      In: <strong className="text-white">{formatTime(todayRecord?.checkInTime)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <LogoutRoundedIcon sx={{ fontSize: 15 }} className="text-rose-300" />
                      Out: <strong className="text-white">{formatTime(todayRecord?.checkOutTime)}</strong>
                    </span>
                    {todayRecord?.workHours && (
                      <span className="flex items-center gap-1.5">
                        <AccessTimeRoundedIcon sx={{ fontSize: 15 }} className="text-amber-300" />
                        <strong className="text-white">{formatWorkHours(todayRecord.workHours)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => setShowCheckInConfirm(true)}
                  disabled={hasCheckedIn || actionLoading}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200
                    ${hasCheckedIn
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'}
                  `}
                >
                  <LoginRoundedIcon sx={{ fontSize: 18 }} />
                  {hasCheckedIn ? 'Checked In ✓' : 'Check In'}
                </button>

                <button
                  onClick={() => setShowCheckOutConfirm(true)}
                  disabled={!hasCheckedIn || hasCheckedOut || actionLoading}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200
                    ${!hasCheckedIn || hasCheckedOut
                      ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'}
                  `}
                >
                  <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                  {hasCheckedOut ? 'Checked Out ✓' : 'Check Out'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<CalendarMonthRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />}
              label="Working Days"
              value={attendance.length.toString()}
              gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"
              iconBg="bg-blue-200"
            />
            <StatCard
              icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />}
              label="Attendance %"
              value={`${attendancePercentage}%`}
              gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900"
              iconBg="bg-emerald-200"
            />
            <StatCard
              icon={<BeachAccessRoundedIcon sx={{ fontSize: 20, color: '#7c3aed' }} />}
              label="Leave Balance"
              value={`${totalLeaveBalance}d`}
              gradient="bg-gradient-to-br from-violet-50 to-violet-100 text-violet-900"
              iconBg="bg-violet-200"
            />
            <StatCard
              icon={<WorkRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />}
              label="Status"
              value={userProfile?.status === 'active' ? 'Active' : 'Inactive'}
              gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900"
              iconBg="bg-amber-200"
            />
          </div>

          {/* ── Leave Balance + Recent Attendance ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Leave Balance */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-extrabold text-slate-900">Leave Balance</h2>
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                  {new Date().getFullYear()}
                </span>
              </div>
              <div className="space-y-4">
                {leaveStats.map((leave, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-700">{leave.type}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${leave.bg} ${leave.text}`}>
                        {leave.total - leave.used} left
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r ${leave.color} transition-all duration-700`}
                        style={{ width: `${Math.min((leave.used / leave.total) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{leave.used} used of {leave.total} days</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Attendance */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-extrabold text-slate-900">Recent Attendance</h2>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  Last {Math.min(attendance.length, 7)} records
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {attendance.slice(0, 7).length > 0 ? (
                  attendance.slice(0, 7).map((record, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0
                          ${record.status === 'present' ? 'bg-green-100 text-green-700' :
                            record.status === 'absent'  ? 'bg-red-100 text-red-700'    : 'bg-amber-100 text-amber-700'}`}>
                          {record.date.toDate().getDate()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {record.date.toDate().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          {record.checkInTime && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatTime(record.checkInTime)} → {formatTime(record.checkOutTime)}
                              {record.workHours ? ` · ${formatWorkHours(record.workHours)}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold
                        ${record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'absent'  ? 'bg-red-100 text-red-700'    : 'bg-amber-100 text-amber-700'}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CalendarMonthRoundedIcon sx={{ fontSize: 36, color: '#cbd5e1' }} />
                    <p className="text-slate-400 text-sm mt-2">No attendance records yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/employee/leaves">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0">
                  <AddCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />
                  Request Leave
                </button>
              </Link>
              <Link href="/employee/profile">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <ManageAccountsRoundedIcon sx={{ fontSize: 18 }} />
                  Update Profile
                </button>
              </Link>
            </div>
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