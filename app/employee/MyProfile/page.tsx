'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

// ── MUI Icons ──────────────────────────────────────────────────────────────────
import DashboardRoundedIcon       from '@mui/icons-material/DashboardRounded'
import PersonRoundedIcon          from '@mui/icons-material/PersonRounded'
import EventNoteRoundedIcon       from '@mui/icons-material/EventNoteRounded'
import CalendarMonthRoundedIcon   from '@mui/icons-material/CalendarMonthRounded'
import LogoutRoundedIcon          from '@mui/icons-material/LogoutRounded'
import AssignmentRoundedIcon      from '@mui/icons-material/AssignmentRounded'
import MenuRoundedIcon            from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon           from '@mui/icons-material/CloseRounded'
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon           from '@mui/icons-material/ErrorRounded'
import FingerprintRoundedIcon     from '@mui/icons-material/FingerprintRounded'
import SaveRoundedIcon            from '@mui/icons-material/SaveRounded'
import BadgeRoundedIcon           from '@mui/icons-material/BadgeRounded'
import PhoneRoundedIcon           from '@mui/icons-material/PhoneRounded'
import ApartmentRoundedIcon       from '@mui/icons-material/ApartmentRounded'
import WorkRoundedIcon            from '@mui/icons-material/WorkRounded'
import BeachAccessRoundedIcon       from '@mui/icons-material/BeachAccessRounded'
import MailRoundedIcon            from '@mui/icons-material/MailRounded'

// ── Sad Person Illustration (for logout modal) ────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────

function EmployeeProfileContent() {
  
   const pathname = usePathname()
    console.log("Current Path:", pathname)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [formData, setFormData] = useState({ name: '', phoneNumber: '', department: '', designation: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const { userProfile, signOut, updateUserProfile } = useAuth()
  const router = useRouter()

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error('Logout error:', err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      await updateUserProfile({
        name: formData.name || userProfile?.name,
        phoneNumber: formData.phoneNumber || userProfile?.phoneNumber,
        department: formData.department || userProfile?.department,
        designation: formData.designation || userProfile?.designation,
      })
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) { setError(err.message || 'Failed to update profile') }
    finally { setLoading(false) }
  }


  const navItems = [
  { href: '/employee/dashboard',        icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard'        },
{ href: '/employee/MyProfile', icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />, label: 'My Profile' }, 
 { href: '/employee/leaves',           icon: <BeachAccessRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Leave Requests'   },
  { href: '/employee/holiday-calendar', icon: <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />, label: 'Holiday Calendar' },
  { href: '/employee/daily-status',     icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Daily Status'     },
]
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Modals */}
      <ConfirmModal
        show={showLogoutConfirm}  onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />}
        title="Comeback Soon!"    subtitle="Are you sure you want to logout?"
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

<nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
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

        {/* User info + logout */}
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

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            {sidebarOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">My Profile</h1>
            <p className="text-xs text-slate-400">Manage your personal information</p>
          </div>
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

          {/* Profile Hero */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -right-2 top-20 w-24 h-24 rounded-full bg-white/5" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-extrabold shrink-0 border border-white/30">
                {userProfile?.name?.charAt(0) ?? 'E'}
              </div>
              <div>
                <h2 className="text-2xl font-extrabold">{userProfile?.name ?? 'Employee'}</h2>
                <p className="text-blue-200 text-sm mt-0.5">{userProfile?.designation || 'No designation set'} · {userProfile?.department || 'No department'}</p>
                <p className="text-blue-300 text-xs mt-1">{userProfile?.email}</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <PersonRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Edit Profile</h2>
                <p className="text-xs text-slate-400">Update your personal details</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <BadgeRoundedIcon sx={{ fontSize: 14 }} /> Full Name
                  </label>
                  <input
                    name="name"
                    placeholder={userProfile?.name || 'Your full name'}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <PhoneRoundedIcon sx={{ fontSize: 14 }} /> Phone Number
                  </label>
                  <input
                    name="phoneNumber"
                    placeholder={userProfile?.phoneNumber || '+91 9876543210'}
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ApartmentRoundedIcon sx={{ fontSize: 14 }} /> Department
                  </label>
                  <input
                    name="department"
                    placeholder={userProfile?.department || 'Engineering'}
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <WorkRoundedIcon sx={{ fontSize: 14 }} /> Designation
                  </label>
                  <input
                    name="designation"
                    placeholder={userProfile?.designation || 'Software Engineer'}
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Email read-only */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MailRoundedIcon sx={{ fontSize: 14 }} /> Email (Read-only)
                </label>
                <input
                  type="email"
                  value={userProfile?.email || ''}
                  disabled
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <SaveRoundedIcon sx={{ fontSize: 18 }} />
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
                <Link href="/employee/dashboard">
                  <button type="button" className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </Link>
              </div>
            </form>
          </div>

        </main>
      </div>
    </div>
  )
}

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute requiredRole="employee">
      <EmployeeProfileContent />
    
    </ProtectedRoute>
  )
}