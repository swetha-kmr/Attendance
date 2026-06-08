'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'
import {
  collection, query, orderBy, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

import DashboardRoundedIcon      from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon         from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon     from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon      from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon       from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon           from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon    from '@mui/icons-material/FingerprintRounded'
import AssignmentRoundedIcon     from '@mui/icons-material/AssignmentRounded'
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded'
import VisibilityRoundedIcon     from '@mui/icons-material/VisibilityRounded'
import DateRangeRoundedIcon      from '@mui/icons-material/DateRangeRounded'
import FilterListRoundedIcon     from '@mui/icons-material/FilterListRounded'
import PeopleAltRoundedIcon      from '@mui/icons-material/PeopleAltRounded'
import CalendarTodayRoundedIcon  from '@mui/icons-material/CalendarTodayRounded'
import EditNoteRoundedIcon       from '@mui/icons-material/EditNoteRounded'
import ChevronLeftRoundedIcon    from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon   from '@mui/icons-material/ChevronRightRounded'
import FirstPageRoundedIcon      from '@mui/icons-material/FirstPageRounded'
import LastPageRoundedIcon       from '@mui/icons-material/LastPageRounded'
import BlockRoundedIcon          from '@mui/icons-material/BlockRounded'
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded'
import RefreshRoundedIcon        from '@mui/icons-material/RefreshRounded'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DailyStatusReport {
  id?: string
  userId: string
  userName: string
  date: Timestamp
  taskTitle: string
  workSummary: string
  tomorrowPlan: string
  blockers: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateShort(ts: Timestamp): string {
  try { return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}
function formatTime(ts?: Timestamp): string {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

// ✅ LOCAL date — avoids UTC off-by-one in IST (+5:30)
function toDateStr(ts: Timestamp): string {
  try {
    const d = ts.toDate()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  } catch { return '' }
}

// ✅ LOCAL today — never use toISOString() which is UTC
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function wordCount(text: string): number {
  return text?.trim() ? text.trim().split(/\s+/).length : 0
}
function getInitials(name: string): string {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const DEPARTMENTS       = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design']
const PAGE_SIZE_OPTIONS = [8, 10, 20, 50]

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600',
]
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient, iconBg }: {
  icon: React.ReactNode; label: string; value: number | string; sub: string; gradient: string; iconBg: string
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

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange }: {
  currentPage: number; totalPages: number; pageSize: number; totalItems: number
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end   = Math.min(currentPage * pageSize, totalItems)
  const pages = (): number[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages].filter(p => p > 0)
    return [currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2]
  }
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{start}–{end}</span> of <span className="font-bold text-slate-700">{totalItems}</span>
        </p>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
          className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:outline-none"
        >
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
          <FirstPageRoundedIcon sx={{ fontSize: 16 }} />
        </button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeftRoundedIcon sx={{ fontSize: 16 }} />
        </button>
        {pages().map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
              p === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
          <LastPageRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  )
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ report, onClose }: { report: DailyStatusReport | null; onClose: () => void }) {
  if (!report) return null
  const wc = wordCount(report.workSummary)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white flex items-start justify-between px-6 py-5 border-b border-slate-100 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(report.userName)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {getInitials(report.userName)}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">{report.userName}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <CalendarTodayRoundedIcon sx={{ fontSize: 11 }} />
                {formatDateShort(report.date)}
                {report.updatedAt && <span className="ml-2">· Updated {formatTime(report.updatedAt)}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <CloseRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Task Title</p>
            <p className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">{report.taskTitle || '—'}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Summary</p>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{wc} words</span>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">{report.workSummary || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tomorrow's Plan</p>
            <p className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">{report.tomorrowPlan || '—'}</p>
          </div>
          {/* <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BlockRoundedIcon sx={{ fontSize: 11 }} />Blockers / Issues
            </p>
            <p className={`text-sm px-3 py-2.5 rounded-xl border leading-relaxed ${
              report.blockers && report.blockers.toLowerCase() !== 'no blockers at the moment.'
                ? 'text-amber-700 bg-amber-50 border-amber-100'
                : 'text-slate-500 bg-slate-50 border-slate-100'
            }`}>
              {report.blockers || 'No blockers'}
            </p>
          </div> */}
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function AdminDailyStatusContent() {
  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const today = localToday()

  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [reports,      setReports]      = useState<DailyStatusReport[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState('')
  const [viewReport,   setViewReport]   = useState<DailyStatusReport | null>(null)

  // ✅ FIX: Default start date = 30 days ago so data is visible immediately.
  // Admin can narrow down using filters. No data is pre-filtered away on mount.
  const thirtyDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 29)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  const [startDate,  setStartDate]  = useState(thirtyDaysAgo)
  const [endDate,    setEndDate]    = useState(today)
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [currentPage,setCurrentPage]= useState(1)
  const [pageSize,   setPageSize]   = useState(8)

  // ── ✅ KEY FIX: Use getDocs instead of onSnapshot ─────────────────────────
  // onSnapshot can silently fail when Firestore security rules block reads
  // for some documents. getDocs surfaces the error clearly so we can debug.
  const fetchAllReports = async () => {
    setLoading(true)
    setFetchError('')
    try {
      const q    = query(collection(db, 'dailyStatus'), orderBy('date', 'desc'))
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyStatusReport))
      setReports(data)
      console.log(`[AdminDailyStatus] Fetched ${data.length} total reports`)
    } catch (err: any) {
      console.error('[AdminDailyStatus] Firestore fetch error:', err)
      setFetchError(err?.message ?? 'Failed to load reports. Check Firestore rules.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllReports() }, [])

  useEffect(() => { setCurrentPage(1) }, [startDate, endDate, searchTerm, deptFilter])

  // ── ✅ Filter: exclude only the admin's own userId ────────────────────────
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return reports.filter(r => {
      // Exclude admin's own reports
      if (r.userId === userProfile?.uid) return false

      const d           = toDateStr(r.date)
      const inRange     = d >= startDate && d <= endDate
      const matchSearch = term === '' ||
        r.userName?.toLowerCase().includes(term) ||
        r.taskTitle?.toLowerCase().includes(term)

      return inRange && matchSearch
    })
  }, [reports, startDate, endDate, searchTerm, userProfile?.uid])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated      = useMemo(() =>
    filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  )

  const employeeReports = reports.filter(r => r.userId !== userProfile?.uid)
  const todayReports    = employeeReports.filter(r => toDateStr(r.date) === today).length
  const uniqueEmployees = new Set(filtered.map(r => r.userId)).size
  const avgWords        = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + wordCount(r.workSummary), 0) / filtered.length) : 0

  const activeFilterCount  = [searchTerm.trim() !== '', deptFilter !== 'all'].filter(Boolean).length
  const handleClearFilters = () => { setSearchTerm(''); setDeptFilter('all') }
  const handleLogout       = async () => { await signOut(); router.push('/') }

  const isRange = startDate !== endDate

  const navItems = [
    { href: '/admin/dashboard',    icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Dashboard'      },
    { href: '/admin/employees',    icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,      label: 'Employees'      },
    { href: '/admin/attendance',   icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Attendance'     },
    // { href: '/admin/leaves',       icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Leave Requests' },
    { href: '/admin/daily-status', icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Daily Status'   },
    { href: '/admin/settings',     icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Settings'       },
  ]
  const activeHref = '/admin/daily-status'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      <ViewModal report={viewReport} onClose={() => setViewReport(null)} />

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
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Menu</p>
          {navItems.map(item => {
            const isActive = item.href === activeHref
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-full ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 pointer-events-none'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}>
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
              {userProfile?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{userProfile?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-slate-400 truncate">{userProfile?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm">
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Manage Daily Status Updates</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <AssignmentRoundedIcon sx={{ fontSize: 12 }} />Dashboard / Daily Status Updates
            </p>
          </div>
          {/* Refresh button */}
          <button onClick={fetchAllReports} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50">
            <RefreshRoundedIcon sx={{ fontSize: 15, className: loading ? 'animate-spin' : '' }} />Refresh
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Firestore error banner ── */}
          {fetchError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">Failed to load reports</p>
                <p className="text-xs text-red-600 mt-1">{fetchError}</p>
                <p className="text-xs text-red-500 mt-2 font-medium">
                  Fix: In Firestore → Rules, ensure admin role can read <code>dailyStatus</code> collection.
                  Example rule: <code>allow read: if request.auth.token.role == 'admin';</code>
                </p>
              </div>
              <button onClick={fetchAllReports} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Retry</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<AssignmentRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />}
              label="Total Reports" value={filtered.length} sub="in selected range"
              gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900" iconBg="bg-blue-200" />
            <StatCard
              icon={<CalendarTodayRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />}
              label="Today" value={todayReports} sub="submitted today"
              gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard
              icon={<PeopleAltRoundedIcon sx={{ fontSize: 20, color: '#7c3aed' }} />}
              label="Employees" value={uniqueEmployees} sub="unique reporters"
              gradient="bg-gradient-to-br from-violet-50 to-violet-100 text-violet-900" iconBg="bg-violet-200" />
            <StatCard
              icon={<TrendingUpRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />}
              label="Avg Words" value={avgWords} sub="per report"
              gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900" iconBg="bg-amber-200" />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <FilterListRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <h2 className="font-extrabold text-slate-900 text-sm">Filter Reports</h2>
              <span className="ml-2 text-[11px] text-slate-400 font-medium">
                {employeeReports.length} total employee reports in Firestore
              </span>
              {activeFilterCount > 0 && (
                <>
                  <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount} active</span>
                  <button onClick={handleClearFilters} className="ml-auto text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline">Clear filters</button>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" value={startDate} max={endDate}
                  onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                <input type="date" value={endDate} min={startDate} max={today}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
                <div className="relative">
                  <SearchRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="text" placeholder="Employee or task…" value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <CloseRoundedIcon sx={{ fontSize: 14 }} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Quick date ranges */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick:</span>
              {[
                { label: 'Today',        start: today, end: today },
                { label: 'Last 7 Days',  start: (() => { const d = new Date(); d.setDate(d.getDate()-6);  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(), end: today },
                { label: 'Last 30 Days', start: thirtyDaysAgo, end: today },
                { label: 'This Month',   start: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` })(), end: today },
                { label: 'All Time',     start: '2020-01-01', end: today },
              ].map(q => (
                <button key={q.label} onClick={() => { setStartDate(q.start); setEndDate(q.end) }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    startDate === q.start && endDate === q.end
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                  }`}>
                  {q.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-medium mt-3">
              Showing <span className="font-bold text-slate-700">{filtered.length}</span> of{' '}
              <span className="font-bold text-slate-700">{employeeReports.length}</span> employee reports
            </p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <EditNoteRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <h2 className="font-extrabold text-slate-900 text-sm">Daily Status Updates</h2>
              {isRange && (
                <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {startDate} → {endDate}
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400 font-medium">Page {currentPage} of {totalPages}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-500 text-sm font-medium">Loading reports…</span>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-sm text-red-400 font-medium">Could not load data</p>
                <button onClick={fetchAllReports} className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <AssignmentRoundedIcon sx={{ fontSize: 40 }} />
                <p className="text-sm mt-2 font-medium text-slate-400">
                  {employeeReports.length === 0
                    ? 'No employee reports in Firestore yet'
                    : `No reports in the selected date range (${startDate} → ${endDate})`}
                </p>
                {employeeReports.length > 0 && (
                  <button
                    onClick={() => { setStartDate('2020-01-01'); setEndDate(today) }}
                    className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">
                    Show All Time
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['#', 'Employee', 'Date', 'Task Title', 'Words', 'Updated At', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginated.map((report, idx) => {
                        const rowNum   = (currentPage - 1) * pageSize + idx + 1
                        const wc       = wordCount(report.workSummary)
                        const hasBlock = report.blockers &&
                          report.blockers.trim() !== '' &&
                          report.blockers.toLowerCase() !== 'no blockers at the moment.'
                        return (
                          <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 text-xs text-slate-400 font-bold">{rowNum}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(report.userName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                  {getInitials(report.userName)}
                                </div>
                                <p className="font-semibold text-xs text-slate-900 leading-tight">{report.userName}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
                                <DateRangeRoundedIcon sx={{ fontSize: 11 }} />
                                {formatDateShort(report.date)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-slate-800 max-w-[180px] truncate">{report.taskTitle || '—'}</p>
                                {hasBlock && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md whitespace-nowrap">
                                    <BlockRoundedIcon sx={{ fontSize: 10 }} />Blocker
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold ${wc > 600 ? 'text-emerald-600' : wc > 300 ? 'text-blue-600' : 'text-slate-400'}`}>
                                {wc}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                              {formatTime(report.updatedAt)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setViewReport(report)}
                                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all"
                                title="View report">
                                <VisibilityRoundedIcon sx={{ fontSize: 14 }} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage} totalPages={totalPages}
                  pageSize={pageSize} totalItems={filtered.length}
                  onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminDailyStatusPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDailyStatusContent />
    </ProtectedRoute>
  )
}