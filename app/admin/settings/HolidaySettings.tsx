'use client'

/**
 * HolidaySettings — drop this panel into SettingsContent's <main> alongside
 * the existing Admin Management and Quick Actions panels.
 *
 * Firestore shape expected (collection: "holidays"):
 *   { id: string; name: string; date: Timestamp; type: 'national' | 'regional' | 'company' }
 *
 * Usage inside SettingsContent JSX:
 *   <HolidaySettings />
 */

import { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, getDocs, Timestamp, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

import EventNoteRoundedIcon     from '@mui/icons-material/EventNoteRounded'
import AddRoundedIcon           from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded'
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded'
import InfoRoundedIcon          from '@mui/icons-material/InfoRounded'
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon         from '@mui/icons-material/ErrorRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import WbSunnyRoundedIcon       from '@mui/icons-material/WbSunnyRounded'
import CelebrationRoundedIcon   from '@mui/icons-material/CelebrationRounded'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Holiday {
  id: string
  name: string
  date: Timestamp
  type: 'national' | 'regional' | 'company'
}

interface HolidayForm {
  name: string
  date: string       // "YYYY-MM-DD" from <input type="date">
  type: 'national' | 'regional' | 'company'
}

const EMPTY_FORM: HolidayForm = { name: '', date: '', type: 'national' }

// ── Type badge ────────────────────────────────────────────────────────────────

const TYPE_META = {
  national: { label: 'National',  bg: 'bg-blue-100',   text: 'text-blue-700' },
  regional: { label: 'Regional',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  company:  { label: 'Company',   bg: 'bg-violet-100', text: 'text-violet-700' },
}

function TypeBadge({ type }: { type: Holiday['type'] }) {
  const m = TYPE_META[type]
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  )
}

// ── Month grouping helper ─────────────────────────────────────────────────────

function groupByMonth(holidays: Holiday[]): Record<string, Holiday[]> {
  return holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const d = h.date.toDate()
    const key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(h)
    return acc
  }, {})
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HolidaySettings() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<HolidayForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [toast, setToast] = useState('')

  // ── Filter state ──────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState(currentYear)

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadHolidays = async () => {
    try {
      setLoading(true)
      const snap = await getDocs(query(collection(db, 'holidays'), orderBy('date', 'asc')))
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHolidays() }, [])

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Holiday name is required'); return }
    if (!form.date)         { setFormError('Date is required'); return }

    const selected = new Date(form.date)
    if (selected.getDay() === 0) {
      setFormError('Sunday is already a permanent Week Off — no need to add it separately.')
      return
    }

    // Duplicate check (same date)
    const ts = Timestamp.fromDate(new Date(form.date))
    const alreadyExists = holidays.some(
      h => h.date.toDate().toDateString() === new Date(form.date).toDateString()
    )
    if (alreadyExists) {
      setFormError('A holiday on this date already exists.')
      return
    }

    setSubmitting(true)
    try {
      await addDoc(collection(db, 'holidays'), {
        name: form.name.trim(),
        date: ts,
        type: form.type,
      })
      setForm(EMPTY_FORM)
      setShowAddModal(false)
      await loadHolidays()
      showToast(`"${form.name.trim()}" added successfully!`)
    } catch (err: any) {
      setFormError(err.message || 'Failed to add holiday')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      await deleteDoc(doc(db, 'holidays', deleteTarget.id))
      const name = deleteTarget.name
      setDeleteTarget(null)
      await loadHolidays()
      showToast(`"${name}" removed.`)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const yearHolidays = holidays.filter(h => h.date.toDate().getFullYear() === filterYear)
  const grouped = groupByMonth(yearHolidays)
  const monthKeys = Object.keys(grouped)

  const upcomingCount = yearHolidays.filter(h => h.date.toDate() >= new Date()).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />
          <p className="text-sm text-emerald-700 font-semibold">{toast}</p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          HOLIDAY MANAGEMENT PANEL
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Panel header */}
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
            {/* Year selector */}
            <select
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
              className="text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-orange-400"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowAddModal(true); setFormError(''); setForm(EMPTY_FORM) }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-200"
            >
              <AddRoundedIcon sx={{ fontSize: 16 }} />Add Holiday
            </button>
          </div>
        </div>

        {/* Info banner — Sunday rule */}
        <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
          <InfoRoundedIcon sx={{ fontSize: 18, color: '#2563eb' }} />
          <p className="text-xs text-blue-800 font-semibold">
            Sundays are automatically treated as <span className="font-extrabold">Week Off</span> in attendance
            calculations — no need to add them here.
          </p>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-slate-500 text-sm font-medium">Loading holidays…</span>
          </div>
        ) : yearHolidays.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <CelebrationRoundedIcon sx={{ fontSize: 36, color: '#d1d5db' }} />
            <p className="text-sm font-medium text-slate-400">No holidays configured for {filterYear}</p>
            <button
              onClick={() => { setShowAddModal(true); setFormError(''); setForm(EMPTY_FORM) }}
              className="mt-1 text-xs text-orange-500 font-semibold hover:underline"
            >
              + Add your first holiday
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {monthKeys.map(month => (
              <div key={month}>
                {/* Month heading */}
                <div className="px-5 py-2 bg-slate-50">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{month}</p>
                </div>
                {/* Holiday rows */}
                {grouped[month].map(holiday => {
                  const d = holiday.date.toDate()
                  const isPast = d < new Date()
                  const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' })
                  const dayNum  = d.getDate()
                  return (
                    <div
                      key={holiday.id}
                      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${isPast ? 'opacity-50' : ''}`}
                    >
                      {/* Date pill */}
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-orange-400 uppercase">{dayName}</span>
                        <span className="text-lg font-extrabold text-orange-600 leading-tight">{dayNum}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{holiday.name}</p>
                          <TypeBadge type={holiday.type} />
                          {!isPast && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(holiday)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 text-xs font-semibold transition-all shrink-0"
                      >
                        <DeleteRoundedIcon sx={{ fontSize: 14 }} />Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400 font-semibold">Type:</p>
          {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map(t => (
            <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_META[t].bg} ${TYPE_META[t].text}`}>
              {TYPE_META[t].label}
            </span>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <WbSunnyRoundedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
            <p className="text-[11px] text-slate-400">Sundays auto-marked as Week Off</p>
          </div>
        </div>
      </div>

      {/* ════════ ADD HOLIDAY MODAL ════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
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
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400"
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdd} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Holiday Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pongal, Independence Day…"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-orange-400 focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-orange-400 focus:outline-none"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Holiday Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        form.type === t
                          ? t === 'national'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                            : t === 'regional'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200'
                              : 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {form.type === 'national' && 'Public holidays like Republic Day, Independence Day, Gandhi Jayanti'}
                  {form.type === 'regional' && 'Festivals like Pongal, Diwali, Eid — observed locally'}
                  {form.type === 'company'  && 'Internal company-specific holidays or office closures'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-200"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Adding…</>
                  ) : (
                    <><AddRoundedIcon sx={{ fontSize: 16 }} />Add Holiday</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 px-5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM MODAL ════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <DeleteRoundedIcon sx={{ fontSize: 28, color: '#dc2626' }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-900">Remove Holiday?</h2>
              <p className="text-sm text-slate-500 mt-1">
                You're about to remove{' '}
                <span className="font-semibold text-slate-800">{deleteTarget.name}</span>
              </p>
            </div>

            {/* Holiday preview */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-orange-400 uppercase">
                  {deleteTarget.date.toDate().toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <span className="text-lg font-extrabold text-orange-600 leading-tight">
                  {deleteTarget.date.toDate().getDate()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{deleteTarget.name}</p>
                <p className="text-xs text-slate-400">
                  {deleteTarget.date.toDate().toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              <TypeBadge type={deleteTarget.type} />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
              <InfoRoundedIcon sx={{ fontSize: 16, color: '#d97706' }} />
              <p className="text-xs text-amber-800 font-semibold">
                This date will no longer be treated as a holiday in attendance calculations.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {deleteSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Removing…</>
                ) : (
                  <><DeleteRoundedIcon sx={{ fontSize: 16 }} />Yes, Remove</>
                )}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}