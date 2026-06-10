'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  getAttendanceByUser,
  getLeaveRequestsByUser,
  recordAttendance,
  updateAttendance,
  AttendanceRecord,
  LeaveRequest,
} from '@/lib/firestore-service'
import { useRouter, usePathname } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

// ── Firebase (for holidays + daily status check + missing checkout check) ─────
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── MUI Icons ─────────────────────────────────────────────────────────────────
import DashboardRoundedIcon       from '@mui/icons-material/DashboardRounded'
import PersonRoundedIcon          from '@mui/icons-material/PersonRounded'
import EventNoteRoundedIcon       from '@mui/icons-material/EventNoteRounded'
import LogoutRoundedIcon          from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon            from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon           from '@mui/icons-material/CloseRounded'
import LoginRoundedIcon           from '@mui/icons-material/LoginRounded'
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon           from '@mui/icons-material/ErrorRounded'
import CalendarMonthRoundedIcon   from '@mui/icons-material/CalendarMonthRounded'
import WorkRoundedIcon            from '@mui/icons-material/WorkRounded'
import BeachAccessRoundedIcon     from '@mui/icons-material/BeachAccessRounded'
import AssignmentRoundedIcon      from '@mui/icons-material/AssignmentRounded'
import AccessTimeRoundedIcon      from '@mui/icons-material/AccessTimeRounded'
import WbSunnyRoundedIcon         from '@mui/icons-material/WbSunnyRounded'
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded'
import ManageAccountsRoundedIcon  from '@mui/icons-material/ManageAccountsRounded'
import FingerprintRoundedIcon     from '@mui/icons-material/FingerprintRounded'
import WeekendRoundedIcon         from '@mui/icons-material/WeekendRounded'
import CelebrationRoundedIcon     from '@mui/icons-material/CelebrationRounded'
import NightsStayRoundedIcon      from '@mui/icons-material/NightsStayRounded'
import WbTwilightRoundedIcon      from '@mui/icons-material/WbTwilightRounded'
import WarningAmberRoundedIcon    from '@mui/icons-material/WarningAmberRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'

// ── Holiday type ───────────────────────────────────────────────────────────────
export type HolidayType = 'public' | 'festival' | 'national' | 'weekly_off'
export interface Holiday {
  id?: string
  name: string
  date: Timestamp
  type: HolidayType
}

async function fetchHolidaysForYear(year: number): Promise<Holiday[]> {
  const start = Timestamp.fromDate(new Date(year, 0, 1))
  const end   = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59))
  const q = query(
    collection(db, 'holidays'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday))
}

