'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { UserProfile } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import {
  subscribeToUsers,
  subscribeToAttendance,
  subscribeToLeaveRequests,
    createAdminLeaveEntry,
  AttendanceRecord,
  LeaveRequest,
  c,
} from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'

// ── Firebase (holidays) ───────────────────────────────────────────────────────
import {
  collection, getDocs, addDoc, updateDoc, doc,deleteDoc,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── MUI Icons ─────────────────────────────────────────────────────────────────
import DashboardRoundedIcon      from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon         from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon     from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon      from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon       from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon           from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded'
import AssignmentRoundedIcon   from '@mui/icons-material/AssignmentRounded'
import FingerprintRoundedIcon    from '@mui/icons-material/FingerprintRounded'
import CheckCircleRoundedIcon    from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon         from '@mui/icons-material/CancelRounded'
import BeachAccessRoundedIcon    from '@mui/icons-material/BeachAccessRounded'
import HowToRegRoundedIcon       from '@mui/icons-material/HowToRegRounded'
import DownloadRoundedIcon       from '@mui/icons-material/DownloadRounded'
import FilterListRoundedIcon     from '@mui/icons-material/FilterListRounded'
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded'
import DateRangeRoundedIcon      from '@mui/icons-material/DateRangeRounded'
import ChevronLeftRoundedIcon    from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon   from '@mui/icons-material/ChevronRightRounded'
import FirstPageRoundedIcon      from '@mui/icons-material/FirstPageRounded'
import LastPageRoundedIcon       from '@mui/icons-material/LastPageRounded'
import EditRoundedIcon           from '@mui/icons-material/EditRounded'
import WeekendRoundedIcon        from '@mui/icons-material/WeekendRounded'
import CelebrationRoundedIcon    from '@mui/icons-material/CelebrationRounded'
import SaveRoundedIcon           from '@mui/icons-material/SaveRounded'
import WarningRoundedIcon        from '@mui/icons-material/WarningRounded'
import WarningAmberRoundedIcon   from '@mui/icons-material/WarningAmberRounded'
import HistoryRoundedIcon        from '@mui/icons-material/HistoryRounded'

// ── Holiday Types ─────────────────────────────────────────────────────────────
export type HolidayType = 'public' | 'festival' | 'national' | 'weekly_off'
export interface Holiday {
  id?: string
  name: string
  date: Timestamp
  type: HolidayType
}

// FIX: Any holiday doc whose `type` field is missing, misspelled, wrong-cased,
// or otherwise not one of the four valid HolidayType values gets normalized to
// 'public' here — at the data-fetch boundary — instead of crashing later when
// HOLIDAY_CFG[type] is looked up and comes back undefined.
const VALID_HOLIDAY_TYPES: HolidayType[] = ['public', 'festival', 'national', 'weekly_off']
function normalizeHolidayType(t: unknown): HolidayType {
  return VALID_HOLIDAY_TYPES.includes(t as HolidayType) ? (t as HolidayType) : 'public'
}

async function fetchHolidaysByRange(start: Date, end: Date): Promise<Holiday[]> {
  const q = query(
    collection(db, c('holidays')),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, ...data, type: normalizeHolidayType(data.type) } as Holiday
  })
}

// ── Audit Log ──────────────────────────────────────────────────────────────────
// Every admin edit to an attendance record writes one entry here so we always
// know WHO changed WHAT, and WHEN. This is a separate collection —
// 'attendanceAuditLogs' — kept append-only (we never update/delete entries).
export interface AuditLogEntry {
  id?: string
  employeeUid: string
  employeeName: string
  date: string                 // YYYY-MM-DD of the attendance record that was edited
  changedByUid: string
  changedByName: string
  changedByEmail: string
  before: { status: string; checkIn: string; checkOut: string }
  after:  { status: string; checkIn: string; checkOut: string }
  timestamp: Timestamp | null  // serverTimestamp() resolves to a Timestamp once written
}

async function writeAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    await addDoc(collection(db, c('attendanceAuditLogs')), {
      ...entry,
      timestamp: serverTimestamp(),
    })
  } catch (err) {
    // Never let a logging failure block the actual attendance save — just
    // surface it in the console for debugging.
    console.error('Audit log write failed:', err)
  }
}

// Fetches the change history for one specific employee+date combo, newest first.
// NOTE: this needs a Firestore composite index on (employeeUid, date, timestamp desc) —
// Firestore will show a "create index" link in the console error the first time
// this query runs; click it once and the index builds automatically.
async function fetchAuditLogsForRecord(employeeUid: string, date: string): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, c('attendanceAuditLogs')),
    where('employeeUid', '==', employeeUid),
    where('date', '==', date),
    orderBy('timestamp', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry))
}

