'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { createUser, getAllUsers, deleteUser } from '@/lib/firestore-service'
import { auth, db } from '@/lib/firebase'
import { Timestamp, collection, addDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import DashboardRoundedIcon     from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon        from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon    from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon     from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon      from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon        from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon          from '@mui/icons-material/MenuRounded'
import AssignmentRoundedIcon    from '@mui/icons-material/AssignmentRounded'
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon   from '@mui/icons-material/FingerprintRounded'
import ShieldRoundedIcon        from '@mui/icons-material/ShieldRounded'
import AddRoundedIcon           from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded'
import WarningAmberRoundedIcon  from '@mui/icons-material/WarningAmberRounded'
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded'
import VisibilityRoundedIcon    from '@mui/icons-material/VisibilityRounded'
import BeachAccessRoundedIcon   from '@mui/icons-material/BeachAccessRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import EmailRoundedIcon         from '@mui/icons-material/EmailRounded'
import PhoneRoundedIcon         from '@mui/icons-material/PhoneRounded'
import ErrorRoundedIcon         from '@mui/icons-material/ErrorRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import InfoRoundedIcon          from '@mui/icons-material/InfoRounded'
import WbSunnyRoundedIcon       from '@mui/icons-material/WbSunnyRounded'
import CelebrationRoundedIcon   from '@mui/icons-material/CelebrationRounded'
import CakeRoundedIcon          from '@mui/icons-material/CakeRounded'
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded'
import WorkRoundedIcon          from '@mui/icons-material/WorkRounded'

// ── Sad illustration ──────────────────────────────────────────────────────────
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
function ConfirmModal({ show, onClose, onConfirm, illustration, title, subtitle, confirmLabel, confirmClass, loading = false }: {
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  uid: string; email: string; name: string; role: 'admin' | 'employee'
  phoneNumber?: string; department?: string; designation?: string
  createdAt: Timestamp; lastLogin: Timestamp; status: 'active' | 'inactive'
}

interface AdminForm { name: string; email: string; password: string; phoneNumber: string }
const EMPTY_ADMIN_FORM: AdminForm = { name: '', email: '', password: '', phoneNumber: '' }

interface Holiday {
  id: string; name: string; date: Timestamp; type: 'national' | 'regional' | 'company'
}
interface HolidayForm { name: string; date: string; type: 'national' | 'regional' | 'company' }
const EMPTY_HOLIDAY_FORM: HolidayForm = { name: '', date: '', type: 'national' }

interface Birthday {
  id: string; name: string; date: Timestamp; department?: string; userId?: string
}
interface BirthdayForm { name: string; date: string; department: string }
const EMPTY_BIRTHDAY_FORM: BirthdayForm = { name: '', date: '', department: '' }

const TYPE_META = {
  national: { label: 'National',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
  regional: { label: 'Regional',  bg: 'bg-amber-100',  text: 'text-amber-700'  },
  company:  { label: 'Company',   bg: 'bg-violet-100', text: 'text-violet-700' },
}

function TypeBadge({ type }: { type: Holiday['type'] }) {
  const m = TYPE_META[type]
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.bg} ${m.text}`}>{m.label}</span>
}

function groupByMonth(holidays: Holiday[]): Record<string, Holiday[]> {
  return holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const key = h.date.toDate().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(h)
    return acc
  }, {})
}

// Days until birthday (yearly recurrence)
function daysUntilBirthday(bday: Birthday): number {
  const d     = bday.date.toDate()
  const today = new Date()
  const next  = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  const diff  = next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.ceil(diff / 86400000)
}

function isBirthdayToday(bday: Birthday): boolean {
  const d     = bday.date.toDate()
  const today = new Date()
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

// Sort birthdays by upcoming date
function sortBirthdaysByUpcoming(birthdays: Birthday[]): Birthday[] {
  return [...birthdays].sort((a, b) => daysUntilBirthday(a) - daysUntilBirthday(b))
}

const AVATAR_COLORS = [
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
]

// ── Main Settings Content ─────────────────────────────────────────────────────
function SettingsContent() {
  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const [sidebarOpen, setSidebarOpen]           = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading]         = useState(false)

  // ── Admin state ───────────────────────────────────────────────────────────
  const [admins, setAdmins]                   = useState<UserProfile[]>([])
  const [adminsLoading, setAdminsLoading]     = useState(true)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [adminForm, setAdminForm]             = useState<AdminForm>(EMPTY_ADMIN_FORM)
  const [showPassword, setShowPassword]       = useState(false)
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminFormError, setAdminFormError]   = useState('')
  const [adminFormSuccess, setAdminFormSuccess] = useState('')
  const [deleteAdminTarget, setDeleteAdminTarget]         = useState<UserProfile | null>(null)
  const [deleteAdminSubmitting, setDeleteAdminSubmitting] = useState(false)
  const [deleteAdminError, setDeleteAdminError]           = useState('')

  // ── Holiday state ─────────────────────────────────────────────────────────
  const [holidays, setHolidays]                   = useState<Holiday[]>([])
  const [holidaysLoading, setHolidaysLoading]     = useState(true)
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false)
  const [holidayForm, setHolidayForm]             = useState<HolidayForm>(EMPTY_HOLIDAY_FORM)
  const [holidaySubmitting, setHolidaySubmitting] = useState(false)
  const [holidayFormError, setHolidayFormError]   = useState('')
  const [holidayToast, setHolidayToast]           = useState('')
  const [deleteHolidayTarget, setDeleteHolidayTarget]         = useState<Holiday | null>(null)
  const [deleteHolidaySubmitting, setDeleteHolidaySubmitting] = useState(false)

  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState(currentYear)

  // ── Birthday state ────────────────────────────────────────────────────────
  const [birthdays, setBirthdays]                 = useState<Birthday[]>([])
  const [birthdaysLoading, setBirthdaysLoading]   = useState(true)
  const [showAddBirthdayModal, setShowAddBirthdayModal] = useState(false)
  const [birthdayForm, setBirthdayForm]           = useState<BirthdayForm>(EMPTY_BIRTHDAY_FORM)
  const [birthdaySubmitting, setBirthdaySubmitting] = useState(false)
  const [birthdayFormError, setBirthdayFormError] = useState('')
  const [birthdayToast, setBirthdayToast]         = useState('')
  const [deleteBirthdayTarget, setDeleteBirthdayTarget]       = useState<Birthday | null>(null)
  const [deleteBirthdaySubmitting, setDeleteBirthdaySubmitting] = useState(false)
  const [birthdaySearch, setBirthdaySearch]       = useState('')

  // ── Load admins ───────────────────────────────────────────────────────────
  const loadAdmins = async () => {
    try {
      setAdminsLoading(true)
      const all = await getAllUsers()
      setAdmins(all.filter((u: UserProfile) => u.role === 'admin'))
    } catch (err) { console.error(err) } finally { setAdminsLoading(false) }
  }
  useEffect(() => { loadAdmins() }, [])

  // ── Load holidays ─────────────────────────────────────────────────────────
  const loadHolidays = async () => {
    try {
      setHolidaysLoading(true)
      const snap = await getDocs(query(collection(db, 'holidays'), orderBy('date', 'asc')))
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday)))
    } catch (err) { console.error(err) } finally { setHolidaysLoading(false) }
  }
  useEffect(() => { loadHolidays() }, [])

  // ── Load birthdays ────────────────────────────────────────────────────────
  const loadBirthdays = async () => {
    try {
      setBirthdaysLoading(true)
      const snap = await getDocs(query(collection(db, 'birthdays'), orderBy('name', 'asc')))
      setBirthdays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Birthday)))
    } catch (err) { console.error(err) } finally { setBirthdaysLoading(false) }
  }
  useEffect(() => { loadBirthdays() }, [])

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  // ── Add admin ─────────────────────────────────────────────────────────────
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setAdminFormError(''); setAdminSubmitting(true)
    try {
      if (!adminForm.name || !adminForm.email || !adminForm.password) throw new Error('Name, email, and password are required')
      if (adminForm.password.length < 6) throw new Error('Password must be at least 6 characters')
      const { initializeApp } = await import('firebase/app')
      const { getAuth, createUserWithEmailAndPassword: createUser2 } = await import('firebase/auth')
      const secondaryApp = initializeApp(auth.app.options, 'secondary')
      const secondaryAuth = getAuth(secondaryApp)
      const userCredential = await createUser2(secondaryAuth, adminForm.email, adminForm.password)
      await secondaryAuth.signOut()
      const { deleteApp } = await import('firebase/app'); await deleteApp(secondaryApp)
      await createUser({ uid: userCredential.user.uid, email: adminForm.email, name: adminForm.name, role: 'admin', phoneNumber: adminForm.phoneNumber, createdAt: Timestamp.now(), lastLogin: Timestamp.now(), status: 'active' })
      setAdminForm(EMPTY_ADMIN_FORM); setShowAddAdminModal(false)
      setAdminFormSuccess(`Admin "${adminForm.name}" created! Logging you out…`)
      setTimeout(async () => { await signOut(); router.push('/') }, 2000)
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setAdminFormError('This email is already registered')
      else if (err.code === 'auth/invalid-email') setAdminFormError('Invalid email address')
      else setAdminFormError(err.message || 'Failed to create admin')
    } finally { setAdminSubmitting(false) }
  }

  // ── Delete admin ──────────────────────────────────────────────────────────
  const handleDeleteAdmin = async () => {
    if (!deleteAdminTarget) return
    const activeAdmins = admins.filter(a => a.status === 'active')
    if (activeAdmins.length <= 1 && deleteAdminTarget.uid !== userProfile?.uid) { setDeleteAdminError('Cannot delete the last admin!'); return }
    setDeleteAdminSubmitting(true); setDeleteAdminError('')
    try {
      await deleteUser(deleteAdminTarget.uid)
      if (deleteAdminTarget.uid === userProfile?.uid) { setDeleteAdminTarget(null); await signOut(); router.push('/'); return }
      setDeleteAdminTarget(null); await loadAdmins()
      setAdminFormSuccess(`Admin "${deleteAdminTarget.name}" removed successfully!`)
      setTimeout(() => setAdminFormSuccess(''), 4000)
    } catch (err: any) { setDeleteAdminError(err.message || 'Failed to delete admin') }
    finally { setDeleteAdminSubmitting(false) }
  }

  // ── Add holiday ───────────────────────────────────────────────────────────
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setHolidayFormError('')
    if (!holidayForm.name.trim()) { setHolidayFormError('Holiday name is required'); return }
    if (!holidayForm.date)        { setHolidayFormError('Date is required'); return }
    if (new Date(holidayForm.date).getDay() === 0) { setHolidayFormError('Sunday is already a permanent Week Off — no need to add it separately.'); return }
    const alreadyExists = holidays.some(h => h.date.toDate().toDateString() === new Date(holidayForm.date).toDateString())
    if (alreadyExists) { setHolidayFormError('A holiday on this date already exists.'); return }
    setHolidaySubmitting(true)
    try {
      await addDoc(collection(db, 'holidays'), { name: holidayForm.name.trim(), date: Timestamp.fromDate(new Date(holidayForm.date)), type: holidayForm.type })
      const addedName = holidayForm.name.trim()
      setHolidayForm(EMPTY_HOLIDAY_FORM); setShowAddHolidayModal(false)
      await loadHolidays()
      showHolidayToastMsg(`"${addedName}" added successfully!`)
    } catch (err: any) { setHolidayFormError(err.message || 'Failed to add holiday') }
    finally { setHolidaySubmitting(false) }
  }

  // ── Delete holiday ────────────────────────────────────────────────────────
  const handleDeleteHoliday = async () => {
    if (!deleteHolidayTarget) return
    setDeleteHolidaySubmitting(true)
    try {
      await deleteDoc(doc(db, 'holidays', deleteHolidayTarget.id))
      const name = deleteHolidayTarget.name
      setDeleteHolidayTarget(null); await loadHolidays()
      showHolidayToastMsg(`"${name}" removed.`)
    } catch (err) { console.error(err) }
    finally { setDeleteHolidaySubmitting(false) }
  }

  const showHolidayToastMsg = (msg: string) => { setHolidayToast(msg); setTimeout(() => setHolidayToast(''), 4000) }

  // ── Add birthday ──────────────────────────────────────────────────────────
  const handleAddBirthday = async (e: React.FormEvent) => {
    e.preventDefault(); setBirthdayFormError('')
    if (!birthdayForm.name.trim()) { setBirthdayFormError('Name is required'); return }
    if (!birthdayForm.date)        { setBirthdayFormError('Date of birth is required'); return }
    setBirthdaySubmitting(true)
    try {
      await addDoc(collection(db, 'birthdays'), {
        name:       birthdayForm.name.trim(),
        date:       Timestamp.fromDate(new Date(birthdayForm.date)),
        department: birthdayForm.department.trim() || null,
      })
      const addedName = birthdayForm.name.trim()
      setBirthdayForm(EMPTY_BIRTHDAY_FORM); setShowAddBirthdayModal(false)
      await loadBirthdays()
      setBirthdayToast(`Birthday for "${addedName}" added! 🎂`)
      setTimeout(() => setBirthdayToast(''), 4000)
    } catch (err: any) { setBirthdayFormError(err.message || 'Failed to add birthday') }
    finally { setBirthdaySubmitting(false) }
  }

  // ── Delete birthday ───────────────────────────────────────────────────────
  const handleDeleteBirthday = async () => {
    if (!deleteBirthdayTarget) return
    setDeleteBirthdaySubmitting(true)
    try {
      await deleteDoc(doc(db, 'birthdays', deleteBirthdayTarget.id))
      const name = deleteBirthdayTarget.name
      setDeleteBirthdayTarget(null); await loadBirthdays()
      setBirthdayToast(`"${name}" removed.`)
      setTimeout(() => setBirthdayToast(''), 4000)
    } catch (err) { console.error(err) }
    finally { setDeleteBirthdaySubmitting(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeAdminCount = admins.filter(a => a.status === 'active').length
  const canAddAdmin = activeAdminCount === 0 || (activeAdminCount === 1 && admins.find(a => a.uid === userProfile?.uid) !== undefined)

  const yearHolidays  = holidays.filter(h => h.date.toDate().getFullYear() === filterYear)
  const grouped       = groupByMonth(yearHolidays)
  const monthKeys     = Object.keys(grouped)
  const upcomingCount = yearHolidays.filter(h => h.date.toDate() >= new Date()).length

  const sortedBirthdays   = sortBirthdaysByUpcoming(birthdays)
  const filteredBirthdays = birthdaySearch.trim()
    ? sortedBirthdays.filter(b => b.name.toLowerCase().includes(birthdaySearch.toLowerCase()) || b.department?.toLowerCase().includes(birthdaySearch.toLowerCase()))
    : sortedBirthdays

  const todayBirthdays = birthdays.filter(isBirthdayToday)

  const navItems = [
    { href: '/admin/dashboard',    icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard',      active: false },
    { href: '/admin/employees',    icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,       label: 'Employees',      active: false },
    { href: '/admin/attendance',   icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Attendance',     active: false },
    { href: '/admin/leaves',       icon: <BeachAccessRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Leave Requests', active: false },
    { href: '/admin/daily-status', icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Daily Status',   active: false },
    { href: '/admin/settings',     icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Settings',       active: true  },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      <ConfirmModal show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleLogoutConfirmed}
        illustration={<SadPersonIllustration />} title="Comeback Soon!" subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700" loading={logoutLoading} />

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
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm">
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />Sign Out
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
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Settings</h1>
            <p className="text-xs text-slate-400">Manage admin accounts, holidays and birthdays</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {adminFormSuccess && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />
              <p className="text-sm text-emerald-700 font-semibold">{adminFormSuccess}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ADMIN MANAGEMENT
          ══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                  <ShieldRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm">Admin Management</h2>
                  <p className="text-[11px] text-slate-400">{activeAdminCount} active admin{activeAdminCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => { setShowAddAdminModal(true); setAdminFormError(''); setAdminForm(EMPTY_ADMIN_FORM) }}
                disabled={!canAddAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed">
                <AddRoundedIcon sx={{ fontSize: 16 }} />Add Admin
              </button>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100">
              <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#d97706' }} />
              <p className="text-xs text-amber-800 font-semibold">
                {activeAdminCount >= 1 ? 'Maximum 1 admin allowed — remove existing admin to add a new one' : 'Admin accounts have full system access'}
              </p>
            </div>
            {adminsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-500 text-sm font-medium">Loading admins…</span>
              </div>
            ) : admins.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-300">
                <ShieldRoundedIcon sx={{ fontSize: 36 }} />
                <p className="text-sm mt-2 font-medium text-slate-400">No admins found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {admins.map(admin => {
                  const isSelf = admin.uid === userProfile?.uid
                  const isLastActive = activeAdminCount <= 1 && admin.status === 'active'
                  const initials = admin.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                  return (
                    <div key={admin.uid} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{admin.name}</p>
                          {isSelf && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">You</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${admin.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {admin.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-0.5">
                          <div className="flex items-center gap-1 text-slate-400">
                            <EmailRoundedIcon sx={{ fontSize: 12 }} />
                            <span className="text-[11px]">{admin.email}</span>
                          </div>
                          {admin.phoneNumber && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <PhoneRoundedIcon sx={{ fontSize: 12 }} />
                              <span className="text-[11px]">{admin.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">
                        {admin.createdAt?.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {isLastActive && !isSelf ? (
                        <span className="text-xs text-slate-300 italic shrink-0">Last admin</span>
                      ) : (
                        <button onClick={() => { setDeleteAdminTarget(admin); setDeleteAdminError('') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 text-xs font-semibold transition-all shrink-0">
                          <DeleteRoundedIcon sx={{ fontSize: 14 }} />Remove
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BIRTHDAY MANAGEMENT
          ══════════════════════════════════════════════════════════════ */}

          {birthdayToast && (
            <div className="flex items-center gap-3 p-4 bg-pink-50 border border-pink-100 rounded-2xl">
              <CakeRoundedIcon sx={{ fontSize: 20, color: '#ec4899' }} />
              <p className="text-sm text-pink-700 font-semibold">{birthdayToast}</p>
            </div>
          )}

          {/* Today's birthday banner for admin */}
          {todayBirthdays.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-2xl">
              <span className="text-2xl">🎂</span>
              <div>
                <p className="text-sm font-bold text-pink-700">Birthday Today!</p>
                <p className="text-xs text-pink-500">{todayBirthdays.map(b => b.name).join(', ')} — don't forget to wish them!</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <CakeRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm">Birthday Management</h2>
                  <p className="text-[11px] text-slate-400">
                    {birthdays.length} employee{birthdays.length !== 1 ? 's' : ''}
                    {birthdays.filter(b => daysUntilBirthday(b) <= 30).length > 0 && ` · ${birthdays.filter(b => daysUntilBirthday(b) <= 30).length} upcoming in 30 days`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddBirthdayModal(true); setBirthdayFormError(''); setBirthdayForm(EMPTY_BIRTHDAY_FORM) }}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-pink-200"
              >
                <AddRoundedIcon sx={{ fontSize: 16 }} />Add Birthday
              </button>
            </div>

            {/* Search */}
            {birthdays.length > 0 && (
              <div className="px-5 py-3 border-b border-slate-100">
                <input
                  placeholder="Search by name or department…"
                  value={birthdaySearch}
                  onChange={e => setBirthdaySearch(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-pink-400 transition-all"
                />
              </div>
            )}

            {birthdaysLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-500 text-sm font-medium">Loading birthdays…</span>
              </div>
            ) : filteredBirthdays.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <CakeRoundedIcon sx={{ fontSize: 36, color: '#d1d5db' }} />
                <p className="text-sm font-medium text-slate-400">
                  {birthdaySearch ? 'No results found' : 'No birthdays added yet'}
                </p>
                {!birthdaySearch && (
                  <button onClick={() => { setShowAddBirthdayModal(true); setBirthdayFormError(''); setBirthdayForm(EMPTY_BIRTHDAY_FORM) }}
                    className="mt-1 text-xs text-pink-500 font-semibold hover:underline">
                    + Add first birthday
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredBirthdays.map((b, i) => {
                  const d       = b.date.toDate()
                  const isToday = isBirthdayToday(b)
                  const days    = daysUntilBirthday(b)
                  return (
                    <div key={b.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${isToday ? 'bg-pink-50/50' : ''}`}>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                          {isToday && <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold animate-pulse">🎂 Today!</span>}
                          {!isToday && days <= 7 && <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold">Soon</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-[11px] text-slate-400">
                            {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                          </p>
                          {b.department && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <WorkRoundedIcon sx={{ fontSize: 11 }} />{b.department}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <p className="text-xs font-bold text-slate-700">
                          {isToday ? '🎉 Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </p>
                      </div>
                      <button onClick={() => setDeleteBirthdayTarget(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 text-xs font-semibold transition-all shrink-0">
                        <DeleteRoundedIcon sx={{ fontSize: 14 }} />Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <InfoRoundedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
              <p className="text-[11px] text-slate-400">Birthdays are visible on employee dashboards. Sorted by upcoming date.</p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              HOLIDAY MANAGEMENT
          ══════════════════════════════════════════════════════════════ */}

          {holidayToast && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />
              <p className="text-sm text-emerald-700 font-semibold">{holidayToast}</p>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm">Holiday Management</h2>
                  <p className="text-[11px] text-slate-400">
                    {yearHolidays.length} holiday{yearHolidays.length !== 1 ? 's' : ''} in {filterYear}
                    {upcomingCount > 0 && ` · ${upcomingCount} upcoming`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                  className="text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-orange-400">
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={() => { setShowAddHolidayModal(true); setHolidayFormError(''); setHolidayForm(EMPTY_HOLIDAY_FORM) }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-200">
                  <AddRoundedIcon sx={{ fontSize: 16 }} />Add Holiday
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
              <InfoRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <p className="text-xs text-blue-800 font-semibold">Sundays are automatically treated as <span className="font-extrabold">Week Off</span> — no need to add them here.</p>
            </div>
            {holidaysLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-500 text-sm font-medium">Loading holidays…</span>
              </div>
            ) : yearHolidays.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <CelebrationRoundedIcon sx={{ fontSize: 36, color: '#d1d5db' }} />
                <p className="text-sm font-medium text-slate-400">No holidays configured for {filterYear}</p>
                <button onClick={() => { setShowAddHolidayModal(true); setHolidayFormError(''); setHolidayForm(EMPTY_HOLIDAY_FORM) }}
                  className="mt-1 text-xs text-orange-500 font-semibold hover:underline">+ Add your first holiday</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {monthKeys.map(month => (
                  <div key={month}>
                    <div className="px-5 py-2 bg-slate-50">
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{month}</p>
                    </div>
                    {grouped[month].map(holiday => {
                      const d = holiday.date.toDate()
                      const isPast = d < new Date()
                      return (
                        <div key={holiday.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${isPast ? 'opacity-50' : ''}`}>
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-orange-400 uppercase">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                            <span className="text-lg font-extrabold text-orange-600 leading-tight">{d.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">{holiday.name}</p>
                              <TypeBadge type={holiday.type} />
                              {!isPast && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Upcoming</span>}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <button onClick={() => setDeleteHolidayTarget(holiday)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 text-xs font-semibold transition-all shrink-0">
                            <DeleteRoundedIcon sx={{ fontSize: 14 }} />Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50 flex-wrap">
              <p className="text-[11px] text-slate-400 font-semibold">Type:</p>
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map(t => (
                <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_META[t].bg} ${TYPE_META[t].text}`}>{TYPE_META[t].label}</span>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <WbSunnyRoundedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                <p className="text-[11px] text-slate-400">Sundays auto-marked as Week Off</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-extrabold text-slate-900 text-sm mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Manage Employees', icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} />,     href: '/admin/employees' },
                { label: 'View Attendance',  icon: <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />, href: '/admin/attendance' },
                { label: 'Approve Leaves',   icon: <EventNoteRoundedIcon sx={{ fontSize: 18 }} />,  href: '/admin/leaves' },
              ].map(a => (
                <Link key={a.label} href={a.href}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-semibold hover:-translate-y-0.5 active:translate-y-0">
                    <span className="text-slate-400">{a.icon}</span>{a.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* ════════ ADD ADMIN MODAL ════════ */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                  <ShieldRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Add New Admin</h2>
                  <p className="text-xs text-slate-400">Full system access will be granted</p>
                </div>
              </div>
              <button onClick={() => setShowAddAdminModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="p-6 space-y-5">
              {adminFormError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                  <p className="text-sm text-red-700">{adminFormError}</p>
                </div>
              )}
              {[
                { label: 'Full Name', key: 'name',  type: 'text',  placeholder: 'e.g. Arjun Kumar',   icon: null,                                              required: true },
                { label: 'Email',     key: 'email', type: 'email', placeholder: 'admin@company.com',  icon: <EmailRoundedIcon sx={{ fontSize: 16 }} />, required: true },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                  <div className="relative">
                    {field.icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{field.icon}</span>}
                    <input type={field.type} placeholder={field.placeholder} required={field.required}
                      value={(adminForm as any)[field.key]}
                      onChange={e => setAdminForm(p => ({ ...p, [field.key]: e.target.value }))}
                      className={`w-full ${field.icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-violet-500 focus:outline-none`} />
                  </div>
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" required
                    value={adminForm.password}
                    onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-violet-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <VisibilityOffRoundedIcon sx={{ fontSize: 16 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <PhoneRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input placeholder="+91 9876543210" value={adminForm.phoneNumber}
                    onChange={e => setAdminForm(p => ({ ...p, phoneNumber: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-violet-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={adminSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200">
                  {adminSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</> : <><ShieldRoundedIcon sx={{ fontSize: 16 }} />Create Admin</>}
                </button>
                <button type="button" onClick={() => setShowAddAdminModal(false)}
                  className="h-11 px-5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ DELETE ADMIN CONFIRM ════════ */}
      {deleteAdminTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <DeleteRoundedIcon sx={{ fontSize: 28, color: '#dc2626' }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-900">Remove Admin?</h2>
              <p className="text-sm text-slate-500 mt-1">You're about to remove <span className="font-semibold text-slate-800">{deleteAdminTarget.name}</span></p>
              {deleteAdminTarget.uid === userProfile?.uid && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl mt-3">
                  <WarningAmberRoundedIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                  <p className="text-xs text-red-700 font-semibold">You are deleting your own account — you will be logged out!</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {deleteAdminTarget.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{deleteAdminTarget.name}</p>
                <p className="text-xs text-slate-400">{deleteAdminTarget.email}</p>
              </div>
            </div>
            {deleteAdminError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl">
                <ErrorRoundedIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                <p className="text-sm text-red-700">{deleteAdminError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleDeleteAdmin} disabled={deleteAdminSubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
                {deleteAdminSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Removing…</> : <><DeleteRoundedIcon sx={{ fontSize: 16 }} />Yes, Remove</>}
              </button>
              <button onClick={() => setDeleteAdminTarget(null)} className="flex-1 h-11 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ ADD BIRTHDAY MODAL ════════ */}
      {showAddBirthdayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <CakeRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Add Birthday</h2>
                  <p className="text-xs text-slate-400">Shown on employee dashboard each year</p>
                </div>
              </div>
              <button onClick={() => setShowAddBirthdayModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <form onSubmit={handleAddBirthday} className="p-6 space-y-5">
              {birthdayFormError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                  <p className="text-sm text-red-700">{birthdayFormError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <PersonRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="e.g. Priya Sharma" required
                    value={birthdayForm.name}
                    onChange={e => setBirthdayForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-pink-400 focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" required
                  value={birthdayForm.date}
                  onChange={e => setBirthdayForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-pink-400 focus:outline-none" />
                <p className="text-[11px] text-slate-400">Only the month and day are used — birthdays repeat every year.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Department <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <div className="relative">
                  <WorkRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="e.g. Engineering, HR, Marketing…"
                    value={birthdayForm.department}
                    onChange={e => setBirthdayForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-pink-400 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={birthdaySubmitting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-pink-200">
                  {birthdaySubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Adding…</> : <><CakeRoundedIcon sx={{ fontSize: 16 }} />Add Birthday</>}
                </button>
                <button type="button" onClick={() => setShowAddBirthdayModal(false)}
                  className="h-11 px-5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ DELETE BIRTHDAY CONFIRM ════════ */}
      {deleteBirthdayTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <DeleteRoundedIcon sx={{ fontSize: 28, color: '#dc2626' }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-900">Remove Birthday?</h2>
              <p className="text-sm text-slate-500 mt-1">Remove <span className="font-semibold text-slate-800">{deleteBirthdayTarget.name}</span>'s birthday from the dashboard?</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                {deleteBirthdayTarget.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{deleteBirthdayTarget.name}</p>
                <p className="text-xs text-slate-400">
                  {deleteBirthdayTarget.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                  {deleteBirthdayTarget.department && ` · ${deleteBirthdayTarget.department}`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeleteBirthday} disabled={deleteBirthdaySubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
                {deleteBirthdaySubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Removing…</> : <><DeleteRoundedIcon sx={{ fontSize: 16 }} />Yes, Remove</>}
              </button>
              <button onClick={() => setDeleteBirthdayTarget(null)} className="flex-1 h-11 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ ADD HOLIDAY MODAL ════════ */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Add Holiday</h2>
                  <p className="text-xs text-slate-400">Applies to all employee attendance records</p>
                </div>
              </div>
              <button onClick={() => setShowAddHolidayModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <form onSubmit={handleAddHoliday} className="p-6 space-y-5">
              {holidayFormError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                  <p className="text-sm text-red-700">{holidayFormError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Holiday Name <span className="text-red-500">*</span></label>
                <input type="text" placeholder="e.g. Pongal, Independence Day…" required
                  value={holidayForm.name}
                  onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-orange-400 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
                <input type="date" required value={holidayForm.date}
                  onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-orange-400 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Holiday Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map(t => (
                    <button key={t} type="button" onClick={() => setHolidayForm(p => ({ ...p, type: t }))}
                      className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        holidayForm.type === t
                          ? t === 'national' ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                            : t === 'regional' ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200'
                            : 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {holidayForm.type === 'national' && 'Public holidays like Republic Day, Independence Day, Gandhi Jayanti'}
                  {holidayForm.type === 'regional' && 'Festivals like Pongal, Diwali, Eid — observed locally'}
                  {holidayForm.type === 'company'  && 'Internal company-specific holidays or office closures'}
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={holidaySubmitting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-200">
                  {holidaySubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Adding…</> : <><AddRoundedIcon sx={{ fontSize: 16 }} />Add Holiday</>}
                </button>
                <button type="button" onClick={() => setShowAddHolidayModal(false)}
                  className="h-11 px-5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ DELETE HOLIDAY CONFIRM ════════ */}
      {deleteHolidayTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <DeleteRoundedIcon sx={{ fontSize: 28, color: '#dc2626' }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-900">Remove Holiday?</h2>
              <p className="text-sm text-slate-500 mt-1">You're about to remove <span className="font-semibold text-slate-800">{deleteHolidayTarget.name}</span></p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-orange-400 uppercase">{deleteHolidayTarget.date.toDate().toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                <span className="text-lg font-extrabold text-orange-600 leading-tight">{deleteHolidayTarget.date.toDate().getDate()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{deleteHolidayTarget.name}</p>
                <p className="text-xs text-slate-400">{deleteHolidayTarget.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <TypeBadge type={deleteHolidayTarget.type} />
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
              <InfoRoundedIcon sx={{ fontSize: 16, color: '#d97706' }} />
              <p className="text-xs text-amber-800 font-semibold">This date will no longer be treated as a holiday in attendance calculations.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeleteHoliday} disabled={deleteHolidaySubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
                {deleteHolidaySubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Removing…</> : <><DeleteRoundedIcon sx={{ fontSize: 16 }} />Yes, Remove</>}
              </button>
              <button onClick={() => setDeleteHolidayTarget(null)} className="flex-1 h-11 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <SettingsContent />
    </ProtectedRoute>
  )
}