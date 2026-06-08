'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'
import {
  collection, addDoc, updateDoc, doc,
  query, where, orderBy, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

import DashboardRoundedIcon     from '@mui/icons-material/DashboardRounded'
import AccessTimeRoundedIcon    from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon     from '@mui/icons-material/EventNoteRounded'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import LogoutRoundedIcon        from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon          from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon   from '@mui/icons-material/FingerprintRounded'
import AssignmentRoundedIcon    from '@mui/icons-material/AssignmentRounded'
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded'
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded'
import WarningRoundedIcon       from '@mui/icons-material/WarningRounded'
import SaveRoundedIcon          from '@mui/icons-material/SaveRounded'
import EditNoteRoundedIcon      from '@mui/icons-material/EditNoteRounded'
import TodayRoundedIcon         from '@mui/icons-material/TodayRounded'
import BlockRoundedIcon         from '@mui/icons-material/BlockRounded'
import HistoryRoundedIcon       from '@mui/icons-material/HistoryRounded'
import InfoOutlinedIcon         from '@mui/icons-material/InfoOutlined'
import LockRoundedIcon          from '@mui/icons-material/LockRounded'
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'

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

// ✅ IST-safe local date string — avoids UTC drift from toISOString()
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayStr(): string {
  return toLocalDateStr(new Date())
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
async function fetchReportByDate(userId: string, dateStr: string): Promise<DailyStatusReport | null> {
  const start = new Date(dateStr + 'T00:00:00')
  const end   = new Date(dateStr + 'T23:59:59')
  const q = query(
    collection(db, 'dailyStatus'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc'),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as DailyStatusReport
}

async function fetchRecentReports(userId: string): Promise<DailyStatusReport[]> {
  const q = query(
    collection(db, 'dailyStatus'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() } as DailyStatusReport))
}

async function saveReport(
  data: Omit<DailyStatusReport, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const now = Timestamp.now()
    if (existingId) {
      await updateDoc(doc(db, 'dailyStatus', existingId), {
        taskTitle:    data.taskTitle,
        workSummary:  data.workSummary,
        tomorrowPlan: data.tomorrowPlan,
        blockers:     data.blockers,
        updatedAt:    now,
      })
      return { ok: true, id: existingId }
    }
    const ref = await addDoc(collection(db, 'dailyStatus'), { ...data, createdAt: now, updatedAt: now })
    return { ok: true, id: ref.id }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Save failed' }
  }
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function formatDateShort(ts: Timestamp): string {
  try {
    return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function wordCount(text: string): number {
  return text?.trim() ? text.trim().split(/\s+/).length : 0
}

const MAX_WORDS = 800

// ── Sub-components ────────────────────────────────────────────────────────────
function WordCounter({ text, max }: { text: string; max: number }) {
  const count = wordCount(text)
  const over  = count > max
  return (
    <span className={`text-[11px] font-bold tabular-nums ${
      over ? 'text-red-500' : count > max * 0.8 ? 'text-amber-500' : 'text-slate-400'
    }`}>
      {count} / {max} words
    </span>
  )
}

function RecentReportCard({
  report,
  onClick,
}: {
  report: DailyStatusReport
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left group px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-200"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
          <AssignmentRoundedIcon sx={{ fontSize: 14, color: '#3b82f6' }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate leading-tight">
            {report.taskTitle || 'Untitled'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatDateShort(report.date)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
            {report.workSummary?.substring(0, 60)}…
          </p>
        </div>
      </div>
    </button>
  )
}

function LogoutBlockModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
            <LockRoundedIcon sx={{ fontSize: 32, color: '#d97706' }} />
          </div>
        </div>
        <h2 className="text-lg font-extrabold text-slate-900 text-center">Cannot Logout Yet</h2>
        <p className="text-sm text-slate-500 text-center mt-2 leading-relaxed">
          You must submit your{' '}
          <strong className="text-slate-700">Daily Status Update</strong> for today before logging out.
        </p>
        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
          {[
            'Fill in your work summary for today',
            'Click "Save Update" to submit',
            'Then you can logout successfully',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-amber-800 font-semibold">
              <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black shrink-0">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          Got it, I'll submit first
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
function DailyStatusContent() {
  const { userProfile, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const today    = getTodayStr()

  const [sidebarOpen,     setSidebarOpen]     = useState(true)
  const [date,            setDate]            = useState(today)
  const [taskTitle,       setTaskTitle]       = useState('')
  const [workSummary,     setWorkSummary]     = useState('')
  const [tomorrowPlan,    setTomorrowPlan]    = useState('')
  const [blockers,        setBlockers]        = useState('')
  const [existingId,      setExistingId]      = useState<string | undefined>()
  const [isEditing,       setIsEditing]       = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [saveMsg,         setSaveMsg]         = useState('')
  const [saveErrMsg,      setSaveErrMsg]      = useState('')
  const [recentReports,   setRecentReports]   = useState<DailyStatusReport[]>([])
  const [loadingRecent,   setLoadingRecent]   = useState(true)
  const [todaySubmitted,  setTodaySubmitted]  = useState(false)
  const [showLogoutBlock, setShowLogoutBlock] = useState(false)

  const isToday   = date === today
  const hasReport = !!existingId
  const canEdit   = !hasReport || isEditing
  const overLimit = wordCount(workSummary) > MAX_WORDS

  // Load report for selected date
  useEffect(() => {
    if (!userProfile?.uid) return
    setLoading(true)
    setExistingId(undefined)
    setTaskTitle(''); setWorkSummary(''); setTomorrowPlan(''); setBlockers('')
    setIsEditing(false)
    fetchReportByDate(userProfile.uid, date).then(r => {
      if (r) {
        setExistingId(r.id)
        setTaskTitle(r.taskTitle || '')
        setWorkSummary(r.workSummary || '')
        setTomorrowPlan(r.tomorrowPlan || '')
        setBlockers(r.blockers || '')
        if (date === today) setTodaySubmitted(true)
      } else {
        if (date === today) setTodaySubmitted(false)
      }
      setLoading(false)
    })
  }, [userProfile?.uid, date])

  // Load recent reports (refresh after save)
  useEffect(() => {
    if (!userProfile?.uid) return
    fetchRecentReports(userProfile.uid).then(r => {
      setRecentReports(r)
      setLoadingRecent(false)
    })
  }, [userProfile?.uid, saveMsg])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userProfile?.uid) return
    if (!taskTitle.trim())   { setSaveErrMsg('Task title is required.');          setTimeout(() => setSaveErrMsg(''), 4000); return }
    if (!workSummary.trim()) { setSaveErrMsg('Work summary is required.');        setTimeout(() => setSaveErrMsg(''), 4000); return }
    if (overLimit)           { setSaveErrMsg(`Exceeds ${MAX_WORDS} word limit.`); setTimeout(() => setSaveErrMsg(''), 4000); return }

    setSaving(true)
    const result = await saveReport(
      {
        userId:      userProfile.uid,
        userName:    userProfile.name,
        date:        Timestamp.fromDate(new Date(date + 'T' + new Date().toTimeString().slice(0, 8))),
        taskTitle:   taskTitle.trim(),
        workSummary: workSummary.trim(),
        tomorrowPlan: tomorrowPlan.trim(),
        blockers:    blockers.trim(),
      },
      existingId,
    )
    setSaving(false)

    if (result.ok) {
      setExistingId(result.id)
      setIsEditing(false)
      setSaveMsg(existingId ? 'Status updated successfully!' : 'Status saved successfully!')
      setSaveErrMsg('')
      setTimeout(() => setSaveMsg(''), 4000)
      if (date === today) setTodaySubmitted(true)
    } else {
      setSaveErrMsg(result.error ?? 'Save failed.')
      setTimeout(() => setSaveErrMsg(''), 5000)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (!existingId) {
      setTaskTitle(''); setWorkSummary(''); setTomorrowPlan(''); setBlockers('')
    }
  }

  const handleLogout = async () => {
    if (!todaySubmitted) { setDate(today); setShowLogoutBlock(true); return }
    await signOut()
    router.push('/')
  }

  // ── Nav items ─────────────────────────────────────────────────────────────────
  const navItems = [
    { href: '/employee/dashboard',        icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,        label: 'Dashboard'        },
    { href: '/employee/MyProfile',          icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,            label: 'My Profile'       },
    // { href: '/employee/leaves',           icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,         label: 'Leave Requests'   },
    { href: '/employee/holiday-calendar', icon: <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Holiday Calendar' },
    { href: '/employee/daily-status',     icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,        label: 'Daily Status'     },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {showLogoutBlock && <LogoutBlockModal onClose={() => setShowLogoutBlock(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

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
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Menu</p>
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-full
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 pointer-events-none'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
              </Link>
            )
          })}

          {/* Recent Reports */}
          <div className="pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-2 flex items-center gap-1.5">
              <HistoryRoundedIcon sx={{ fontSize: 12 }} />Recent Reports
            </p>
            {loadingRecent ? (
              <div className="flex justify-center py-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentReports.length === 0 ? (
              <p className="text-[11px] text-slate-400 px-3 font-medium">No reports yet</p>
            ) : (
              <div className="space-y-1.5 px-1">
                {recentReports.map(r => (
                  <RecentReportCard
                    key={r.id}
                    report={r}
                    onClick={() => {
                      // ✅ IST-safe: use local date instead of toISOString() which drifts in UTC+5:30
                      const d = r.date.toDate()
                      setDate(toLocalDateStr(d))
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User + Logout */}
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
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm ${
              todaySubmitted ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-400 hover:bg-amber-500'
            }`}
            title={!todaySubmitted ? "Submit today's daily status to unlock logout" : ''}
          >
            {todaySubmitted
              ? <LogoutRoundedIcon sx={{ fontSize: 18 }} />
              : <LockRoundedIcon sx={{ fontSize: 18 }} />}
            {todaySubmitted ? 'Sign Out' : 'Submit to Logout'}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ── */}
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
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Daily Status Update</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <CalendarTodayRoundedIcon sx={{ fontSize: 12 }} />Dashboard / Daily Status Update
            </p>
          </div>
          {isToday && (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold ${
              todaySubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {todaySubmitted
                ? <><CheckCircleRoundedIcon sx={{ fontSize: 13 }} />Today Submitted</>
                : <><WarningRoundedIcon sx={{ fontSize: 13 }} />Not Submitted</>}
            </span>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Logout warning banner */}
            {!todaySubmitted && isToday && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <LockRoundedIcon sx={{ fontSize: 18, color: '#d97706', flexShrink: 0, mt: '1px' }} />
                <div>
                  <p className="text-sm font-bold text-amber-800">Daily Status Required to Logout</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Submit today's work summary below before you can sign out.
                  </p>
                </div>
              </div>
            )}

            {saveMsg && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 font-semibold">
                <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />{saveMsg}
              </div>
            )}
            {saveErrMsg && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-semibold">
                <WarningRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />{saveErrMsg}
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <EditNoteRoundedIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm">Update Your Daily Work Status</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Record your work summary, plans, and any blockers
                  </p>
                </div>
                {hasReport && !isEditing && (
                  <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full">
                    <CheckCircleRoundedIcon sx={{ fontSize: 12 }} />Submitted
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-slate-500 text-sm font-medium">Loading…</span>
                </div>
              ) : (
                <div className="p-6 space-y-5">

                  {/* Date + Task Title row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Date
                      </label>
                      <div className="relative">
                        <CalendarTodayRoundedIcon
                          sx={{ fontSize: 14 }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="date"
                          value={date}
                          max={today}
                          onChange={e => setDate(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none font-semibold"
                        />
                      </div>
                      {isToday && (
                        <p className="text-[10px] text-blue-500 font-bold mt-1 flex items-center gap-1">
                          <TodayRoundedIcon sx={{ fontSize: 11 }} />Today
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Task Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Holiday Calendar Development"
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Work Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Work Summary (Today's Work)
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: '#94a3b8', ml: '4px', verticalAlign: 'middle' }} />
                      </label>
                      <WordCounter text={workSummary} max={MAX_WORDS} />
                    </div>
                    <textarea
                      rows={6}
                      placeholder="Describe what you worked on today…"
                      value={workSummary}
                      onChange={e => setWorkSummary(e.target.value)}
                      disabled={!canEdit}
                      className={`w-full px-3 py-2.5 border rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none placeholder:text-slate-300 resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
                        overLimit ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {overLimit && (
                      <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <WarningRoundedIcon sx={{ fontSize: 12 }} />Exceeds {MAX_WORDS} word limit
                      </p>
                    )}
                  </div>

                  {/* Tomorrow's Plan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tomorrow's Plan
                    </label>
                    <textarea
                      rows={3}
                      placeholder="What do you plan to work on tomorrow?"
                      value={tomorrowPlan}
                      onChange={e => setTomorrowPlan(e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-300 resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Blockers */}
                  {/* <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Blockers / Issues (if any)
                      </label>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full">
                        <BlockRoundedIcon sx={{ fontSize: 10 }} />Optional
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="e.g. No blockers at the moment."
                      value={blockers}
                      onChange={e => setBlockers(e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-300 resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div> */}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {hasReport && !isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
                      >
                        <EditNoteRoundedIcon sx={{ fontSize: 16 }} />Edit Update
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving || overLimit}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
                        >
                          <SaveRoundedIcon sx={{ fontSize: 16 }} />
                          {saving ? 'Saving…' : 'Save Update'}
                        </button>
                      </>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Info tip */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
              <InfoOutlinedIcon sx={{ fontSize: 16, color: '#7c3aed', flexShrink: 0, mt: '1px' }} />
              <p className="text-[12px] text-blue-700 font-medium leading-relaxed">
                Submit your daily status to unlock the logout button. To update a submitted report, click{' '}
                <strong>Edit Update</strong>. Past dates are also editable.
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}

export default function DailyStatusPage() {
  return (
    <ProtectedRoute requiredRole="employee">
      <DailyStatusContent />
    </ProtectedRoute>
  )
}