async function checkDailyStatusSubmitted(userId: string): Promise<boolean> {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const q = query(
    collection(db, 'dailyStatus'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// ── NEW: Check if employee has a previous day check-in with no checkout ────────
// Returns the incomplete record if found, null if everything is clean.
// We query attendance where:
//   userId == uid  AND  checkOutTime == null  AND  date < today midnight
// NOTE: Firestore requires a composite index for this query.
// If you see a "requires an index" error in the console, click the link
// in the error message to create it automatically in Firebase Console.
async function getPreviousMissingCheckout(uid: string): Promise<{
  id: string
  date: Timestamp
  checkInTime: Timestamp
} | null> {
  const now          = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

  const q = query(
    collection(db, 'attendance'),
    where('userId', '==', uid),
    where('checkOutTime', '==', null),
    where('date', '<', Timestamp.fromDate(todayMidnight)),
  )

  try {
    const snap = await getDocs(q)
    if (snap.empty) return null

    // Pick the most recent incomplete record
    const docs = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())

    return docs[0]
  } catch (err) {
    // If index doesn't exist yet, fail silently so app still works
    console.warn('getPreviousMissingCheckout query failed (index may be missing):', err)
    return null
  }
}

const HOLIDAY_TYPE_CONFIG: Record<
  HolidayType,
  { badge: string; text: string; dot: string; label: string }
> = {
  public:     { badge: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Public Holiday'   },
  festival:   { badge: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Festival Holiday' },
  national:   { badge: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'National Holiday' },
  weekly_off: { badge: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400',   label: 'Weekly Off'       },
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good Morning',   icon: <WbSunnyRoundedIcon    sx={{ fontSize: 16, color: '#d97706' }} /> }
  if (hour < 17) return { text: 'Good Afternoon', icon: <WbTwilightRoundedIcon sx={{ fontSize: 16, color: '#ea580c' }} /> }
  return               { text: 'Good Evening',    icon: <NightsStayRoundedIcon sx={{ fontSize: 16, color: '#7c3aed' }} /> }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}
function isSunday(date: Date) { return date.getDay() === 0 }

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
      <path d="M82 90 Q68 100 66 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M118 90 Q132 100 134 115" stroke="#bee3f8" strokeWidth="10" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="65" r="22" fill="#fbd38d" />
      <path d="M78 60 Q80 42 100 42 Q120 42 122 60" fill="#2d3748" />
      <path d="M90 62 Q93 58 96 62" stroke="#2d3748" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M104 62 Q107 58 110 62" stroke="#2d3748" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M91 72 Q100 68 109 72" stroke="#c53030" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="90" cy="69" rx="2" ry="3" fill="#90cdf4" opacity="0.8" />
    </svg>
  )
}

function CheckInIllustration() {
  return (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mx-auto">
      <rect x="40" y="40" width="120" height="100" rx="6" fill="#ebf8ff" stroke="#bee3f8" strokeWidth="2" />
      <rect x="55" y="55" width="25" height="25" rx="3" fill="#bee3f8" />
      <rect x="90" y="55" width="25" height="25" rx="3" fill="#bee3f8" />
      <rect x="125" y="55" width="25" height="25" rx="3" fill="#bee3f8" />
      <rect x="55" y="90" width="25" height="25" rx="3" fill="#bee3f8" />
      <rect x="125" y="90" width="25" height="25" rx="3" fill="#bee3f8" />
      <rect x="88" y="105" width="24" height="35" rx="3" fill="#3182ce" />
      <circle cx="160" cy="80" r="18" fill="#48bb78" />
      <path d="M152 80 L162 80 M157 74 L163 80 L157 86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="30" cy="25" r="12" fill="#f6e05e" />
    </svg>
  )
}

function CheckOutIllustration() {
  return (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mx-auto">
      <rect x="40" y="40" width="120" height="100" rx="6" fill="#fff5f5" stroke="#fed7d7" strokeWidth="2" />
      <rect x="55" y="55" width="25" height="25" rx="3" fill="#fed7d7" />
      <rect x="90" y="55" width="25" height="25" rx="3" fill="#fed7d7" />
      <rect x="125" y="55" width="25" height="25" rx="3" fill="#fed7d7" />
      <rect x="55" y="90" width="25" height="25" rx="3" fill="#fed7d7" />
      <rect x="125" y="90" width="25" height="25" rx="3" fill="#fed7d7" />
      <rect x="88" y="105" width="24" height="35" rx="3" fill="#e53e3e" />
      <circle cx="160" cy="80" r="18" fill="#e53e3e" />
      <path d="M152 80 L162 80 M157 74 L163 80 L157 86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ show, onClose, onConfirm, illustration, title, subtitle, confirmLabel, confirmClass, loading = false }: {
  show: boolean; onClose: () => void; onConfirm: () => void; illustration: React.ReactNode
  title: string; subtitle: string; confirmLabel: string; confirmClass: string; loading?: boolean
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center animate-in fade-in zoom-in duration-200">
        {illustration}
        <h2 className="text-xl font-bold text-slate-900 mt-2 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 h-11 rounded-xl text-white font-semibold transition-colors ${confirmClass}`}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Daily Status Block Modal ──────────────────────────────────────────────────
function DailyStatusBlockModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const router = useRouter()
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AssignmentRoundedIcon sx={{ fontSize: 32, color: '#d97706' }} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Daily Status Required</h2>
        <p className="text-sm text-slate-500 mb-1">
          You must submit your <span className="font-semibold text-slate-700">Daily Status Update</span> for today before checking out.
        </p>
        <p className="text-xs text-slate-400 mb-5">This helps your team stay aligned on your progress for the day.</p>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 text-left space-y-2.5">
          {['Go to Daily Status page', 'Fill in your update for today', 'Submit — then come back to check out'].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="text-xs font-medium text-amber-800">{step}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm">
            Cancel
          </button>
          <button onClick={() => router.push('/employee/daily-status')}
            className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2">
            <AssignmentRoundedIcon sx={{ fontSize: 16 }} />Go Now
          </button>
        </div>
      </div>
    </div>
  )
}

// ── NEW: Missing Checkout Block Modal ─────────────────────────────────────────
// Shows when the employee tries to check in but has an unresolved previous
// day checkout. Check-in is fully blocked until admin resolves it.
function MissingCheckoutModal({
  show,
  onClose,
  missingRecord,
}: {
  show: boolean
  onClose: () => void
  missingRecord: { date: Timestamp; checkInTime: Timestamp } | null
}) {
  if (!show || !missingRecord) return null

  const missedDate = missingRecord.date.toDate().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const checkedInAt = missingRecord.checkInTime.toDate().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <WarningAmberRoundedIcon sx={{ fontSize: 32, color: '#e11d48' }} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 text-center mb-1">
          Previous Checkout Missing
        </h2>
        <p className="text-sm text-slate-500 text-center mb-5">
          You cannot check in until your previous day's checkout is resolved.
        </p>

        {/* Detail card */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-5 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 text-[10px] font-bold flex items-center justify-center shrink-0">!</span>
            <div>
              <p className="text-xs font-bold text-rose-700">Missed Checkout Date</p>
              <p className="text-xs text-rose-600 mt-0.5">{missedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AccessTimeRoundedIcon sx={{ fontSize: 16, color: '#fb7185', flexShrink: 0 }} />
            <div>
              <p className="text-xs font-bold text-rose-700">Last Check-In Time</p>
              <p className="text-xs text-rose-600 mt-0.5">{checkedInAt}</p>
            </div>
          </div>
        </div>

        {/* Admin contact note */}
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-5">
          <AdminPanelSettingsRoundedIcon sx={{ fontSize: 18, color: '#64748b', flexShrink: 0, mt: '1px' }} />
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Please contact your <span className="font-bold text-slate-800">administrator</span> to mark your checkout for the missed day. Once resolved, you can check in normally.
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
        >
          Okay, Got It
        </button>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient, iconBg }: {
  icon: React.ReactNode; label: string; value: string; gradient: string; iconBg: string
}) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} relative overflow-hidden group`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
function EmployeeDashboardContent() {
  const pathname = usePathname()

  const [sidebarOpen,              setSidebarOpen]              = useState(true)
  const [attendance,               setAttendance]               = useState<AttendanceRecord[]>([])
  const [leaves,                   setLeaves]                   = useState<LeaveRequest[]>([])
  const [holidays,                 setHolidays]                 = useState<Holiday[]>([])
  const [todayRecord,              setTodayRecord]              = useState<AttendanceRecord | null>(null)
  const [actionLoading,            setActionLoading]            = useState(false)
  const [error,                    setError]                    = useState('')
  const [successMsg,               setSuccessMsg]               = useState('')
  const [showLogoutConfirm,        setShowLogoutConfirm]        = useState(false)
  const [showCheckInConfirm,       setShowCheckInConfirm]       = useState(false)
  const [showCheckOutConfirm,      setShowCheckOutConfirm]      = useState(false)
  const [showDailyStatusBlock,     setShowDailyStatusBlock]     = useState(false)
  const [logoutLoading,            setLogoutLoading]            = useState(false)
  const [hasDailyStatus,           setHasDailyStatus]           = useState(false)

  // ── NEW: missing checkout state ───────────────────────────────────────────
  const [missingCheckout,          setMissingCheckout]          = useState<{ id: string; date: Timestamp; checkInTime: Timestamp } | null>(null)
  const [showMissingCheckoutModal, setShowMissingCheckoutModal] = useState(false)
  const [checkingMissed,           setCheckingMissed]           = useState(false)

  const [greeting] = useState(() => getGreeting())
  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  // HR employees are exempt from the daily status requirement
  const isHREmployee =
    userProfile?.department === 'HR' || userProfile?.showDailyStatus === false

  const loadData = async () => {
    if (!userProfile) return
    try {
      const year = new Date().getFullYear()
      const [attendanceData, leavesData, holidaysData] = await Promise.all([
        getAttendanceByUser(userProfile.uid),
        getLeaveRequestsByUser(userProfile.uid),
        fetchHolidaysForYear(year),
      ])
      setAttendance(attendanceData)
      setLeaves(leavesData)
      setHolidays(holidaysData)

      const todayStr = new Date().toDateString()
      const found    = attendanceData.find(a => a.date.toDate().toDateString() === todayStr) || null
      setTodayRecord(found)

      if (!isHREmployee) {
        const submitted = await checkDailyStatusSubmitted(userProfile.uid)
        setHasDailyStatus(submitted)
      } else {
        setHasDailyStatus(true)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  // ── NEW: Check for missing previous checkout on mount ─────────────────────
  useEffect(() => {
    if (!userProfile?.uid) return
    const check = async () => {
      setCheckingMissed(true)
      try {
        const result = await getPreviousMissingCheckout(userProfile.uid)
        setMissingCheckout(result)
      } catch (err) {
        console.error('Missing checkout check error:', err)
      } finally {
        setCheckingMissed(false)
      }
    }
    check()
  }, [userProfile?.uid])

  useEffect(() => { loadData() }, [userProfile])

  // ── Check-in: blocked if missing previous checkout ────────────────────────
  const handleCheckInClick = () => {
    if (hasCheckedIn || actionLoading) return

    // If there's an unresolved previous checkout, block and show modal
    if (missingCheckout) {
      setShowMissingCheckoutModal(true)
      return
    }

    setShowCheckInConfirm(true)
  }

  const handleCheckInConfirmed = async () => {
    if (!userProfile) return
    setShowCheckInConfirm(false)
    setActionLoading(true)
    setError('')
    try {
      // IMPORTANT: Store checkOutTime as null explicitly so the
      // getPreviousMissingCheckout query can find this record tomorrow
      // if the employee forgets to check out.
      const record = await recordAttendance({
        uid:          userProfile.uid,
        date:         Timestamp.now(),
        checkInTime:  Timestamp.now(),
        checkOutTime: null,   // ← must be explicit null (not omitted)
        status:       'present',
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
      // Clear the missing checkout state since today is now resolved
      setMissingCheckout(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to check out')
    } finally {
      setActionLoading(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const hasCheckedIn  = !!todayRecord?.checkInTime
  const hasCheckedOut = !!todayRecord?.checkOutTime

  const handleCheckOutClick = () => {
    if (!hasCheckedIn || hasCheckedOut || actionLoading) return
    if (!isHREmployee && !hasDailyStatus) {
      setShowDailyStatusBlock(true)
      return
    }
    setShowCheckOutConfirm(true)
  }

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try {
      await signOut()
      router.push('/')
    } catch {
      setLogoutLoading(false)
      setShowLogoutConfirm(false)
    }
  }

  const formatTime = (ts?: Timestamp | null) =>
    ts ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  const formatWorkHours = (wh?: number) => {
    if (!wh) return '—'
    const h = Math.floor(wh)
    const m = Math.round((wh - h) * 60)
    return `${h}h ${m}m`
  }

  const usedLeaves   = leaves.filter(l => l.status === 'approved')
  const leaveBalance = { casual: 12, sick: 5, vacation: 15, personal: 3 }

  const leaveStats = [
    { type: 'Casual Leave', used: usedLeaves.filter(l => l.leaveType === 'casual').length,    total: leaveBalance.casual,   color: 'from-blue-500 to-blue-600',    bg: 'bg-blue-100',   text: 'text-blue-700'   },
    { type: 'Sick Leave',   used: usedLeaves.filter(l => l.leaveType === 'sick').length,      total: leaveBalance.sick,     color: 'from-rose-500 to-rose-600',    bg: 'bg-rose-100',   text: 'text-rose-700'   },
    { type: 'Vacation',     used: usedLeaves.filter(l => l.leaveType === 'vacation').length,  total: leaveBalance.vacation, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-100', text: 'text-violet-700' },
    { type: 'Personal',     used: usedLeaves.filter(l => l.leaveType === 'personal').length,  total: leaveBalance.personal, color: 'from-amber-500 to-amber-600',   bg: 'bg-amber-100',  text: 'text-amber-700'  },
  ]

  const attendancePercentage =
    attendance.length > 0
      ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
      : 0

  const totalLeaveBalance =
    leaveBalance.casual + leaveBalance.sick + leaveBalance.vacation + leaveBalance.personal - usedLeaves.length

  const todayStatusLabel = () => {
    if (!hasCheckedIn)  return { text: 'Not checked in yet',                                              color: 'text-slate-400',   dot: 'bg-slate-300'   }
    if (!hasCheckedOut) return { text: `Working · checked in at ${formatTime(todayRecord?.checkInTime)}`, color: 'text-emerald-600', dot: 'bg-emerald-500' }
    return                     { text: `Done · ${formatWorkHours(todayRecord?.workHours)} worked today`,  color: 'text-blue-600',    dot: 'bg-blue-500'    }
  }

  const status = todayStatusLabel()

  const showDailyStatusWarning = !isHREmployee && hasCheckedIn && !hasCheckedOut && !hasDailyStatus

  // ── NEW: whether check-in should visually appear blocked ─────────────────
  const checkInIsBlocked = !hasCheckedIn && !!missingCheckout && !checkingMissed

  const enrichedRecentDays = useMemo(() => {
    const today = new Date()
    const days: {
      date: Date
      type: 'attendance' | 'holiday' | 'weekly_off' | 'on_leave' | 'absent'
      record?: AttendanceRecord
      holiday?: Holiday
      label?: string
    }[] = []

    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      d.setHours(0, 0, 0, 0)

      if (isSunday(d)) { days.push({ date: d, type: 'weekly_off', label: 'Weekly Off' }); continue }

      const matchedHoliday = holidays.find(h => sameDay(h.date.toDate(), d))
      if (matchedHoliday) { days.push({ date: d, type: 'holiday', holiday: matchedHoliday, label: matchedHoliday.name }); continue }

      const onLeave = leaves.some(l => {
        if (l.status !== 'approved') return false
        const ls = l.startDate.toDate(); ls.setHours(0, 0, 0, 0)
        const le = l.endDate.toDate();   le.setHours(0, 0, 0, 0)
        return d >= ls && d <= le
      })
      if (onLeave) { days.push({ date: d, type: 'on_leave', label: 'On Leave' }); continue }

      const attRecord = attendance.find(a => sameDay(a.date.toDate(), d))
      if (attRecord) { days.push({ date: d, type: 'attendance', record: attRecord }); continue }

      if (d < today) { days.push({ date: d, type: 'absent', label: 'Absent' }) }
    }

    return days.slice(0, 10)
  }, [attendance, holidays, leaves])

  const navItems = [
    { href: '/employee/dashboard',        icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard'        },
    { href: '/employee/MyProfile',        icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,        label: 'My Profile'       },
    { href: '/employee/holiday-calendar', icon: <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />, label: 'Holiday Calendar' },
    { href: '/employee/daily-status',     icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Daily Status'     },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── Modals ── */}
      <ConfirmModal
        show={showCheckInConfirm}
        onClose={() => setShowCheckInConfirm(false)}
        onConfirm={handleCheckInConfirmed}
        illustration={<CheckInIllustration />}
        title="Welcome!"
        subtitle="Do you want to check in now?"
        confirmLabel="Yes, Check In"
        confirmClass="bg-green-600 hover:bg-green-700"
      />

      <ConfirmModal
        show={showCheckOutConfirm}
        onClose={() => setShowCheckOutConfirm(false)}
        onConfirm={handleCheckOutConfirmed}
        illustration={<CheckOutIllustration />}
        title="Leaving Already? 🌙"
        subtitle="Are you sure you want to check out?"
        confirmLabel="Yes, Check Out"
        confirmClass="bg-rose-500 hover:bg-rose-600"
      />

      <ConfirmModal
        show={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed}
        illustration={<SadPersonIllustration />}
        title="Comeback Soon!"
        subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout"
        confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

      <DailyStatusBlockModal
        show={showDailyStatusBlock}
        onClose={() => setShowDailyStatusBlock(false)}
      />

      {/* NEW: Missing checkout modal */}
      <MissingCheckoutModal
        show={showMissingCheckoutModal}
        onClose={() => setShowMissingCheckoutModal(false)}
        missingRecord={missingCheckout}
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
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Employee Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Menu</p>
          {navItems.map((item) => {
            const isActive = pathname.replace(/\/$/, '') === item.href.replace(/\/$/, '')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-full ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 pointer-events-none'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
              </Link>
            )
          })}
        </nav>

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
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm"
          >
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Dashboard</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            greeting.text === 'Good Morning'   ? 'bg-amber-50 border-amber-200'   :
            greeting.text === 'Good Afternoon' ? 'bg-orange-50 border-orange-200' : 'bg-violet-50 border-violet-200'
          }`}>
            {greeting.icon}
            <span className={`text-xs font-semibold ${
              greeting.text === 'Good Morning'   ? 'text-amber-700'  :
              greeting.text === 'Good Afternoon' ? 'text-orange-700' : 'text-violet-700'
            }`}>
              {greeting.text}, {userProfile?.name?.split(' ')[0] ?? 'there'}!
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Error / success toasts */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <ErrorRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />{error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />{successMsg}
            </div>
          )}

          {/* NEW: Inline missing-checkout warning banner (shows above the attendance card) */}
          {checkInIsBlocked && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <WarningAmberRoundedIcon sx={{ fontSize: 20, color: '#e11d48', flexShrink: 0, mt: '1px' }} />
              <div>
                <p className="text-sm font-bold text-rose-700">Check-In Blocked — Previous Checkout Missing</p>
                <p className="text-xs text-rose-500 mt-0.5">
                  You didn't check out on{' '}
                  <span className="font-semibold">
                    {missingCheckout!.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>. Please contact your administrator to resolve it.
                </p>
              </div>
            </div>
          )}

          {/* ── Attendance card ── */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -right-2 top-20 w-24 h-24 rounded-full bg-white/5" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AccessTimeRoundedIcon sx={{ fontSize: 16 }} className="opacity-70" />
                  <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Today's Attendance</span>
                </div>
                <h2 className="text-2xl font-extrabold mb-1">
                  {!hasCheckedIn ? 'Not Checked In' : !hasCheckedOut ? 'Currently Working' : 'Day Complete ✅'}
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
                      Out: <strong className="text-white">{formatTime(todayRecord?.checkOutTime)}</strong>
                    </span>
                    {todayRecord?.workHours ? (
                      <span className="flex items-center gap-1.5">
                        <AccessTimeRoundedIcon sx={{ fontSize: 15 }} className="text-amber-300" />
                        <strong className="text-white">{formatWorkHours(todayRecord.workHours)}</strong>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex gap-3 shrink-0">

                {/* ── Check In button ─────────────────────────────────────────
                    Three visual states:
                    1. Already checked in → greyed out with ✓
                    2. Blocked (missing previous checkout) → rose/locked look
                    3. Normal → white button
                */}
                <button
                  onClick={handleCheckInClick}
                  disabled={hasCheckedIn || actionLoading || checkingMissed}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    hasCheckedIn
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : checkInIsBlocked
                        ? 'bg-rose-400/80 text-white cursor-pointer hover:bg-rose-400 shadow-lg'
                        : checkingMissed
                          ? 'bg-white/20 text-white/60 cursor-wait'
                          : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {checkInIsBlocked
                    ? <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
                    : <LoginRoundedIcon sx={{ fontSize: 18 }} />
                  }
                  {hasCheckedIn
                    ? 'Checked In ✓'
                    : checkingMissed
                      ? 'Checking…'
                      : checkInIsBlocked
                        ? 'Blocked ⚠'
                        : 'Check In'
                  }
                </button>

                {/* ── Check Out button (unchanged) ── */}
                <button
                  onClick={handleCheckOutClick}
                  disabled={!hasCheckedIn || hasCheckedOut || actionLoading}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    !hasCheckedIn || hasCheckedOut
                      ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                  {hasCheckedOut ? 'Checked Out ✓' : 'Check Out'}
                  {showDailyStatusWarning && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 border-2 border-blue-700 animate-pulse" />
                  )}
                </button>

              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<CalendarMonthRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />} label="Working Days"  value={attendance.length.toString()} gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"         iconBg="bg-blue-200"   />
            <StatCard icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />}   label="Attendance %"  value={`${attendancePercentage}%`}   gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard icon={<BeachAccessRoundedIcon sx={{ fontSize: 20, color: '#7c3aed' }} />}   label="Leave Balance" value={`${totalLeaveBalance}d`}        gradient="bg-gradient-to-br from-violet-50 to-violet-100 text-violet-900"   iconBg="bg-violet-200" />
            <StatCard icon={<WorkRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />}           label="Status"        value={userProfile?.status === 'active' ? 'Active' : 'Inactive'} gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900" iconBg="bg-amber-200" />
          </div>

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-slate-900">Recent Attendance</h2>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  Last 14 days
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { dot: 'bg-emerald-500', label: 'Present'    },
                  { dot: 'bg-red-400',     label: 'Absent'     },
                  { dot: 'bg-slate-400',   label: 'Weekly Off' },
                  { dot: 'bg-blue-400',    label: 'Holiday'    },
                  { dot: 'bg-amber-400',   label: 'On Leave'   },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${l.dot}`} />{l.label}
                  </span>
                ))}
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {enrichedRecentDays.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarMonthRoundedIcon sx={{ fontSize: 36, color: '#cbd5e1' }} />
                    <p className="text-slate-400 text-sm mt-2">No records yet</p>
                  </div>
                ) : (
                  enrichedRecentDays.map((day, i) => {
                    const dateLabel = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

                    if (day.type === 'weekly_off') return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <WeekendRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-500">{dateLabel}</p>
                            <p className="text-[11px] text-slate-400">Sunday</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Weekly Off</span>
                      </div>
                    )

                    if (day.type === 'holiday' && day.holiday) {
                      const cfg = HOLIDAY_TYPE_CONFIG[day.holiday.type]
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${cfg.badge}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${cfg.badge} flex items-center justify-center shrink-0`}>
                              <CelebrationRoundedIcon sx={{ fontSize: 18 }} className={cfg.text} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${cfg.text}`}>{dateLabel}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{day.holiday.name}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.badge} ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      )
                    }

                    if (day.type === 'on_leave') return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <BeachAccessRoundedIcon sx={{ fontSize: 18, color: '#d97706' }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-amber-700">{dateLabel}</p>
                            <p className="text-[11px] text-amber-500">Approved Leave</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">On Leave</span>
                      </div>
                    )

                    if (day.type === 'attendance' && day.record) {
                      const r  = day.record
                      const ci = r.checkInTime  ? r.checkInTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
                      const co = r.checkOutTime ? r.checkOutTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
                      const wh = r.workHours ? formatWorkHours(r.workHours) : null
                      const stillWorking = r.checkInTime && !r.checkOutTime
                      return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 shrink-0">
                              {day.date.getDate()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{dateLabel}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {ci} → {co}{wh && ` · ${wh}`}
                                {stillWorking && (
                                  <span className="ml-1 inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />In progress
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">Present</span>
                        </div>
                      )
                    }

                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-sm font-bold text-red-400 shrink-0">
                            {day.date.getDate()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-500">{dateLabel}</p>
                            <p className="text-[11px] text-slate-400">No check-in recorded</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-500">Absent</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/employee/holiday-calendar">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 border border-emerald-200">
                  <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />View Holidays
                </button>
              </Link>

              {!isHREmployee && (
                <Link href="/employee/daily-status">
                  <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 border ${
                    hasDailyStatus
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    <AssignmentRoundedIcon sx={{ fontSize: 18 }} />
                    {hasDailyStatus ? 'Daily Status ✓' : 'Submit Daily Status'}
                  </button>
                </Link>
              )}
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