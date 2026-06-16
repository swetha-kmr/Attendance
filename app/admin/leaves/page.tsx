'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { getAllLeaveRequests, approveLeaveRequest, rejectLeaveRequest, LeaveRequest } from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── MUI Icons ──────────────────────────────────────────────────────────────────
import DashboardRoundedIcon        from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon           from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon       from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon        from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon         from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon           from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon             from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon            from '@mui/icons-material/CloseRounded'
import AssignmentRoundedIcon       from '@mui/icons-material/AssignmentRounded'
import FingerprintRoundedIcon      from '@mui/icons-material/FingerprintRounded'
import SearchRoundedIcon           from '@mui/icons-material/SearchRounded'
import CheckCircleRoundedIcon      from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon           from '@mui/icons-material/CancelRounded'
import AccessTimeFilledRoundedIcon from '@mui/icons-material/AccessTimeFilled'
import BeachAccessRoundedIcon      from '@mui/icons-material/BeachAccessRounded'
import CalendarMonthRoundedIcon    from '@mui/icons-material/CalendarMonthRounded'
import VisibilityRoundedIcon       from '@mui/icons-material/VisibilityRounded'
import RefreshRoundedIcon          from '@mui/icons-material/RefreshRounded'
import NotesRoundedIcon            from '@mui/icons-material/NotesRounded'

// ── Color maps ────────────────────────────────────────────────────────────────
const leaveTypeColors: Record<string, { bg: string; text: string }> = {
  casual:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  sick:     { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  vacation: { bg: 'bg-violet-100', text: 'text-violet-700' },
  personal: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
}
const statusColors: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  approved: { bg: 'bg-green-100',  text: 'text-green-700'  },
  rejected: { bg: 'bg-red-100',    text: 'text-red-700'    },
}

// ── Sad Person Illustration ───────────────────────────────────────────────────
function SadPersonIllustration() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" className="w-40 h-36 mx-auto">
      <rect x="20" y="120" width="160" height="10" rx="5" fill="#e53e3e" /><rect x="20" y="108" width="160" height="10" rx="5" fill="#fc8181" />
      <rect x="28" y="130" width="8" height="30" rx="3" fill="#c53030" /><rect x="164" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="70" y="130" width="8" height="30" rx="3" fill="#c53030" /><rect x="122" y="130" width="8" height="30" rx="3" fill="#c53030" />
      <rect x="82" y="80" width="36" height="40" rx="8" fill="#bee3f8" /><polygon points="100,85 97,100 100,110 103,100" fill="#2d3748" />
      <rect x="83" y="116" width="14" height="22" rx="4" fill="#2d3748" /><rect x="103" y="116" width="14" height="22" rx="4" fill="#2d3748" />
      <ellipse cx="90" cy="140" rx="9" ry="5" fill="#1a202c" /><ellipse cx="110" cy="140" rx="9" ry="5" fill="#1a202c" />
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
  show: boolean; onClose: () => void; onConfirm: () => void; illustration: React.ReactNode
  title: string; subtitle: string; confirmLabel: string; confirmClass: string; loading?: boolean
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center">
        {illustration}
        <h2 className="text-xl font-bold text-slate-900 mt-2 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 h-11 rounded-xl text-white font-semibold ${confirmClass}`}>{loading ? 'Please wait…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── View Leave Modal ──────────────────────────────────────────────────────────