// ── NEW: All-employees auto-flag scan ─────────────────────────────────────────
// Scans EVERY active employee for previous-day attendance records that have a
// check-in but no checkout, and auto-flags them as 'absent'. This runs once
// whenever the admin opens this page.
//
// WHY THIS EXISTS: the employee dashboard already has a per-user version of
// this check (runs only when that specific employee opens their dashboard).
// On the free/Spark Firebase plan there's no scheduled Cloud Function to run
// this server-side every night, so if an employee never opens the app after
// missing a checkout, their record stays stuck as "present + In progress"
// forever. Running the same scan across all employees here — triggered by
// the admin simply visiting the Attendance page — closes that gap without
// needing Blaze/Cloud Functions.
async function autoFlagAllMissedCheckouts(employees: UserProfile[]): Promise<number> {
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  let flaggedCount = 0

  for (const emp of employees) {
    try {
      const q = query(
        collection(db, c('attendance')),
        where('uid', '==', emp.uid),
        where('checkOutTime', '==', null),
        where('date', '<', Timestamp.fromDate(todayMidnight)),
      )
      const snap = await getDocs(q)
      if (snap.empty) continue

      for (const d of snap.docs) {
        const data = d.data() as any
        // Skip records that are already flagged — avoids redundant writes
        // every time the admin revisits this page.
        if (data.status === 'absent' && data.autoFlagged) continue

        await updateDoc(doc(db, c('attendance'), d.id), {
          status: 'absent',
          autoFlagged: true,
        })
        flaggedCount++
      }
    } catch (err) {
      // Don't let one employee's failed query/update stop the rest of the scan.
      console.warn(`autoFlagAllMissedCheckouts failed for ${emp.uid}:`, err)
    }
  }
  return flaggedCount
}

