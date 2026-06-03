'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { getLeaveRequests, updateLeaveRequest, LeaveRequest } from '@/lib/firestore-service'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── MUI Icons ──────────────────────────────────────────────────────────────────
import DashboardRoundedIcon      from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon         from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon     from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon      from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon       from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon           from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon    from '@mui/icons-material/FingerprintRounded'
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded'
import CheckCircleRoundedIcon    from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon         from '@mui/icons-material/CancelRounded'
import AccessTimeFilledRoundedIcon from '@mui/icons-material/AccessTimeFilled'
import BeachAccessRoundedIcon    from '@mui/icons-material/BeachAccessRounded'
import CalendarMonthRoundedIcon  from '@mui/icons-material/CalendarMonthRounded'
import VisibilityRoundedIcon     from '@mui/icons-material/VisibilityRounded'

// ── Types ─────────────────────────────────────────────────────────────────────
// !! Replace this mock data section with your real Firestore call if available
// The component structure is ready for real data via getLeaveRequests

const MOCK_LEAVES = [
  { id: '1', employeeName: 'John Doe',      email: 'john@company.com',  leaveType: 'casual',   startDate: { toDate: () => new Date('2024-02-10') }, endDate: { toDate: () => new Date('2024-02-12') }, days: 3, reason: 'Personal work',        status: 'pending',  createdAt: { toDate: () => new Date('2024-02-05') } },
  { id: '2', employeeName: 'Sarah Smith',   email: 'sarah@company.com', leaveType: 'sick',     startDate: { toDate: () => new Date('2024-02-08') }, endDate: { toDate: () => new Date('2024-02-08') }, days: 1, reason: 'Medical appointment', status: 'approved', createdAt: { toDate: () => new Date('2024-02-07') } },
  { id: '3', employeeName: 'Mike Johnson',  email: 'mike@company.com',  leaveType: 'vacation', startDate: { toDate: () => new Date('2024-02-20') }, endDate: { toDate: () => new Date('2024-02-25') }, days: 6, reason: 'Family vacation',     status: 'pending',  createdAt: { toDate: () => new Date('2024-02-01') } },
  { id: '4', employeeName: 'Emily Davis',   email: 'emily@company.com', leaveType: 'casual',   startDate: { toDate: () => new Date('2024-01-28') }, endDate: { toDate: () => new Date('2024-01-28') }, days: 1, reason: 'Family event',        status: 'approved', createdAt: { toDate: () => new Date('2024-01-25') } },
  { id: '5', employeeName: 'Robert Wilson', email: 'rob@company.com',   leaveType: 'vacation', startDate: { toDate: () => new Date('2024-02-15') }, endDate: { toDate: () => new Date('2024-02-18') }, days: 4, reason: 'Planning travel',     status: 'rejected', createdAt: { toDate: () => new Date('2024-01-30') } },
  { id: '6', employeeName: 'Lisa Anderson', email: 'lisa@company.com',  leaveType: 'sick',     startDate: { toDate: () => new Date('2024-02-09') }, endDate: { toDate: () => new Date('2024-02-09') }, days: 1, reason: 'Not feeling well',   status: 'pending',  createdAt: { toDate: () => new Date('2024-02-08') } },
]

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

// ── Main Content ──────────────────────────────────────────────────────────────
function AdminLeavesContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [leaves, setLeaves]           = useState(MOCK_LEAVES)
  const [searchTerm, setSearchTerm]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading]         = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: action } : l))
    // In production: await updateLeaveRequest(id, { status: action })
  }

  const filtered = leaves.filter(l => {
    const ms = l.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || l.email.toLowerCase().includes(searchTerm.toLowerCase())
    return ms && (statusFilter === 'all' || l.status === statusFilter)
  })

  const navItems = [
    { href: '/admin/dashboard', icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard',      active: false },
    { href: '/admin/employees', icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,      label: 'Employees',      active: false },
    { href: '/admin/attendance',icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Attendance',     active: false },
    { href: '/admin/leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Leave Requests', active: true  },
    { href: '/admin/settings',  icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Settings',       active: false },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      <ConfirmModal show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />} title="Comeback Soon!" subtitle="Are you sure you want to logout?" confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700" loading={logoutLoading} />

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
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={<AccessTimeFilledRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} />} label="Pending" value={leaves.filter(l => l.status === 'pending').length} gradient="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900" iconBg="bg-amber-200" />
            <StatCard icon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />} label="Approved" value={leaves.filter(l => l.status === 'approved').length} gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard icon={<CancelRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} />} label="Rejected" value={leaves.filter(l => l.status === 'rejected').length} gradient="bg-gradient-to-br from-red-50 to-red-100 text-red-900" iconBg="bg-red-200" />
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
                <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">{filtered.length}</span> requests</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Employee','Leave Type','Dates','Days','Reason','Status','Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(l => {
                    const tc = leaveTypeColors[l.leaveType] || { bg: 'bg-slate-100', text: 'text-slate-700' }
                    const sc = statusColors[l.status] || { bg: 'bg-slate-100', text: 'text-slate-700' }
                    return (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {l.employeeName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{l.employeeName}</p>
                              <p className="text-xs text-slate-400">{l.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tc.bg} ${tc.text}`}>
                            {l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CalendarMonthRoundedIcon sx={{ fontSize: 13 }} />
                            {l.startDate.toDate().toLocaleDateString()} → {l.endDate.toDate().toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800">{l.days}</td>
                        <td className="px-5 py-4"><p className="text-slate-600 text-xs max-w-[140px] truncate">{l.reason}</p></td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                            {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {l.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleAction(l.id, 'approved')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all shadow-sm">
                                <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />Approve
                              </button>
                              <button onClick={() => handleAction(l.id, 'rejected')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-sm">
                                <CancelRoundedIcon sx={{ fontSize: 14 }} />Reject
                              </button>
                            </div>
                          ) : (
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors">
                              <VisibilityRoundedIcon sx={{ fontSize: 14 }} />View
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <EventNoteRoundedIcon sx={{ fontSize: 40, color: '#cbd5e1' }} />
                  <p className="text-slate-400 text-sm mt-2 font-medium">No leave requests found</p>
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