// FIX: modal wrapper → max-h-[90vh] flex flex-col
//      header + footer → shrink-0 (never shrink)
//      body → flex-1 overflow-y-auto (scrolls only the middle)
function ViewLeaveModal({ leave, onClose, onAction, actionLoading }: {
  leave: LeaveRequest | null
  onClose: () => void
  onAction: (id: string, action: 'approved' | 'rejected') => Promise<void>
  actionLoading: string | null
}) {
  if (!leave) return null

  const tc = leaveTypeColors[leave.leaveType] || { bg: 'bg-slate-100', text: 'text-slate-700' }
  const sc = statusColors[leave.status]       || { bg: 'bg-slate-100', text: 'text-slate-700' }
  const isActioning = actionLoading === leave.id
  const initials = leave.employeeName?.split(' ').map((n: string) => n[0]).join('') ?? '?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      {/* FIX: max-h-[90vh] + flex flex-col so header/footer stay fixed */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header — shrink-0 so it never gets squished */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">{leave.employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Body — flex-1 + overflow-y-auto: this part scrolls */}
        <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">

          {/* Leave type + status badges */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${tc.bg} ${tc.text}`}>
              {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
            </span>
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Start Date</p>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: '#3b82f6' }} />
                {leave.startDate.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">End Date</p>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: '#3b82f6' }} />
                {leave.endDate.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-slate-50 rounded-2xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Duration</p>
            <p className="text-sm font-bold text-slate-800">{leave.days} {leave.days === 1 ? 'day' : 'days'}</p>
          </div>

          {/* Reason — full text, no truncation */}
          <div className="bg-slate-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <NotesRoundedIcon sx={{ fontSize: 15, color: '#64748b' }} />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {leave.reason || '—'}
            </p>
          </div>

          {/* Applied on */}
          {leave.createdAt && (
            <p className="text-xs text-slate-400 text-center">
              Applied on {leave.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Footer — shrink-0 so buttons always visible at bottom */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {leave.status === 'pending' ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isActioning}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => { await onAction(leave.id!, 'rejected'); onClose() }}
                disabled={isActioning}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CancelRoundedIcon sx={{ fontSize: 16 }} />
                {isActioning ? '…' : 'Reject'}
              </button>
              <button
                onClick={async () => { await onAction(leave.id!, 'approved'); onClose() }}
                disabled={isActioning}
                className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                {isActioning ? '…' : 'Approve'}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient, iconBg }: { icon: React.ReactNode; label: string; value: number; gradient: string; iconBg: string }) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} relative overflow-hidden group`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-100 rounded-full w-full" />
        </td>
      ))}
    </tr>
  )
}

