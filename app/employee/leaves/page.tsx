'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { getLeaveRequestsByUser, createLeaveRequest, LeaveRequest } from '@/lib/firestore-service'
import { useRouter, usePathname } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

// ── MUI Icons ──────────────────────────────────────────────────────────────────
import DashboardRoundedIcon          from '@mui/icons-material/DashboardRounded'
import PersonRoundedIcon             from '@mui/icons-material/PersonRounded'
import EventNoteRoundedIcon          from '@mui/icons-material/EventNoteRounded'
import LogoutRoundedIcon             from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon               from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon              from '@mui/icons-material/CloseRounded'
import CheckCircleRoundedIcon        from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon              from '@mui/icons-material/ErrorRounded'
import FingerprintRoundedIcon        from '@mui/icons-material/FingerprintRounded'
import AddCircleOutlineRoundedIcon   from '@mui/icons-material/AddCircleOutlineRounded'
import CalendarMonthRoundedIcon      from '@mui/icons-material/CalendarMonthRounded'
import AssignmentRoundedIcon         from '@mui/icons-material/AssignmentRounded'
import BeachAccessRoundedIcon        from '@mui/icons-material/BeachAccessRounded'
import AccessTimeRoundedIcon         from '@mui/icons-material/AccessTimeRounded'
import CancelRoundedIcon             from '@mui/icons-material/CancelRounded'

// ── Sad Person Illustration ───────────────────────────────────────────────────
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
function ConfirmModal({
  show, onClose, onConfirm, illustration, title, subtitle,
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

// ── Leave Type Colors ─────────────────────────────────────────────────────────
const leaveTypeColors: Record<string, { bg: string; text: string }> = {
  casual:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  sick:     { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  vacation: { bg: 'bg-violet-100', text: 'text-violet-700' },
  personal: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
}
const statusColors: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100',   text: 'text-red-700'   },
}

// ── Main Component ────────────────────────────────────────────────────────────
function EmployeeLeavesContent() {
  const pathname = usePathname()

  const [sidebarOpen,       setSidebarOpen]       = useState(true)
  const [leaves,            setLeaves]            = useState<LeaveRequest[]>([])
  const [showForm,          setShowForm]          = useState(false)
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [success,           setSuccess]           = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading,     setLogoutLoading]     = useState(false)
  const [formData, setFormData] = useState({
    leaveType: 'casual' as 'casual' | 'sick' | 'vacation' | 'personal',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!userProfile) return
    const load = async () => {
      try {
        const data = await getLeaveRequestsByUser(userProfile.uid)
        setLeaves(data)
      } catch (err) { console.error('Error loading leaves:', err) }
    }
    load()
  }, [userProfile])

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate), end = new Date(formData.endDate)
    return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    try {
      if (!userProfile) throw new Error('User not found')
      if (!formData.startDate || !formData.endDate || !formData.reason)
        throw new Error('Please fill all required fields')
      const days = calculateDays()
      if (days < 1) throw new Error('End date must be after start date')
      await createLeaveRequest({
        uid: userProfile.uid,
        employeeName: userProfile.name,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate:   Timestamp.fromDate(new Date(formData.endDate)),
        leaveType: formData.leaveType,
        reason:    formData.reason,
        status:    'pending',
        createdAt: Timestamp.now(),
        days,
      })
      setSuccess('Leave request submitted successfully! 🎉')
      setFormData({ leaveType: 'casual', startDate: '', endDate: '', reason: '' })
      setShowForm(false)
      const data = await getLeaveRequestsByUser(userProfile.uid)
      setLeaves(data)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) { setError(err.message || 'Failed to submit leave request') }
    finally { setLoading(false) }
  }

  // ── Nav items ─────────────────────────────────────────────────────────────────
  const navItems = [
    { href: '/employee/dashboard',        icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard'        },
    { href: '/employee/MyProfile',          icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,        label: 'My Profile'       },
    // { href: '/employee/leaves',           icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Leave Requests'   },
    { href: '/employee/holiday-calendar', icon: <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />, label: 'Holiday Calendar' },
    { href: '/employee/daily-status',     icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Daily Status'     },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Modal */}
      <ConfirmModal
        show={showLogoutConfirm}   onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />}
        title="Comeback Soon!"     subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

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
        <nav className="flex-1 px-3 py-5 space-y-1">
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
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Leave Requests</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <AddCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />New Request
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <ErrorRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />{success}
            </div>
          )}

          {/* New Request Form */}
          {showForm && (
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-extrabold">New Leave Request</h2>
                  <p className="text-blue-200 text-sm mt-0.5">Fill in the details below</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <CancelRoundedIcon sx={{ fontSize: 20 }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-200">Leave Type</label>
                    <select name="leaveType" value={formData.leaveType} onChange={handleInputChange}
                      className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium backdrop-blur-sm focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all">
                      <option value="casual"   className="text-slate-800">Casual Leave</option>
                      <option value="sick"     className="text-slate-800">Sick Leave</option>
                      <option value="vacation" className="text-slate-800">Vacation</option>
                      <option value="personal" className="text-slate-800">Personal Leave</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-200">Duration</label>
                    <div className="h-11 px-4 rounded-xl bg-white/10 border border-white/20 flex items-center text-sm font-bold text-white">
                      {calculateDays() > 0 ? `${calculateDays()} day${calculateDays() > 1 ? 's' : ''}` : '— days'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-200">Start Date</label>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required
                      className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-200">End Date</label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required
                      className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all [color-scheme:dark]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-blue-200">Reason</label>
                  <textarea name="reason" value={formData.reason} onChange={handleInputChange} required
                    placeholder="Provide reason for leave request"
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm resize-none h-24 focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0">
                    <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                    {loading ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Leave History */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-slate-900">My Leave Requests</h2>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                {leaves.length} request{leaves.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {leaves.length > 0 ? leaves.map((leave, i) => {
                const typeStyle   = leaveTypeColors[leave.leaveType] || { bg: 'bg-slate-100', text: 'text-slate-700' }
                const statusStyle = statusColors[leave.status]       || { bg: 'bg-slate-100', text: 'text-slate-700' }
                return (
                  <div key={i} className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${typeStyle.bg} flex items-center justify-center shrink-0`}>
                          <BeachAccessRoundedIcon sx={{ fontSize: 20 }} className={typeStyle.text} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 capitalize">{leave.leaveType} Leave</p>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${typeStyle.bg} ${typeStyle.text}`}>
                              {leave.days} day{leave.days > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                            <CalendarMonthRoundedIcon sx={{ fontSize: 13 }} />
                            {leave.startDate.toDate().toLocaleDateString()} → {leave.endDate.toDate().toLocaleDateString()}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{leave.reason}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                            <AccessTimeRoundedIcon sx={{ fontSize: 12 }} />
                            Applied on {leave.createdAt.toDate().toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-12">
                  <EventNoteRoundedIcon sx={{ fontSize: 40, color: '#cbd5e1' }} />
                  <p className="text-slate-400 text-sm mt-2 font-medium">No leave requests yet</p>
                  <p className="text-slate-300 text-xs mt-1">Click "New Request" to submit your first leave</p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default function EmployeeLeavesPage() {
  return (
    <ProtectedRoute requiredRole="employee">
      <EmployeeLeavesContent />
    </ProtectedRoute>
  )
}