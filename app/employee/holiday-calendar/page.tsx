'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Firebase ──────────────────────────────────────────────────────────────────
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, orderBy, Timestamp, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {  usePathname } from 'next/navigation'  

// ── MUI Icons ─────────────────────────────────────────────────────────────────
import DashboardRoundedIcon     from '@mui/icons-material/DashboardRounded'
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded'
import EventNoteRoundedIcon     from '@mui/icons-material/EventNoteRounded'
import AssignmentRoundedIcon    from '@mui/icons-material/AssignmentRounded'
import LogoutRoundedIcon        from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon          from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded'

import FingerprintRoundedIcon   from '@mui/icons-material/FingerprintRounded'
import ChevronLeftRoundedIcon   from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon  from '@mui/icons-material/ChevronRightRounded'
import TodayRoundedIcon         from '@mui/icons-material/TodayRounded'
import PictureAsPdfRoundedIcon  from '@mui/icons-material/PictureAsPdfRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import CircleIcon               from '@mui/icons-material/Circle'
import ViewListRoundedIcon      from '@mui/icons-material/ViewListRounded'
import OpenInNewRoundedIcon     from '@mui/icons-material/OpenInNewRounded'
import EmojiEventsRoundedIcon   from '@mui/icons-material/EmojiEventsRounded'
import BeachAccessRoundedIcon   from '@mui/icons-material/BeachAccessRounded'

// ── Types ─────────────────────────────────────────────────────────────────────
export type HolidayType = 'public' | 'festival' | 'national' | 'weekly_off'

export interface Holiday {
  id?: string
  name: string
  date: Timestamp
  type: HolidayType
  description?: string
}

// ── Firebase helpers ──────────────────────────────────────────────────────────
const COLLECTION = 'holidays'

export async function getHolidays(): Promise<Holiday[]> {
  const q = query(collection(db, COLLECTION), orderBy('date', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday))
}

export async function getHolidaysByYear(year: number): Promise<Holiday[]> {
  const start = Timestamp.fromDate(new Date(year, 0, 1))
  const end   = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59))
  const q = query(
    collection(db, COLLECTION),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday))
}

