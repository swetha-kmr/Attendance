'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { createUser, getAllUsers, deleteUser } from '@/lib/firestore-service'
import { auth } from '@/lib/firebase'
import { Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import DashboardRoundedIcon    from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon   from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon    from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon     from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon       from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon         from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon        from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon  from '@mui/icons-material/FingerprintRounded'
import ShieldRoundedIcon       from '@mui/icons-material/ShieldRounded'
import AddRoundedIcon          from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon       from '@mui/icons-material/DeleteRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CheckCircleRoundedIcon  from '@mui/icons-material/CheckCircleRounded'
import VisibilityRoundedIcon   from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import EmailRoundedIcon        from '@mui/icons-material/EmailRounded'
import PhoneRoundedIcon        from '@mui/icons-material/PhoneRounded'
import ErrorRoundedIcon        from '@mui/icons-material/ErrorRounded'

// ── Sad illustration (same as dashboard logout modal) ─────────────────────────
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

// ── Confirm Modal — same as dashboard ────────────────────────────────────────
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

interface UserProfile {
  uid: string; email: string; name: string; role: 'admin' | 'employee'
  phoneNumber?: string; department?: string; designation?: string
  createdAt: Timestamp; lastLogin: Timestamp; status: 'active' | 'inactive'
}

interface AdminForm { name: string; email: string; password: string; phoneNumber: string }
const EMPTY_FORM: AdminForm = { name: '', email: '', password: '', phoneNumber: '' }

// ── Main Content ──────────────────────────────────────────────────────────────

function SettingsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [admins, setAdmins] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<AdminForm>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const all = await getAllUsers()
      setAdmins(all.filter((u: UserProfile) => u.role === 'admin'))
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { loadAdmins() }, [])

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSubmitting(true)
    try {
      if (!formData.name || !formData.email || !formData.password) throw new Error('Name, email, and password are required')
      if (formData.password.length < 6) throw new Error('Password must be at least 6 characters')
      const { initializeApp } = await import('firebase/app')
      const { getAuth, createUserWithEmailAndPassword: createUser2 } = await import('firebase/auth')
      const secondaryApp = initializeApp(auth.app.options, 'secondary')
      const secondaryAuth = getAuth(secondaryApp)
      const userCredential = await createUser2(secondaryAuth, formData.email, formData.password)
      await secondaryAuth.signOut()
      const { deleteApp } = await import('firebase/app'); await deleteApp(secondaryApp)
      await createUser({ uid: userCredential.user.uid, email: formData.email, name: formData.name, role: 'admin', phoneNumber: formData.phoneNumber, createdAt: Timestamp.now(), lastLogin: Timestamp.now(), status: 'active' })
      setFormData(EMPTY_FORM); setShowAddModal(false)
      setFormSuccess(`Admin "${formData.name}" created! Logging you out…`)
      setTimeout(async () => { await signOut(); router.push('/') }, 2000)
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setFormError('This email is already registered')
      else if (err.code === 'auth/invalid-email') setFormError('Invalid email address')
      else setFormError(err.message || 'Failed to create admin')
    } finally { setSubmitting(false) }
  }

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return
    const activeAdmins = admins.filter(a => a.status === 'active')
    if (activeAdmins.length <= 1 && deleteTarget.uid !== userProfile?.uid) { setDeleteError('Cannot delete the last admin!'); return }
    setDeleteSubmitting(true); setDeleteError('')
    try {
      await deleteUser(deleteTarget.uid)
      if (deleteTarget.uid === userProfile?.uid) { setDeleteTarget(null); await signOut(); router.push('/'); return }
      setDeleteTarget(null); await loadAdmins()
      setFormSuccess(`Admin "${deleteTarget.name}" removed successfully!`)
      setTimeout(() => setFormSuccess(''), 4000)
    } catch (err: any) { setDeleteError(err.message || 'Failed to delete admin') }
    finally { setDeleteSubmitting(false) }
  }

  const activeAdminCount = admins.filter(a => a.status === 'active').length
  const canAddAdmin = activeAdminCount === 0 || (activeAdminCount === 1 && admins.find(a => a.uid === userProfile?.uid) !== undefined)

  const navItems = [
    { href: '/admin/dashboard', icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Dashboard',      active: false },
    { href: '/admin/employees', icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,     label: 'Employees',      active: false },
    { href: '/admin/attendance',icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />, label: 'Attendance',     active: false },
    { href: '/admin/leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Leave Requests', active: false },
    { href: '/admin/settings',  icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Settings',       active: true  },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── Logout Confirm Modal ── */}
      <ConfirmModal
        show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />}
        title="Comeback Soon!" subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700"
        loading={logoutLoading}
      />

      {/* ── Sidebar — identical to dashboard ── */}
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
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm"
          >
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
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Settings</h1>
            <p className="text-xs text-slate-400">Manage admin accounts and system configuration</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Success toast */}
          {formSuccess && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />
              <p className="text-sm text-emerald-700 font-semibold">{formSuccess}</p>
            </div>
          )}

          {/* ── Admin Management — same panel style as dashboard ── */}
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
              <button
                onClick={() => { setShowAddModal(true); setFormError(''); setFormData(EMPTY_FORM) }}
                disabled={!canAddAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <AddRoundedIcon sx={{ fontSize: 16 }} />Add Admin
              </button>
            </div>

            {/* Warning banner */}
            <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100">
              <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#d97706' }} />
              <p className="text-xs text-amber-800 font-semibold">
                {activeAdminCount >= 1
                  ? 'Maximum 1 admin allowed — remove existing admin to add a new one'
                  : 'Admin accounts have full system access'}
              </p>
            </div>

            {/* Admins list */}
            {loading ? (
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{admin.name}</p>
                          {isSelf && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">You</span>
                          )}
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
                        <button
                          onClick={() => { setDeleteTarget(admin); setDeleteError('') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 text-xs font-semibold transition-all shrink-0"
                        >
                          <DeleteRoundedIcon sx={{ fontSize: 14 }} />Remove
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Quick Actions — same panel style as dashboard ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-extrabold text-slate-900 text-sm mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Manage Employees',  icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} />,     href: '/admin/employees' },
                { label: 'View Attendance',   icon: <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />, href: '/admin/attendance' },
                { label: 'Approve Leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 18 }} />,  href: '/admin/leaves' },
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
      {showAddModal && (
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
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'e.g. Arjun Kumar', icon: null, required: true },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'admin@company.com', icon: <EmailRoundedIcon sx={{ fontSize: 16 }} />, required: true },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                  <div className="relative">
                    {field.icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{field.icon}</span>}
                    <input
                      type={field.type} placeholder={field.placeholder} required={field.required}
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                      className={`w-full ${field.icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-violet-500 focus:outline-none`}
                    />
                  </div>
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" required
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-violet-500 focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <VisibilityOffRoundedIcon sx={{ fontSize: 16 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <PhoneRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="+91 9876543210"
                    value={formData.phoneNumber}
                    onChange={e => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</> : <><ShieldRoundedIcon sx={{ fontSize: 16 }} />Create Admin</>}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="h-11 px-5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM ════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <DeleteRoundedIcon sx={{ fontSize: 28, color: '#dc2626' }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-900">Remove Admin?</h2>
              <p className="text-sm text-slate-500 mt-1">You're about to remove <span className="font-semibold text-slate-800">{deleteTarget.name}</span></p>
              {deleteTarget.uid === userProfile?.uid && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl mt-3">
                  <WarningAmberRoundedIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                  <p className="text-xs text-red-700 font-semibold">You are deleting your own account — you will be logged out!</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {deleteTarget.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{deleteTarget.name}</p>
                <p className="text-xs text-slate-400">{deleteTarget.email}</p>
              </div>
            </div>
            {deleteError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl">
                <ErrorRoundedIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleDeleteAdmin} disabled={deleteSubmitting} className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
                {deleteSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Removing…</> : <><DeleteRoundedIcon sx={{ fontSize: 16 }} />Yes, Remove</>}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-11 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
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