// ── Main Content ──────────────────────────────────────────────────────────────
function AdminLeavesContent() {
  const [sidebarOpen,       setSidebarOpen]       = useState(true)
  const [leaves,            setLeaves]            = useState<LeaveRequest[]>([])
  const [fetchLoading,      setFetchLoading]      = useState(true)
  const [fetchError,        setFetchError]        = useState('')
  const [actionLoading,     setActionLoading]     = useState<string | null>(null)
  const [searchTerm,        setSearchTerm]        = useState('')
  const [statusFilter,      setStatusFilter]      = useState('all')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading,     setLogoutLoading]     = useState(false)
  const [viewingLeave,      setViewingLeave]      = useState<LeaveRequest | null>(null)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const fetchLeaves = async () => {
    setFetchLoading(true)
    setFetchError('')
    try {
      const data = await getAllLeaveRequests()
      setLeaves(data)
    } catch (err: any) {
      console.error('Error loading leave requests:', err)
      setFetchError('Failed to load leave requests. Please try again.')
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => { fetchLeaves() }, [])

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    if (!userProfile) return
    setActionLoading(id)
    try {
      if (action === 'approved') {
        await approveLeaveRequest(id, userProfile.uid)
      } else {
        await rejectLeaveRequest(id, userProfile.uid)
      }
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: action } : l))
    } catch (err: any) {
      console.error('Error updating leave request:', err)
      setFetchError(`Failed to ${action === 'approved' ? 'approve' : 'reject'} request. Please try again.`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const filtered = leaves.filter(l => {
    const ms = l.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               l.email?.toLowerCase().includes(searchTerm.toLowerCase())
    return ms && (statusFilter === 'all' || l.status === statusFilter)
  })

  const navItems = [
    { href: '/admin/dashboard',    icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard',      active: false },
    { href: '/admin/employees',    icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,       label: 'Employees',      active: false },
    { href: '/admin/attendance',   icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Attendance',     active: false },
    { href: '/admin/leaves',       icon: <BeachAccessRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Leave Requests', active: true  },
    { href: '/admin/daily-status', icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Daily Status',   active: false },
    { href: '/admin/settings',     icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Settings',       active: false },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      <ConfirmModal
        show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />}
        title="Comeback Soon!" subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

      <ViewLeaveModal
        leave={viewingLeave}
        onClose={() => setViewingLeave(null)}
        onAction={handleAction}
        actionLoading={actionLoading}
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
          <button onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm">
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
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Leave Management</h1>
            <p className="text-xs text-slate-400">Review and approve employee leave requests</p>
          </div>
          <button
            onClick={fetchLeaves}
            disabled={fetchLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            Refresh
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {fetchError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <CancelRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />{fetchError}
              <button onClick={fetchLeaves} className="ml-auto text-xs font-bold underline">Retry</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={<AccessTimeFilledRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />} label="Pending"  value={leaves.filter(l => l.status === 'pending').length}  gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900"   iconBg="bg-amber-200"  />
            <StatCard icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />}     label="Approved" value={leaves.filter(l => l.status === 'approved').length} gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard icon={<CancelRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />}          label="Rejected" value={leaves.filter(l => l.status === 'rejected').length} gradient="bg-gradient-to-br from-red-50 to-red-100 text-red-900"           iconBg="bg-red-200"    />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Employee</label>
                <div className="relative">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input placeholder="Name or email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-sm text-slate-500">
                  {fetchLoading
                    ? <span className="text-slate-400 animate-pulse">Loading…</span>
                    : <>Showing <span className="font-bold text-slate-900">{filtered.length}</span> of <span className="font-bold text-slate-900">{leaves.length}</span> requests</>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Employee', 'Leave Type', 'Dates', 'Days', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fetchLoading
                    ? [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
                    : filtered.map(l => {
                        const tc = leaveTypeColors[l.leaveType] || { bg: 'bg-slate-100', text: 'text-slate-700' }
                        const sc = statusColors[l.status]       || { bg: 'bg-slate-100', text: 'text-slate-700' }
                        return (
                          <tr key={l.id} className="hover:bg-slate-50 transition-colors">

                            {/* Employee — name only */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {l.employeeName?.split(' ').map((n: string) => n[0]).join('') ?? '?'}
                                </div>
                                <p className="font-semibold text-slate-900">{l.employeeName}</p>
                              </div>
                            </td>

                            {/* Leave Type */}
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tc.bg} ${tc.text}`}>
                                {l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)}
                              </span>
                            </td>

                            {/* Dates */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <CalendarMonthRoundedIcon sx={{ fontSize: 13 }} />
                                {l.startDate.toDate().toLocaleDateString()} → {l.endDate.toDate().toLocaleDateString()}
                              </div>
                            </td>

                            {/* Days */}
                            <td className="px-5 py-4 font-bold text-slate-800">{l.days}</td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                                {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                              </span>
                            </td>

                            {/* Actions — View opens modal */}
                            <td className="px-5 py-4">
                              <button
                                onClick={() => setViewingLeave(l)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                                  l.status === 'pending'
                                    ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                                    : 'text-blue-600 hover:bg-blue-50 border-blue-100'
                                }`}
                              >
                                <VisibilityRoundedIcon sx={{ fontSize: 14 }} />
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>

              {!fetchLoading && filtered.length === 0 && (
                <div className="text-center py-12">
                  <EventNoteRoundedIcon sx={{ fontSize: 40, color: '#cbd5e1' }} />
                  <p className="text-slate-400 text-sm mt-2 font-medium">
                    {leaves.length === 0 ? 'No leave requests yet' : 'No requests match your filters'}
                  </p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default function AdminLeavesPage() {
  return <ProtectedRoute requiredRole="admin"><AdminLeavesContent /></ProtectedRoute>
}