// ── Seed default holidays ─────────────────────────────────────────────────────
export async function seedDefaultHolidays(year: number) {
  const defaults: Omit<Holiday, 'id'>[] = [
    { name: "New Year's Day",    date: Timestamp.fromDate(new Date(year, 0, 1)),  type: 'public'   },
    { name: 'Pongal',            date: Timestamp.fromDate(new Date(year, 0, 14)), type: 'festival' },
    { name: 'Thiruvalluvar Day', date: Timestamp.fromDate(new Date(year, 0, 15)), type: 'festival' },
    { name: 'Republic Day',      date: Timestamp.fromDate(new Date(year, 0, 26)), type: 'national' },
    { name: 'Labour Day',        date: Timestamp.fromDate(new Date(year, 4, 1)),  type: 'public'   },
    { name: 'Independence Day',  date: Timestamp.fromDate(new Date(year, 7, 15)), type: 'national' },
    { name: 'Gandhi Jayanti',    date: Timestamp.fromDate(new Date(year, 9, 2)),  type: 'national' },
    { name: 'Christmas Day',     date: Timestamp.fromDate(new Date(year, 11, 25)),type: 'festival' },
  ]
  await Promise.all(defaults.map(h => addDoc(collection(db, COLLECTION), h)))
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']


const TYPE_CONFIG: Record<HolidayType, { label: string; dot: string; badge: string; text: string }> = {
  public:     { label: 'Public Holiday',      dot: 'bg-rose-500',    badge: 'bg-rose-100',    text: 'text-rose-700'    },
  festival:   { label: 'Festival Holiday',    dot: 'bg-emerald-500', badge: 'bg-emerald-100', text: 'text-emerald-700' },
  national:   { label: 'National Holiday',    dot: 'bg-blue-500',    badge: 'bg-blue-100',    text: 'text-blue-700'    },
  weekly_off: { label: 'Weekly Off (Sunday)', dot: 'bg-slate-400',   badge: 'bg-slate-100',   text: 'text-slate-600'   },
}

// Fallback used when a holiday doc has a missing/unrecognized `type`
const FALLBACK_TYPE_CONFIG = {
  label: 'Holiday',
  dot: 'bg-slate-400',
  badge: 'bg-slate-100',
  text: 'text-slate-600',
}

function getTypeConfig(type?: HolidayType) {
  return (type && TYPE_CONFIG[type]) || FALLBACK_TYPE_CONFIG
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ── Holiday dot ───────────────────────────────────────────────────────────────
function HolidayDot({ type }: { type: HolidayType }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${getTypeConfig(type).dot}`} />
}

// ── Main Component ────────────────────────────────────────────────────────────
function HolidayCalendarContent() {
  const pathname = usePathname()
  const today = new Date()

  const [sidebarOpen, setSidebarOpen]             = useState(true)
  const [currentYear,  setCurrentYear]            = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth]           = useState(today.getMonth())
  const [holidays, setHolidays]                   = useState<Holiday[]>([])
  const [loading, setLoading]                     = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading]         = useState(false)
  const [selectedDay, setSelectedDay]             = useState<Date | null>(null)
  const [viewAll, setViewAll]                     = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  // ── Load holidays ───────────────────────────────────────────────────────────
  const loadHolidays = async () => {
    setLoading(true)
    try {
      let data = await getHolidaysByYear(currentYear)
      if (data.length === 0) {
        await seedDefaultHolidays(currentYear)
        data = await getHolidaysByYear(currentYear)
      }
      setHolidays(data)
    } catch (err) { console.error('Error loading holidays:', err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadHolidays() }, [currentYear])

  // ── Navigate month ──────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()) }

  // ── Calendar data ───────────────────────────────────────────────────────────
  const daysInMonth    = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth)

  const holidaysThisMonth = holidays.filter(h => {
    const d = h.date.toDate()
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })

  const getHolidaysForDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    return holidays.filter(h => sameDay(h.date.toDate(), date))
  }

  const isSunday = (day: number) => new Date(currentYear, currentMonth, day).getDay() === 0

  const upcomingHolidays = holidays
    .filter(h => h.date.toDate() >= today)
    .slice(0, 3)

  const totalHolidays  = holidays.length
  const upcomingCount  = upcomingHolidays.length

  const selectedDayHolidays = selectedDay
    ? holidays.filter(h => sameDay(h.date.toDate(), selectedDay))
    : []

  const listHolidays = viewAll ? holidays : holidaysThisMonth

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch { setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  // ── Sidebar nav ─────────────────────────────────────────────────────────────
  const navItems = [
  { href: '/employee/dashboard',        icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard'        },
{ href: '/employee/MyProfile', icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />, label: 'My Profile' },
    {href: '/employee/leaves', icon: <BeachAccessRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Leave Requests'   },
  { href: '/employee/holiday-calendar', icon: <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />, label: 'Holiday Calendar' },
  { href: '/employee/daily-status',     icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Daily Status'     },
]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center">
            <CalendarMonthRoundedIcon sx={{ fontSize: 48, color: '#3b82f6' }} />
            <h2 className="text-xl font-bold text-slate-900 mt-3 mb-1">Come Back Soon!</h2>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={logoutLoading}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
              >
                {logoutLoading ? 'Signing out…' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
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
              <p className="font-extrabold text-slate-900 text-sm leading-tight">SeyonSync</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Employee Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
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

        {/* User + logout */}
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
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Topbar (no notification, no profile) ────────────────────────── */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>

          {/* Title + date */}
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Holiday Calendar</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Export to PDF + calendar icon only */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors">
              <PictureAsPdfRoundedIcon sx={{ fontSize: 15 }} />
              Export to PDF
            </button>
            <button className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
              <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />
            </button>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col xl:flex-row gap-6">

            {/* ── LEFT: Calendar ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Calendar card */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                {/* Calendar header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={prevMonth}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <ChevronLeftRoundedIcon sx={{ fontSize: 20, color: '#475569' }} />
                    </button>

                    {/* Month / Year selects */}
                    <div className="flex items-center gap-2">
                      <select
                        value={currentMonth}
                        onChange={e => setCurrentMonth(Number(e.target.value))}
                        className="text-sm font-bold text-slate-800 bg-transparent border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select
                        value={currentYear}
                        onChange={e => setCurrentYear(Number(e.target.value))}
                        className="text-sm font-bold text-slate-800 bg-transparent border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={nextMonth}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <ChevronRightRoundedIcon sx={{ fontSize: 20, color: '#475569' }} />
                    </button>
                  </div>

                  {/* Today button only */}
                  <button
                    onClick={goToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <TodayRoundedIcon sx={{ fontSize: 15 }} />
                    Today
                  </button>
                </div>

                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 border-b border-slate-50">
                  {DAYS.map(d => (
                    <div key={d} className={`py-3 text-center text-[11px] font-bold uppercase tracking-wider
                      ${d === 'Sun' ? 'text-rose-400' : 'text-slate-400'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                {loading ? (
                  <div className="flex items-center justify-center h-56">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7">
                    {/* Empty cells before month start */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-slate-50 bg-slate-50/50" />
                    ))}

                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const date       = new Date(currentYear, currentMonth, day)
                      const isToday    = sameDay(date, today)
                      const isSun      = isSunday(day)
                      const dayHols    = getHolidaysForDay(day)
                      const isSelected = selectedDay && sameDay(date, selectedDay)
                      const isPast     = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())

                      return (
                        <div
                          key={day}
                          onClick={() => setSelectedDay(isSelected ? null : date)}
                          className={`
                            min-h-[72px] border-b border-r border-slate-50 p-2 cursor-pointer
                            transition-all duration-150 group relative
                            ${isSelected  ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}
                            ${!isSelected && !isSun ? 'hover:bg-slate-50' : ''}
                            ${isSun && !isSelected  ? 'bg-rose-50/40 hover:bg-rose-50'  : ''}
                            ${isPast && !isToday    ? 'opacity-60' : ''}
                          `}
                        >
                          {/* Date number */}
                          <div className={`
                            w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1
                            ${isToday    ? 'bg-blue-600 text-white shadow-md shadow-blue-300' :
                              isSun      ? 'text-rose-500' :
                              isSelected ? 'bg-blue-100 text-blue-700' :
                                           'text-slate-700 group-hover:text-slate-900'}
                          `}>
                            {day}
                          </div>

                          {/* Holiday dots */}
                          <div className="space-y-0.5">
                            {dayHols.slice(0, 2).map((h, j) => (
                              <div key={j} className="flex items-center gap-1 truncate">
                                <HolidayDot type={h.type} />
                                <span className="text-[10px] font-medium text-slate-600 truncate leading-tight">
                                  {h.name}
                                </span>
                              </div>
                            ))}
                            {dayHols.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{dayHols.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Trailing empty cells */}
                    {(() => {
                      const totalCells = firstDayOfWeek + daysInMonth
                      const remainder  = totalCells % 7
                      const trailing   = remainder === 0 ? 0 : 7 - remainder
                      return Array.from({ length: trailing }).map((_, i) => (
                        <div key={`trail-${i}`} className="min-h-[72px] border-b border-r border-slate-50 bg-slate-50/30" />
                      ))
                    })()}
                  </div>
                )}
              </div>

              {/* Selected day detail */}
              {selectedDay && selectedDayHolidays.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <EmojiEventsRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">
                      {selectedDay.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {selectedDayHolidays.map((h, i) => {
                      const cfg = getTypeConfig(h.type)
                      return (
                        <div key={i} className="flex items-center gap-2 mt-1">
                          <HolidayDot type={h.type} />
                          <span className="text-sm font-semibold text-blue-800">{h.name}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${cfg.badge} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Holiday List Table ──────────────────────────────────────── */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <ViewListRoundedIcon sx={{ fontSize: 20, color: '#64748b' }} />
                    <h2 className="text-base font-extrabold text-slate-900">
                      Holiday List – {currentYear}
                    </h2>
                  </div>
                  <button
                    onClick={() => setViewAll(v => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {viewAll ? 'This Month' : 'View All'}
                    <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Day</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Holiday Name</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Loading…</td>
                        </tr>
                      ) : listHolidays.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10">
                            <CalendarMonthRoundedIcon sx={{ fontSize: 36, color: '#cbd5e1' }} />
                            <p className="text-slate-400 text-sm mt-2">No holidays {viewAll ? 'found' : 'this month'}</p>
                          </td>
                        </tr>
                      ) : (
                        listHolidays.map((h, i) => {
                          const d   = h.date.toDate()
                          const cfg = getTypeConfig(h.type)
                          return (
                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3 font-semibold text-slate-700">
                                {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {d.toLocaleDateString('en-US', { weekday: 'long' })}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{h.name}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.badge} ${cfg.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                  {!loading && listHolidays.length > 0 && (
                    <p className="text-xs text-slate-400 px-6 py-3 border-t border-slate-50">
                      Showing 1 to {listHolidays.length} of {listHolidays.length} entries
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* ── RIGHT: Sidebar Panel ─────────────────────────────────────── */}
            <div className="w-full xl:w-72 space-y-4 shrink-0">

              {/* Upcoming Holidays */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-slate-900">Upcoming Holidays</h3>
                  <button
                    onClick={() => setViewAll(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
                    </div>
                  ) : upcomingHolidays.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No upcoming holidays</p>
                  ) : (
                    upcomingHolidays.map((h, i) => {
                      const d   = h.date.toDate()
                      const cfg = getTypeConfig(h.type)
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
                          onClick={() => { setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); setSelectedDay(d) }}
                        >
                          {/* Date bubble */}
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${cfg.badge}`}>
                            <span className={`text-xs font-bold uppercase ${cfg.text}`}>
                              {d.toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span className={`text-lg font-black leading-tight ${cfg.text}`}>
                              {String(d.getDate()).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{h.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-0.5 ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">Legend</h3>
                <div className="space-y-2.5">
                  {(Object.entries(TYPE_CONFIG) as [HolidayType, typeof TYPE_CONFIG[HolidayType]][]).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0`} />
                      <span className="text-sm text-slate-600 font-medium">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holiday Summary */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-5 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} className="opacity-70" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    Holiday Summary – {currentYear}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-black">{loading ? '—' : totalHolidays}</p>
                    <p className="text-[11px] text-blue-200 font-semibold mt-0.5">Total Holidays</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-black">{loading ? '—' : upcomingCount}</p>
                    <p className="text-[11px] text-blue-200 font-semibold mt-0.5">Upcoming</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function HolidayCalendarPage() {
  return (
    <ProtectedRoute requiredRole="employee">
      <HolidayCalendarContent />
    </ProtectedRoute>
  )
}