const HOLIDAY_CFG: Record<HolidayType, { badge: string; text: string; dot: string; label: string }> = {
  public:     { badge: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Public Holiday'   },
  festival:   { badge: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Festival Holiday' },
  national:   { badge: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'National Holiday' },
  weekly_off: { badge: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400',   label: 'Weekly Off'       },
}

// ── Row status type ───────────────────────────────────────────────────────────
type RowStatus = 'Present' | 'Absent' | 'On Leave' | 'Holiday' | 'Weekly Off'

interface FlatRecord {
  uid: string
  name: string
  email: string
  department: string
  date: string          // YYYY-MM-DD
  checkIn: string
  checkOut: string
  workHours: string
  status: RowStatus
  firestoreId?: string  // attendance doc id (for editing)
  holidayName?: string  // if status === 'Holiday'
  holidayType?: HolidayType
  autoFlagged?: boolean // true when the system (not admin) marked this Absent because checkout was missed
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDateString(ts: Timestamp): string {
  try { return getLocalDateString(ts.toDate()) } catch { return '' }
}

function formatTime(ts: Timestamp | undefined | null): string {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
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
function isSundayStr(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 0
}
function sameDayStr(a: Date, dateStr: string): boolean {
  const b = new Date(dateStr + 'T00:00:00')
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function getLeaveUid(l: LeaveRequest): string {
  return (l as any).uid || (l as any).userId || ''
}
function exportCSV(rows: FlatRecord[], startDate: string, endDate: string) {
  const header = ['Name', 'Email', 'Department', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Auto-Flagged']
  const lines  = rows.map(r => [r.name, r.email, r.department, r.date, r.checkIn, r.checkOut, r.workHours, r.status, r.autoFlagged ? 'Yes' : 'No'].join(','))
  const blob   = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a'); a.href = url
  a.download   = startDate === endDate ? `attendance-${startDate}.csv` : `attendance-${startDate}-to-${endDate}.csv`
  a.click(); URL.revokeObjectURL(url)
}

const DEPARTMENTS       = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design']
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient, iconBg, onClick, active }: {
  icon: React.ReactNode; label: string; value: number | string; sub: string; gradient: string; iconBg: string
  onClick?: () => void; active?: boolean
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-2xl p-5 ${gradient} relative overflow-hidden group text-left w-full ${onClick ? 'cursor-pointer transition-all hover:-translate-y-0.5' : ''} ${active ? 'ring-2 ring-offset-2 ring-amber-400' : ''}`}
    >
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </Wrapper>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange }: {
  currentPage: number; totalPages: number; pageSize: number; totalItems: number
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem   = Math.min(currentPage * pageSize, totalItems)
  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2]
  }
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{startItem}–{endItem}</span> of <span className="font-bold text-slate-700">{totalItems}</span> records
        </p>
        <select value={pageSize} onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
          className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:outline-none">
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><FirstPageRoundedIcon sx={{ fontSize: 16 }} /></button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeftRoundedIcon sx={{ fontSize: 16 }} /></button>
        {getPageNumbers().map(p => (
          <button key={p} onClick={() => onPageChange(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>{p}</button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRightRoundedIcon sx={{ fontSize: 16 }} /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><LastPageRoundedIcon sx={{ fontSize: 16 }} /></button>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  record, onClose, onSave,
}: {
  record: FlatRecord | null
  onClose: () => void
  onSave: (record: FlatRecord, newCheckIn: string, newCheckOut: string, newStatus: RowStatus) => Promise<{ ok: boolean; error?: string }>
}) {
  const [status,   setStatus]   = useState<RowStatus>(record?.status   ?? 'Present')
  const [checkIn,  setCheckIn]  = useState(record?.checkIn  === '—' ? '' : record?.checkIn  ?? '')
  const [checkOut, setCheckOut] = useState(record?.checkOut === '—' ? '' : record?.checkOut ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (record) {
      setStatus(record.status)
      setCheckIn(record.checkIn   === '—' ? '' : record.checkIn)
      setCheckOut(record.checkOut === '—' ? '' : record.checkOut)
      setSaveError('')
    }
  }, [record])

  if (!record) return null

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    const result = await onSave(record, checkIn, checkOut, status)
    setSaving(false)
    if (result.ok) {
      onClose()
    } else {
      setSaveError(result.error ?? 'Save failed. Check Firestore rules.')
    }
  }

  const isNonEditable = record.status === 'Weekly Off' || record.status === 'Holiday'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Edit Attendance</h2>
            <p className="text-xs text-slate-400 mt-0.5">{record.name} · {formatDate(record.date)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <CloseRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
          </button>
        </div>

        {/* Auto-flagged notice */}
        {record.autoFlagged && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold flex items-start gap-2">
            <WarningAmberRoundedIcon sx={{ fontSize: 15, color: '#d97706', flexShrink: 0, mt: '1px' }} />
            <span>
              The employee checked in at <strong>{record.checkIn}</strong> but never checked out, so the system auto-marked this day
              as <strong>Absent</strong>. If this was just a forgotten checkout, set Status to <strong>Present</strong> and fill in the
              Check Out time below.
            </span>
          </div>
        )}

        {/* Non-editable notice */}
        {isNonEditable && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
            ⚠️ This day is a <strong>{record.status}</strong>. Status cannot be changed.
            {record.holidayName && <span> ({record.holidayName})</span>}
          </div>
        )}

        {!isNonEditable && (
          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Present', 'Absent', 'On Leave'] as RowStatus[]).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      status === s
                        ? s === 'Present'  ? 'bg-emerald-600 text-white border-emerald-600'
                        : s === 'Absent'   ? 'bg-red-500 text-white border-red-500'
                        :                   'bg-amber-500 text-white border-amber-500'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Check In / Out */}
            {status === 'Present' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Check In Time</label>
                  <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Check Out Time</label>
                  <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </>
            )}

            {/* Error */}
            {saveError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <WarningRoundedIcon sx={{ fontSize: 14, color: '#dc2626', flexShrink: 0, mt: '1px' }} />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm">
            Cancel
          </button>
          {!isNonEditable && (
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2">
              <SaveRoundedIcon sx={{ fontSize: 16 }} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({
  record, logs, loading, onClose,
}: {
  record: FlatRecord | null
  logs: AuditLogEntry[]
  loading: boolean
  onClose: () => void
}) {
  if (!record) return null

  const formatLogTime = (ts: Timestamp | null) => {
    if (!ts) return 'Just now'
    try { return ts.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Change History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{record.name} · {formatDate(record.date)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <CloseRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-slate-400 font-medium">No admin changes yet for this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-800">{log.changedByName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{formatLogTime(log.timestamp)}</p>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">{log.changedByEmail}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold text-[10px]">
                    {log.before.status} {log.before.checkIn !== '—' ? `· ${log.before.checkIn}–${log.before.checkOut}` : ''}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    {log.after.status} {log.after.checkIn !== '—' ? `· ${log.after.checkIn}–${log.after.checkOut}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ record }: { record: FlatRecord }) {
  if (record.status === 'Weekly Off') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
        <WeekendRoundedIcon sx={{ fontSize: 11 }} />Weekly Off
      </span>
    )
  }
  if (record.status === 'Holiday') {
    // FIX: guaranteed non-undefined cfg even if record.holidayType is missing
    // or holds an unexpected/invalid value — falls back to the 'public' config.
    const cfg = HOLIDAY_CFG[record.holidayType ?? 'public'] ?? HOLIDAY_CFG.public
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.badge} ${cfg.text}`}>
        <CelebrationRoundedIcon sx={{ fontSize: 11 }} />
        {cfg.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
      record.status === 'Present'  ? 'bg-emerald-100 text-emerald-700' :
      record.status === 'Absent'   ? 'bg-red-100 text-red-600'         :
      record.status === 'On Leave' ? 'bg-amber-100 text-amber-700'     :
                                     'bg-slate-100 text-slate-500'
    }`}>
      {(record.status === 'Present' || record.status === 'Absent') && (
        <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'Present' ? 'bg-emerald-500' : 'bg-red-400'}`} />
      )}
      {record.status}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function AttendanceContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users,       setUsers]       = useState<UserProfile[]>([])
  const [attendance,  setAttendance]  = useState<AttendanceRecord[]>([])
  const [leaves,      setLeaves]      = useState<LeaveRequest[]>([])
  const [holidays,    setHolidays]    = useState<Holiday[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editRecord,  setEditRecord]  = useState<FlatRecord | null>(null)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [saveErrMsg,  setSaveErrMsg]  = useState('')

  // Audit / change history modal state
  const [historyRecord, setHistoryRecord] = useState<FlatRecord | null>(null)
  const [historyLogs,    setHistoryLogs]    = useState<AuditLogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const openHistory = async (record: FlatRecord) => {
    setHistoryRecord(record)
    setHistoryLoading(true)
    try {
      const logs = await fetchAuditLogsForRecord(record.uid, record.date)
      setHistoryLogs(logs)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setHistoryLogs([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const today = getLocalDateString()

  const [startDate, setStartDate] = useState(today)
  const [endDate,   setEndDate]   = useState(today)

  const [empFilter,       setEmpFilter]       = useState('all')
  const [statusFilter,    setStatusFilter]    = useState('all')
  const [deptFilter,      setDeptFilter]      = useState('all')
  const [autoFlaggedOnly, setAutoFlaggedOnly] = useState(false)
  const [currentPage,     setCurrentPage]     = useState(1)
  const [pageSize,        setPageSize]        = useState(10)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  // ── NEW: auto-flag-all-employees scan ─────────────────────────────────────
  // Guards against running the scan more than once per page load.
  const [autoFlagRan, setAutoFlagRan] = useState(false)

  // ── Subscribe to Firestore ────────────────────────────────────────────────
  useEffect(() => {
    let count = 0
    const done = () => { count++; if (count === 3) setLoading(false) }
    const u1 = subscribeToUsers(d => { setUsers(d); done() })
    const u2 = subscribeToAttendance(d => { setAttendance(d); done() })
    const u3 = subscribeToLeaveRequests(d => { setLeaves(d); done() })
    return () => { u1(); u2(); u3() }
  }, [])

  // ── NEW: Runs once when `users` is populated. Scans every active employee
  // for missed checkouts from previous days and auto-flags them as Absent.
  // This replaces relying solely on each employee opening their own
  // dashboard — the admin visiting this page is enough to catch everyone.
  useEffect(() => {
    if (users.length === 0 || autoFlagRan) return
    const employees = users.filter(u => u.role === 'employee' && u.status === 'active')
    if (employees.length === 0) return

    setAutoFlagRan(true) // mark immediately so re-renders don't re-trigger this
    autoFlagAllMissedCheckouts(employees).then(count => {
      if (count > 0) {
        console.log(`Auto-flagged ${count} missed-checkout record(s)`)
        // No manual state update needed — subscribeToAttendance's realtime
        // listener will pick up the Firestore changes and refresh the UI.
      }
    })
  }, [users, autoFlagRan])

  // ── Load holidays whenever date range changes ─────────────────────────────
  useEffect(() => {
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T23:59:59')
    fetchHolidaysByRange(start, end).then(setHolidays)
  }, [startDate, endDate])

  useEffect(() => { setCurrentPage(1) }, [startDate, endDate, empFilter, statusFilter, deptFilter, autoFlaggedOnly])

  // ── Build flat records ────────────────────────────────────────────────────
  const records: FlatRecord[] = useMemo(() => {
    const employees = users.filter(u => u.role === 'employee' && u.status === 'active')

    const allDates: string[] = []
    const cursor   = new Date(startDate + 'T00:00:00')
    const rangeEnd = new Date(endDate   + 'T00:00:00')
    while (cursor <= rangeEnd) {
      allDates.push(getLocalDateString(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    const attMap = new Map<string, AttendanceRecord>()
    attendance
      .filter(a => { const d = toDateString(a.date); return d >= startDate && d <= endDate })
      .forEach(a => {
        const uid = (a as any).uid || (a as any).userId || ''
        const d   = toDateString(a.date)
        const key = `${uid}_${d}`
        const ex  = attMap.get(key)
        if (!ex) { attMap.set(key, a); return }
        try { if (a.date.toDate().getTime() > ex.date.toDate().getTime()) attMap.set(key, a) } catch { attMap.set(key, a) }
      })

    const onLeaveKeys = new Set<string>()
    leaves.filter(l => l.status === 'approved').forEach(l => {
      const uid = getLeaveUid(l)
      const ls  = toDateString(l.startDate)
      const le  = toDateString(l.endDate)
      allDates.forEach(d => { if (d >= ls && d <= le) onLeaveKeys.add(`${uid}_${d}`) })
    })

    const result: FlatRecord[] = []
    for (const emp of employees) {
      for (const date of allDates) {
        const key  = `${emp.uid}_${date}`
        const dept = emp.department || '—'

        if (isSundayStr(date)) {
          result.push({ uid: emp.uid, name: emp.name, email: emp.email, department: dept, date, checkIn: '—', checkOut: '—', workHours: '—', status: 'Weekly Off' })
          continue
        }
        const holiday = holidays.find(h => sameDayStr(h.date.toDate(), date))
        if (holiday) {
          result.push({ uid: emp.uid, name: emp.name, email: emp.email, department: dept, date, checkIn: '—', checkOut: '—', workHours: '—', status: 'Holiday', holidayName: holiday.name, holidayType: normalizeHolidayType(holiday.type) })
          continue
        }
        if (onLeaveKeys.has(key)) {
          result.push({ uid: emp.uid, name: emp.name, email: emp.email, department: dept, date, checkIn: '—', checkOut: '—', workHours: 'On Leave', status: 'On Leave' })
          continue
        }
        const att = attMap.get(key)
        if (att) {
          // System auto-marks a record Absent (status === 'absent', autoFlagged === true)
          // when the employee checked in but never checked out. Surface that distinctly
          // so admin knows this needs a human review, not a genuine no-show.
          const isAutoFlagged = (att as any).status === 'absent' && !!(att as any).autoFlagged
          const derivedStatus: RowStatus = (att as any).status === 'absent' ? 'Absent' : 'Present'
          result.push({
            uid: emp.uid, name: emp.name, email: emp.email, department: dept, date,
            checkIn:   formatTime(att.checkInTime),
            checkOut:  formatTime(att.checkOutTime),
            workHours: isAutoFlagged ? 'Missed checkout' : calcWorkHours(att.checkInTime, att.checkOutTime),
            status: derivedStatus,
            firestoreId: att.id,
            autoFlagged: isAutoFlagged,
          })
          continue
        }
        result.push({ uid: emp.uid, name: emp.name, email: emp.email, department: dept, date, checkIn: '—', checkOut: '—', workHours: '—', status: 'Absent' })
      }
    }
    return result
  }, [users, attendance, leaves, holidays, startDate, endDate])

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchesEmp    = empFilter    === 'all' || r.uid === empFilter
      const matchesStatus = statusFilter === 'all' || r.status.trim().toLowerCase() === statusFilter.trim().toLowerCase()
      const matchesDept   = deptFilter   === 'all' || r.department.trim().toLowerCase() === deptFilter.trim().toLowerCase()
      const matchesFlag   = !autoFlaggedOnly || !!r.autoFlagged
      return matchesEmp && matchesStatus && matchesDept && matchesFlag
    })
  }, [records, empFilter, statusFilter, deptFilter, autoFlaggedOnly])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const workingRecords    = records.filter(r => r.status !== 'Weekly Off' && r.status !== 'Holiday')
  const total              = workingRecords.length
  const present            = records.filter(r => r.status === 'Present').length
  const absent             = records.filter(r => r.status === 'Absent').length
  const onLeave            = records.filter(r => r.status === 'On Leave').length
  const weeklyOffs         = records.filter(r => r.status === 'Weekly Off').length
  const publicHolidays     = records.filter(r => r.status === 'Holiday').length
  const needsReviewCount   = records.filter(r => r.autoFlagged).length
  const attendancePct      = total > 0 ? Math.round((present / total) * 100) : 0

  const isRange         = startDate !== endDate
  const headerDateLabel = isRange
    ? `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} → ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : new Date(startDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const activeFilterCount = [empFilter !== 'all', statusFilter !== 'all', deptFilter !== 'all', autoFlaggedOnly].filter(Boolean).length
  const handleClearFilters = () => { setEmpFilter('all'); setStatusFilter('all'); setDeptFilter('all'); setAutoFlaggedOnly(false) }
  const handleLogout = async () => { await signOut(); router.push('/') }

  // ── Save edited record ────────────────────────────────────────────────────
  const handleSaveEdit = async (
    record: FlatRecord,
    newCheckIn: string,
    newCheckOut: string,
    newStatus: RowStatus,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const dateObj = new Date(record.date + 'T00:00:00')

      if (newStatus === 'On Leave') {
        await createAdminLeaveEntry(
          record.uid,
          record.name,
          record.date,
          userProfile!.uid,
        )
        if (record.firestoreId) {
          await deleteDoc(doc(db, c('attendance'), record.firestoreId))
        }

        await writeAuditLog({
          employeeUid: record.uid,
          employeeName: record.name,
          date: record.date,
          changedByUid: userProfile!.uid,
          changedByName: userProfile!.name ?? 'Admin',
          changedByEmail: userProfile!.email ?? '',
          before: { status: record.status, checkIn: record.checkIn, checkOut: record.checkOut },
          after:  { status: 'On Leave',     checkIn: '—',            checkOut: '—' },
        })

        setSaveMsg(`Marked ${record.name} as On Leave for ${formatDate(record.date)}`)
        setTimeout(() => setSaveMsg(''), 4000)
        return { ok: true }
      }

      const toTimestamp = (timeStr: string): Timestamp | null => {
        if (!timeStr) return null
        const [h, m] = timeStr.split(':').map(Number)
        const d = new Date(dateObj)
        d.setHours(h, m, 0, 0)
        return Timestamp.fromDate(d)
      }

      const checkInTs  = toTimestamp(newCheckIn)
      const checkOutTs = toTimestamp(newCheckOut)
      let workHours    = 0
      if (checkInTs && checkOutTs) {
        const ms = checkOutTs.toDate().getTime() - checkInTs.toDate().getTime()
        workHours = Math.max(0, Math.round((ms / 3600000) * 100) / 100)
      }

      const attStatus = newStatus === 'Present' ? 'present' : 'absent'

      if (record.firestoreId) {
        await updateDoc(doc(db, c('attendance'), record.firestoreId), {
          status:       attStatus,
          checkInTime:  checkInTs,
          checkOutTime: checkOutTs,
          workHours,
          // Admin has now reviewed this record — clear the auto-flag either way,
          // whether they confirmed it as Present or kept it as Absent.
          autoFlagged:  false,
        })
      } else {
        await addDoc(collection(db, c('attendance')), {
          uid:          record.uid,
          userId:       record.uid,
          date:         Timestamp.fromDate(dateObj),
          status:       attStatus,
          checkInTime:  checkInTs,
          checkOutTime: checkOutTs,
          workHours,
          createdBy:    'admin',
          autoFlagged:  false,
        })
      }

      await writeAuditLog({
        employeeUid: record.uid,
        employeeName: record.name,
        date: record.date,
        changedByUid: userProfile!.uid,
        changedByName: userProfile!.name ?? 'Admin',
        changedByEmail: userProfile!.email ?? '',
        before: { status: record.status, checkIn: record.checkIn,  checkOut: record.checkOut },
        after:  { status: newStatus,     checkIn: newCheckIn || '—', checkOut: newCheckOut || '—' },
      })

      setSaveMsg(`Updated ${record.name}'s attendance for ${formatDate(record.date)}`)
      setSaveErrMsg('')
      setTimeout(() => setSaveMsg(''), 4000)
      return { ok: true }

    } catch (err: any) {
      console.error('Save failed:', err?.code, err?.message, err)
      const msg = err?.code === 'permission-denied'
        ? `Permission denied — check Firestore rules. (code: ${err.code})`
        : err?.message ?? 'Unknown error'
      setSaveErrMsg(msg)
      setTimeout(() => setSaveErrMsg(''), 6000)
      return { ok: false, error: msg }
    }
  }

  const navItems = [
    { href: '/admin/dashboard',    icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard',    active: false },
    { href: '/admin/employees',    icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,       label: 'Employees',    active: false },
    { href: '/admin/attendance',   icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Attendance',   active: true  },
    { href: '/admin/leaves',       icon: <BeachAccessRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Leave Requests', active: false },
    { href: '/admin/daily-status', icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Daily Status', active: false },
    { href: '/admin/settings',     icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Settings',     active: false },
  ]

  const quickRanges = [
    { label: 'Today',        start: today, end: today },
    {
      label: 'This Week',
      start: (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return getLocalDateString(d) })(),
      end: today,
    },
    {
      label: 'This Month',
      start: getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      end: today,
    },
    {
      label: 'Last 7 Days',
      start: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return getLocalDateString(d) })(),
      end: today,
    },
    {
      label: 'Last 30 Days',
      start: (() => { const d = new Date(); d.setDate(d.getDate() - 29); return getLocalDateString(d) })(),
      end: today,
    },
  ]

  // ── Sorted employee list for dropdown ─────────────────────────────────────
  const employeeOptions = useMemo(() =>
    users
      .filter(u => u.role === 'employee' && u.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Edit Modal */}
      <EditModal record={editRecord} onClose={() => setEditRecord(null)} onSave={handleSaveEdit} />

      {/* History Modal */}
      <HistoryModal
        record={historyRecord}
        logs={historyLogs}
        loading={historyLoading}
        onClose={() => { setHistoryRecord(null); setHistoryLogs([]) }}
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
            <p className="text-xs text-slate-400 flex items-center gap-1">
              {isRange && <DateRangeRoundedIcon sx={{ fontSize: 13 }} />}
              {headerDateLabel}
            </p>
          </div>
          <button onClick={() => exportCSV(filtered, startDate, endDate)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <DownloadRoundedIcon sx={{ fontSize: 16 }} />Export CSV
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Success toast */}
          {saveMsg && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 font-semibold">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />{saveMsg}
            </div>
          )}

          {/* Error toast */}
          {saveErrMsg && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-semibold">
              <WarningRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />{saveErrMsg}
            </div>
          )}

          {/* Needs-review banner (only when there are auto-flagged records and the filter isn't already applied) */}
          {needsReviewCount > 0 && !autoFlaggedOnly && (
            <button
              onClick={() => setAutoFlaggedOnly(true)}
              className="w-full flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left transition-colors"
            >
              <WarningAmberRoundedIcon sx={{ fontSize: 20, color: '#d97706', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-700">
                  {needsReviewCount} record{needsReviewCount > 1 ? 's' : ''} need{needsReviewCount > 1 ? '' : 's'} review
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  These were auto-marked Absent because the employee forgot to check out. Tap to review and fix.
                </p>
              </div>
            </button>
          )}

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<PeopleRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />}           label="Total"       value={records.length}  sub="all rows"             gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"         iconBg="bg-blue-200"   />
            <StatCard icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />}      label="Present"     value={present}          sub={`${attendancePct}%`}  gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard icon={<CancelRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />}           label="Absent"      value={absent}           sub="no check-in"          gradient="bg-gradient-to-br from-red-50 to-red-100 text-red-900"             iconBg="bg-red-200"    />
            <StatCard icon={<BeachAccessRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />}      label="On Leave"    value={onLeave}          sub="approved"             gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900"       iconBg="bg-amber-200"  />
            <StatCard icon={<HowToRegRoundedIcon sx={{ fontSize: 20, color: '#7c3aed' }} />}         label="Checked Out" value={records.filter(r => r.status === 'Present' && r.checkOut !== '—').length} sub="done for day" gradient="bg-gradient-to-br from-violet-50 to-violet-100 text-violet-900" iconBg="bg-violet-200" />
            <StatCard icon={<WeekendRoundedIcon sx={{ fontSize: 20, color: '#64748b' }} />}          label="Weekly Off"  value={weeklyOffs}       sub="Sundays"              gradient="bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700"       iconBg="bg-slate-200"  />
            <StatCard icon={<CelebrationRoundedIcon sx={{ fontSize: 20, color: '#0ea5e9' }} />}      label="Holidays"    value={publicHolidays}   sub="admin holidays"       gradient="bg-gradient-to-br from-sky-50 to-sky-100 text-sky-900"             iconBg="bg-sky-200"    />
            <StatCard
              icon={<WarningAmberRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />}
              label="Needs Review"
              value={needsReviewCount}
              sub="missed checkouts"
              gradient="bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900"
              iconBg="bg-amber-200"
              onClick={() => setAutoFlaggedOnly(v => !v)}
              active={autoFlaggedOnly}
            />
          </div>

          {/* ── Attendance Rate Bar ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUpRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                <span className="font-extrabold text-slate-900 text-sm">{isRange ? 'Range Attendance Rate' : "Today's Attendance Rate"}</span>
              </div>
              <span className="text-2xl font-black text-blue-600">{attendancePct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700" style={{ width: `${attendancePct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
              <span>{present} present</span>
              <span>{absent} absent · {onLeave} on leave · {weeklyOffs} weekly off · {publicHolidays} holidays</span>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <FilterListRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <h2 className="font-extrabold text-slate-900 text-sm">Filter Records</h2>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount} active</span>
              )}
              <button
                onClick={() => setAutoFlaggedOnly(v => !v)}
                className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  autoFlaggedOnly ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
              >
                <WarningAmberRoundedIcon sx={{ fontSize: 13 }} />
                Needs Review ({needsReviewCount})
              </button>
              {activeFilterCount > 0 && (
                <button onClick={handleClearFilters} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline">Clear filters</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" value={startDate} max={endDate}
                  onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                <input type="date" value={endDate} min={startDate} max={today}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              {/* Employee Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employee</label>
                <select
                  value={empFilter}
                  onChange={e => setEmpFilter(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none transition-colors ${empFilter !== 'all' ? 'border-blue-400' : 'border-slate-200 focus:border-blue-500'}`}
                >
                  <option value="all">All Employees</option>
                  {employeeOptions.map(u => (
                    <option key={u.uid} value={u.uid}>{u.name}</option>
                  ))}
                </select>
              </div>
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none transition-colors ${statusFilter !== 'all' ? 'border-blue-400' : 'border-slate-200 focus:border-blue-500'}`}>
                  <option value="all">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Weekly Off">Weekly Off</option>
                </select>
              </div>
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none transition-colors ${deptFilter !== 'all' ? 'border-blue-400' : 'border-slate-200 focus:border-blue-500'}`}>
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Quick range buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick:</span>
              {quickRanges.map(q => {
                const isActive = startDate === q.start && endDate === q.end
                return (
                  <button key={q.label} onClick={() => { setStartDate(q.start); setEndDate(q.end) }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                    {q.label}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-slate-400 font-medium mt-3">
              Showing <span className="font-bold text-slate-700">{filtered.length}</span> of <span className="font-bold text-slate-700">{records.length}</span> records
            </p>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <AccessTimeRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
              <h2 className="font-extrabold text-slate-900 text-sm">Attendance Records</h2>
              {isRange && (
                <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{startDate} → {endDate}</span>
              )}
              <div className="ml-auto hidden lg:flex items-center gap-3">
                {[
                  { dot: 'bg-emerald-500', label: 'Present'    },
                  { dot: 'bg-red-400',     label: 'Absent'     },
                  { dot: 'bg-amber-400',   label: 'On Leave'   },
                  { dot: 'bg-slate-400',   label: 'Weekly Off' },
                  { dot: 'bg-sky-400',     label: 'Holiday'    },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${l.dot}`} />{l.label}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-400 font-medium lg:ml-3">Page {currentPage} of {totalPages}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-500 text-sm font-medium">Loading attendance data…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <PeopleRoundedIcon sx={{ fontSize: 40 }} />
                <p className="text-sm mt-2 font-medium text-slate-400">No records found</p>
                {activeFilterCount > 0 && (
                  <button onClick={handleClearFilters} className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Edit', 'History'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginated.map((record, idx) => {
                        const isSpecial = record.status === 'Weekly Off' || record.status === 'Holiday'
                        const rowBg =
                          record.autoFlagged             ? 'bg-amber-50/50' :
                          record.status === 'Weekly Off' ? 'bg-slate-50/60' :
                          record.status === 'Holiday'    ? 'bg-sky-50/40'   :
                          record.status === 'On Leave'   ? 'bg-amber-50/30' :
                          record.status === 'Absent'     ? 'bg-red-50/20'   : ''
                        const initials = record.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()

                        return (
                          <tr key={`${record.uid}_${record.date}_${idx}`} className={`transition-colors hover:brightness-95 ${rowBg}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isSpecial ? 'bg-slate-300' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                                  {initials}
                                </div>
                                <div>
                                  <p className={`font-semibold text-xs leading-tight ${isSpecial ? 'text-slate-400' : 'text-slate-900'}`}>{record.name}</p>
                                  <p className="text-[11px] text-slate-400">{record.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${isSpecial ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                                {record.department}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
                                <DateRangeRoundedIcon sx={{ fontSize: 11 }} />
                                {formatDate(record.date)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {isSpecial ? <span className="text-slate-300">—</span> : record.checkIn === '—' ? <span className="text-slate-300">—</span> : record.checkIn}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {isSpecial ? <span className="text-slate-300">—</span> : record.checkOut === '—' ? <span className="text-slate-300">—</span> : <span className="font-medium">{record.checkOut}</span>}
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                              {isSpecial ? <span className="text-slate-300">—</span>
                                : record.workHours === 'In progress'
                                  ? <span className="flex items-center gap-1.5 text-green-600 text-[11px] font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />In progress
                                    </span>
                                  : record.workHours === 'Missed checkout'
                                    ? <span className="text-[11px] font-bold text-amber-600">Missed checkout</span>
                                  : record.workHours === '—' ? <span className="text-slate-300">—</span>
                                  : record.workHours}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <StatusBadge record={record} />
                                {record.status === 'Holiday' && record.holidayName && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 ml-0.5">{record.holidayName}</p>
                                )}
                                {record.autoFlagged && (
                                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5 ml-0.5 flex items-center gap-1">
                                    <WarningAmberRoundedIcon sx={{ fontSize: 10 }} />Needs review
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isSpecial ? (
                                <span className="text-[10px] text-slate-300 font-medium">—</span>
                              ) : (
                                <button
                                  onClick={() => setEditRecord(record)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                    record.autoFlagged
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-600'
                                      : 'bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-400'
                                  }`}
                                  title={record.autoFlagged ? 'Review missed checkout' : 'Edit attendance'}
                                >
                                  <EditRoundedIcon sx={{ fontSize: 14 }} />
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isSpecial ? (
                                <span className="text-[10px] text-slate-300 font-medium">—</span>
                              ) : (
                                <button
                                  onClick={() => openHistory(record)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-slate-100 hover:bg-violet-100 hover:text-violet-600 text-slate-400"
                                  title="View change history"
                                >
                                  <HistoryRoundedIcon sx={{ fontSize: 14 }} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
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