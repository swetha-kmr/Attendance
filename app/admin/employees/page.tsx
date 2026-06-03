'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { secondaryAuth } from '@/lib/firebase'
import { createUser, getAllUsers, updateUser, deactivateUser } from '@/lib/firestore-service'
import { Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'

// ── MUI Icons ──────────────────────────────────────────────────────────────────
import DashboardRoundedIcon        from '@mui/icons-material/DashboardRounded'
import PeopleRoundedIcon           from '@mui/icons-material/PeopleRounded'
import AccessTimeRoundedIcon       from '@mui/icons-material/AccessTimeRounded'
import EventNoteRoundedIcon        from '@mui/icons-material/EventNoteRounded'
import SettingsRoundedIcon         from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon           from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon             from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon            from '@mui/icons-material/CloseRounded'
import FingerprintRoundedIcon      from '@mui/icons-material/FingerprintRounded'
import AddRoundedIcon              from '@mui/icons-material/AddRounded'
import SearchRoundedIcon           from '@mui/icons-material/SearchRounded'
import EditRoundedIcon             from '@mui/icons-material/EditRounded'
import PersonOffRoundedIcon        from '@mui/icons-material/PersonOffRounded'
import MailRoundedIcon             from '@mui/icons-material/MailRounded'
import PhoneRoundedIcon            from '@mui/icons-material/PhoneRounded'
import VisibilityRoundedIcon       from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon    from '@mui/icons-material/VisibilityOffRounded'
import ErrorRoundedIcon            from '@mui/icons-material/ErrorRounded'
import CheckCircleRoundedIcon      from '@mui/icons-material/CheckCircleRounded'
import PeopleAltRoundedIcon        from '@mui/icons-material/PeopleAltRounded'
import HowToRegRoundedIcon         from '@mui/icons-material/HowToRegRounded'
import PersonOffOutlinedIcon       from '@mui/icons-material/PersonOffOutlined'
import WarningAmberRoundedIcon     from '@mui/icons-material/WarningAmberRounded'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  uid: string; email: string; name: string; role: 'admin' | 'employee'
  phoneNumber?: string; department?: string; designation?: string
  createdAt: Timestamp; lastLogin: Timestamp; status: 'active' | 'inactive'
}
interface NewEmployeeForm { name: string; email: string; password: string; phoneNumber: string; department: string; designation: string }
const EMPTY_FORM: NewEmployeeForm = { name: '', email: '', password: '', phoneNumber: '', department: '', designation: '' }
const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design']

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
          <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 h-11 rounded-xl text-white font-semibold transition-colors ${confirmClass}`}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient, iconBg }: { icon: React.ReactNode; label: string; value: string | number; gradient: string; iconBg: string }) {
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
function EmployeeManagementContent() {
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [employees, setEmployees]       = useState<UserProfile[]>([])
  const [loading, setLoading]           = useState(true)
  const [searchTerm, setSearchTerm]     = useState('')
  const [filterDept, setFilterDept]     = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [showAddModal, setShowAddModal]   = useState(false)
  const [formData, setFormData]           = useState<NewEmployeeForm>(EMPTY_FORM)
  const [showPassword, setShowPassword]   = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [formError, setFormError]         = useState('')

  const [editEmployee, setEditEmployee]   = useState<UserProfile | null>(null)
  const [editForm, setEditForm]           = useState({ name: '', phoneNumber: '', department: '', designation: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError]         = useState('')

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading]         = useState(false)
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee]           = useState<{ uid: string; name: string } | null>(null)
  const [deactivateLoading, setDeactivateLoading]         = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const loadEmployees = async () => {
    try { setLoading(true); const all = await getAllUsers(); setEmployees(all.filter(u => u.role === 'employee')) }
    catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { loadEmployees() }, [])

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSubmitting(true)
    try {
      if (!formData.name || !formData.email || !formData.password) throw new Error('Name, email, and password are required')
      if (formData.password.length < 6) throw new Error('Password must be at least 6 characters')
      const uc = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password)
      await createUser({ uid: uc.user.uid, email: formData.email, name: formData.name, role: 'employee', phoneNumber: formData.phoneNumber, department: formData.department, designation: formData.designation, createdAt: Timestamp.now(), lastLogin: Timestamp.now(), status: 'active' } as UserProfile)
      toast.success(`${formData.name} added successfully!`)
      setFormData(EMPTY_FORM); setShowAddModal(false); await loadEmployees()
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setFormError('This email is already registered')
      else if (err.code === 'auth/invalid-email') setFormError('Invalid email address')
      else setFormError(err.message || 'Failed to create employee')
    } finally { setSubmitting(false) }
  }

  const openEdit = (emp: UserProfile) => { setEditEmployee(emp); setEditForm({ name: emp.name, phoneNumber: emp.phoneNumber || '', department: emp.department || '', designation: emp.designation || '' }); setEditError('') }
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editEmployee) return; setEditSubmitting(true); setEditError('')
    try { await updateUser(editEmployee.uid, editForm); setEditEmployee(null); await loadEmployees() }
    catch (err: any) { setEditError(err.message || 'Failed to update') } finally { setEditSubmitting(false) }
  }

  const confirmDeactivate = async () => {
    if (!selectedEmployee) return; setDeactivateLoading(true)
    try { await deactivateUser(selectedEmployee.uid); await loadEmployees(); toast.success(`${selectedEmployee.name} deactivated`); setConfirmDeactivateOpen(false); setSelectedEmployee(null) }
    catch { toast.error('Failed to deactivate') } finally { setDeactivateLoading(false) }
  }

  const filtered = employees.filter(e => {
    const ms = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase())
    return ms && (filterDept === 'all' || e.department === filterDept) && (filterStatus === 'all' || e.status === filterStatus)
  })

  const navItems = [
    { href: '/admin/dashboard', icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Dashboard',      active: false },
    { href: '/admin/employees', icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,      label: 'Employees',      active: true  },
    { href: '/admin/attendance',icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Attendance',     active: false },
    { href: '/admin/leaves',    icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Leave Requests', active: false },
    { href: '/admin/settings',  icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Settings',       active: false },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Modals */}
      <ConfirmModal show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleLogoutConfirmed} illustration={<SadPersonIllustration />} title="Comeback Soon!" subtitle="Are you sure you want to logout?" confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700" loading={logoutLoading} />
      <ConfirmModal show={confirmDeactivateOpen} onClose={() => { setConfirmDeactivateOpen(false); setSelectedEmployee(null) }} onConfirm={confirmDeactivate} illustration={<div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center"><PersonOffRoundedIcon sx={{ fontSize: 36, color: '#dc2626' }} /></div>} title="Deactivate Employee?" subtitle={`${selectedEmployee?.name} will lose system access.`} confirmLabel="Yes, Deactivate" confirmClass="bg-red-600 hover:bg-red-700" loading={deactivateLoading} />

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
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Employee Management</h1>
            <p className="text-xs text-slate-400">Manage your team members</p>
          </div>
          <button onClick={() => { setShowAddModal(true); setFormError(''); setFormData(EMPTY_FORM) }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0">
            <AddRoundedIcon sx={{ fontSize: 18 }} />Add Employee
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={<PeopleAltRoundedIcon sx={{ fontSize: 20, color: '#2563eb' }} />} label="Total Employees" value={employees.length} gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900" iconBg="bg-blue-200" />
            <StatCard icon={<HowToRegRoundedIcon sx={{ fontSize: 20, color: '#16a34a' }} />} label="Active" value={employees.filter(e => e.status === 'active').length} gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900" iconBg="bg-emerald-200" />
            <StatCard icon={<PersonOffOutlinedIcon sx={{ fontSize: 20, color: '#dc2626' }} />} label="Inactive" value={employees.filter(e => e.status === 'inactive').length} gradient="bg-gradient-to-br from-red-50 to-red-100 text-red-900" iconBg="bg-red-200" />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Search</label>
                <div className="relative">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input placeholder="Name or email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Department</label>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">{filtered.length}</span> of {employees.length}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 font-medium">Loading employees…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <PeopleRoundedIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
                <p className="text-slate-400 font-semibold mt-3">No employees found</p>
                <p className="text-slate-300 text-xs mt-1">Try adjusting filters or add a new employee</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Employee','Department','Designation','Contact','Status','Actions'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(emp => (
                      <tr key={emp.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {emp.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.name}</p>
                              <p className="text-xs text-slate-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {emp.department
                            ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{emp.department}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{emp.designation || <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500"><MailRoundedIcon sx={{ fontSize: 13 }} />{emp.email}</div>
                            {emp.phoneNumber && <div className="flex items-center gap-1.5 text-xs text-slate-500"><PhoneRoundedIcon sx={{ fontSize: 13 }} />{emp.phoneNumber}</div>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {emp.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(emp)} className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"><EditRoundedIcon sx={{ fontSize: 16 }} /></button>
                            {emp.status === 'active' && (
                              <button onClick={() => { setSelectedEmployee({ uid: emp.uid, name: emp.name }); setConfirmDeactivateOpen(true) }} className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"><PersonOffRoundedIcon sx={{ fontSize: 16 }} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Add Employee Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Add New Employee</h2>
                <p className="text-xs text-slate-400 mt-0.5">Creates Firebase Auth + Firestore profile</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <CloseRoundedIcon sx={{ fontSize: 20, color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />{formError}
                </div>
              )}
              {[
                { label: 'Full Name', name: 'name', type: 'text', placeholder: 'e.g. Priya Rajan', required: true },
                { label: 'Email', name: 'email', type: 'email', placeholder: 'priya@company.com', required: true },
                { label: 'Phone Number', name: 'phoneNumber', type: 'text', placeholder: '+91 9876543210', required: false },
                { label: 'Designation', name: 'designation', type: 'text', placeholder: 'e.g. Software Engineer', required: false },
              ].map(f => (
                <div key={f.name} className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{f.label}{f.required && <span className="text-red-500 ml-1">*</span>}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(formData as any)[f.name]} onChange={e => setFormData(p => ({ ...p, [f.name]: e.target.value }))} required={f.required}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              ))}
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Temporary Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required
                    className="w-full h-11 px-4 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 18 }} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Password must be at least 6 characters</p>
              </div>
              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Department</label>
                <select value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</> : <><AddRoundedIcon sx={{ fontSize: 18 }} />Add Employee</>}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Employee Modal ── */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">Edit Employee</h2>
              <button onClick={() => setEditEmployee(null)} className="p-2 hover:bg-slate-100 rounded-xl"><CloseRoundedIcon sx={{ fontSize: 20, color: '#64748b' }} /></button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              {editError && <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700"><ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />{editError}</div>}
              {[
                { label: 'Full Name', key: 'name', placeholder: 'Full name' },
                { label: 'Phone Number', key: 'phoneNumber', placeholder: '+91 9876543210' },
                { label: 'Designation', key: 'designation', placeholder: 'Software Engineer' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{f.label}</label>
                  <input value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Department</label>
                <select value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none">
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editSubmitting} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {editSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditEmployee(null)} className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmployeeManagementPage() {
  return <ProtectedRoute requiredRole="admin"><EmployeeManagementContent /></ProtectedRoute>
}