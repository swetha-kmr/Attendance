
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { secondaryAuth } from '@/lib/firebase'
import { createUser, getAllUsers, updateUser, deactivateUser, activateUser } from '@/lib/firestore-service'
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
import AssignmentRoundedIcon       from '@mui/icons-material/AssignmentRounded' 
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
import PeopleAltRoundedIcon        from '@mui/icons-material/PeopleAltRounded'
import HowToRegRoundedIcon         from '@mui/icons-material/HowToRegRounded'
import PersonOffOutlinedIcon       from '@mui/icons-material/PersonOffOutlined'
import CheckCircleRoundedIcon      from '@mui/icons-material/CheckCircleRounded'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  uid: string; email: string; name: string; role: 'admin' | 'employee'
  phoneNumber?: string; department?: string; designation?: string
  createdAt: Timestamp; lastLogin: Timestamp; status: 'active' | 'inactive'
}
interface NewEmployeeForm {
  name: string; email: string; password: string
  phoneNumber: string; department: string; designation: string
}
type FormErrors = Partial<Record<keyof NewEmployeeForm, string>>
type TouchedFields = Partial<Record<keyof NewEmployeeForm, boolean>>

const EMPTY_FORM: NewEmployeeForm = { name: '', email: '', password: '', phoneNumber: '', department: '', designation: '' }
const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design']

// ── Validation rules ──────────────────────────────────────────────────────────
function validateField(field: keyof NewEmployeeForm, value: string): string {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Full name is required'
      if (value.trim().length < 2) return 'Name must be at least 2 characters'
      if (!/^[a-zA-Z\s.'-]+$/.test(value.trim())) return 'Name can only contain letters, spaces, and . \' -'
      return ''
    case 'email':
      if (!value.trim()) return 'Email address is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address'
      return ''
    case 'password':
      if (!value) return 'Password is required'
      if (value.length < 6) return 'Password must be at least 6 characters'
      if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter'
      if (!/[0-9]/.test(value)) return 'Include at least one number'
      return ''
    case 'phoneNumber':
      if (!value.trim()) return 'Phone number is required'
      if (!/^[+]?[\d\s\-().]{7,15}$/.test(value.trim())) return 'Enter a valid phone number'
      return ''
    case 'designation':
      if (!value.trim()) return 'Designation is required'
      if (value.trim().length < 2) return 'Designation must be at least 2 characters'
      return ''
    case 'department':
      if (!value) return 'Please select a department'
      return ''
    default:
      return ''
  }
}

function validateAll(form: NewEmployeeForm): FormErrors {
  const errors: FormErrors = {}
  ;(Object.keys(form) as (keyof NewEmployeeForm)[]).forEach(key => {
    const err = validateField(key, form[key])
    if (err) errors[key] = err
  })
  return errors
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
          <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 h-11 rounded-xl text-white font-semibold transition-colors ${confirmClass}`}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper with error + success indicator ──────────────────────────────
function FormField({
  label, required, error, touched, success, children,
}: {
  label: string; required?: boolean; error?: string; touched?: boolean; success?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">{children}</div>
      {touched && error && (
        <div className="flex items-center gap-1.5 mt-1">
          <ErrorRoundedIcon sx={{ fontSize: 14, color: '#dc2626' }} />
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}
      {touched && !error && success && (
        <div className="flex items-center gap-1.5 mt-1">
          <CheckCircleRoundedIcon sx={{ fontSize: 14, color: '#16a34a' }} />
          <p className="text-xs text-green-600 font-medium">Looks good!</p>
        </div>
      )}
    </div>
  )
}

function inputClass(error?: string, touched?: boolean) {
  const base = 'w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-slate-50'
  if (touched && error)  return `${base} border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30`
  if (touched && !error) return `${base} border-green-400 focus:border-green-500 focus:ring-green-100`
  return `${base} border-slate-200 focus:border-blue-500 focus:ring-blue-100`
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient, iconBg }: {
  icon: React.ReactNode; label: string; value: string | number; gradient: string; iconBg: string
}) {
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

  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData]         = useState<NewEmployeeForm>(EMPTY_FORM)
  const [formErrors, setFormErrors]     = useState<FormErrors>({})
  const [touched, setTouched]           = useState<TouchedFields>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState('')

  const [editEmployee, setEditEmployee]     = useState<UserProfile | null>(null)
  const [editForm, setEditForm]             = useState({ name: '', phoneNumber: '', department: '', designation: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError]           = useState('')

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutLoading, setLogoutLoading]         = useState(false)

  const [selectedEmployee, setSelectedEmployee]           = useState<{ uid: string; name: string } | null>(null)
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const [deactivateLoading, setDeactivateLoading]         = useState(false)
  const [confirmActivateOpen, setConfirmActivateOpen]     = useState(false)
  const [activateLoading, setActivateLoading]             = useState(false)

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  const loadEmployees = async () => {
    try { setLoading(true); const all = await getAllUsers(); setEmployees(all.filter(u => u.role === 'employee')) }
    catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { loadEmployees() }, [])

  // ── Field change + blur handlers ──
  const handleFieldChange = (field: keyof NewEmployeeForm, value: string) => {
    setFormData(p => ({ ...p, [field]: value }))
    if (touched[field]) {
      setFormErrors(p => ({ ...p, [field]: validateField(field, value) }))
    }
  }

  const handleBlur = (field: keyof NewEmployeeForm) => {
    setTouched(p => ({ ...p, [field]: true }))
    setFormErrors(p => ({ ...p, [field]: validateField(field, formData[field]) }))
  }

  const resetAddModal = () => {
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setTouched({})
    setSubmitError('')
    setShowPassword(false)
  }

  const handleLogoutConfirmed = async () => {
    setLogoutLoading(true)
    try { await signOut(); router.push('/') }
    catch (err) { console.error(err); setLogoutLoading(false); setShowLogoutConfirm(false) }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    // Touch all fields and validate
    const allTouched: TouchedFields = {}
    ;(Object.keys(formData) as (keyof NewEmployeeForm)[]).forEach(k => { allTouched[k] = true })
    setTouched(allTouched)

    const errors = validateAll(formData)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const uc = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password)
      await createUser({
        uid: uc.user.uid, email: formData.email, name: formData.name, role: 'employee',
        phoneNumber: formData.phoneNumber, department: formData.department,
        designation: formData.designation, createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(), status: 'active',
      } as UserProfile)
      toast.success(`${formData.name} added successfully!`)
      resetAddModal()
      setShowAddModal(false)
      await loadEmployees()
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setSubmitError('This email is already registered in the system.')
      else if (err.code === 'auth/invalid-email') setSubmitError('The email address is not valid.')
      else setSubmitError(err.message || 'Failed to create employee. Please try again.')
    } finally { setSubmitting(false) }
  }

  const openEdit = (emp: UserProfile) => {
    setEditEmployee(emp)
    setEditForm({ name: emp.name, phoneNumber: emp.phoneNumber || '', department: emp.department || '', designation: emp.designation || '' })
    setEditError('')
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editEmployee) return; setEditSubmitting(true); setEditError('')
    try { await updateUser(editEmployee.uid, editForm); setEditEmployee(null); await loadEmployees() }
    catch (err: any) { setEditError(err.message || 'Failed to update') } finally { setEditSubmitting(false) }
  }

  const confirmDeactivate = async () => {
    if (!selectedEmployee) return; setDeactivateLoading(true)
    try {
      await deactivateUser(selectedEmployee.uid); await loadEmployees()
      toast.success(`${selectedEmployee.name} deactivated`)
      setConfirmDeactivateOpen(false); setSelectedEmployee(null)
    } catch { toast.error('Failed to deactivate') } finally { setDeactivateLoading(false) }
  }

  const confirmActivate = async () => {
    if (!selectedEmployee) return; setActivateLoading(true)
    try {
      await activateUser(selectedEmployee.uid); await loadEmployees()
      toast.success(`${selectedEmployee.name} activated`)
      setConfirmActivateOpen(false); setSelectedEmployee(null)
    } catch { toast.error('Failed to activate') } finally { setActivateLoading(false) }
  }

  const filtered = employees.filter(e => {
    const ms = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase())
    return ms && (filterDept === 'all' || e.department === filterDept) && (filterStatus === 'all' || e.status === filterStatus)
  })

  const navItems = [
    { href: '/admin/dashboard',  icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Dashboard',      active: false },
    { href: '/admin/employees',  icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,      label: 'Employees',      active: true  },
    { href: '/admin/attendance', icon: <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />,  label: 'Attendance',     active: false },
    // { href: '/admin/leaves',     icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,   label: 'Leave Requests', active: false },
      { href: '/admin/daily-status', icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />, label: 'Daily Status', active: false },
    { href: '/admin/settings',   icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,    label: 'Settings',       active: false },
  ]

  // count valid fields for progress
  const validCount = (Object.keys(formData) as (keyof NewEmployeeForm)[]).filter(k => touched[k] && !validateField(k, formData[k])).length
  const totalFields = 6

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── Modals ── */}
      <ConfirmModal show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleLogoutConfirmed}
        illustration={<SadPersonIllustration />} title="Comeback Soon!" subtitle="Are you sure you want to logout?"
        confirmLabel="Yes, Logout" confirmClass="bg-red-600 hover:bg-red-700" loading={logoutLoading} />

      <ConfirmModal show={confirmDeactivateOpen} onClose={() => { setConfirmDeactivateOpen(false); setSelectedEmployee(null) }} onConfirm={confirmDeactivate}
        illustration={<div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center"><PersonOffRoundedIcon sx={{ fontSize: 36, color: '#dc2626' }} /></div>}
        title="Deactivate Employee?" subtitle={`${selectedEmployee?.name} will lose system access.`}
        confirmLabel="Yes, Deactivate" confirmClass="bg-red-600 hover:bg-red-700" loading={deactivateLoading} />

      <ConfirmModal show={confirmActivateOpen} onClose={() => { setConfirmActivateOpen(false); setSelectedEmployee(null) }} onConfirm={confirmActivate}
        illustration={<div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center"><HowToRegRoundedIcon sx={{ fontSize: 36, color: '#16a34a' }} /></div>}
        title="Activate Employee?" subtitle={`${selectedEmployee?.name} will regain system access.`}
        confirmLabel="Yes, Activate" confirmClass="bg-green-600 hover:bg-green-700" loading={activateLoading} />

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
          <button onClick={() => { resetAddModal(); setShowAddModal(true) }}
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
                      {['Employee', 'Department', 'Designation', 'Contact', 'Status', 'Actions'].map(h => (
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
                            <button onClick={() => openEdit(emp)} className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                              <EditRoundedIcon sx={{ fontSize: 16 }} />
                            </button>
                            {emp.status === 'active' ? (
                              <button onClick={() => { setSelectedEmployee({ uid: emp.uid, name: emp.name }); setConfirmDeactivateOpen(true) }}
                                className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors" title="Deactivate">
                                <PersonOffRoundedIcon sx={{ fontSize: 16 }} />
                              </button>
                            ) : (
                              <button onClick={() => { setSelectedEmployee({ uid: emp.uid, name: emp.name }); setConfirmActivateOpen(true) }}
                                className="p-2 rounded-xl text-green-600 hover:bg-green-50 transition-colors" title="Activate">
                                <HowToRegRoundedIcon sx={{ fontSize: 16 }} />
                              </button>
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

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Add New Employee</h2>
                <p className="text-xs text-slate-400 mt-0.5">All fields are required</p>
              </div>
              <button onClick={() => { setShowAddModal(false); resetAddModal() }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <CloseRoundedIcon sx={{ fontSize: 20, color: '#64748b' }} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-400">Form completion</p>
                <p className="text-xs font-bold text-blue-600">{validCount}/{totalFields} fields valid</p>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${(validCount / totalFields) * 100}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4" noValidate>

              {/* Firebase-level submit error */}
              {submitError && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} className="shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{submitError}</p>
                </div>
              )}

              {/* Full Name */}
              <FormField label="Full Name" required error={formErrors.name} touched={touched.name} success={!formErrors.name}>
                <input
                  type="text"
                  placeholder="e.g. Priya Rajan"
                  value={formData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={inputClass(formErrors.name, touched.name)}
                />
              </FormField>

              {/* Email */}
              <FormField label="Email Address" required error={formErrors.email} touched={touched.email} success={!formErrors.email}>
                <input
                  type="email"
                  placeholder="priya@company.com"
                  value={formData.email}
                  onChange={e => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={inputClass(formErrors.email, touched.email)}
                />
              </FormField>

              {/* Password */}
              <FormField label="Temporary Password" required error={formErrors.password} touched={touched.password} success={!formErrors.password}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 chars, 1 uppercase, 1 number"
                  value={formData.password}
                  onChange={e => handleFieldChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`${inputClass(formErrors.password, touched.password)} pr-11`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 18 }} />}
                </button>
                {/* Password strength hints */}
                {touched.password && formData.password && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: '6+ chars', ok: formData.password.length >= 6 },
                      { label: 'Uppercase', ok: /[A-Z]/.test(formData.password) },
                      { label: 'Number',    ok: /[0-9]/.test(formData.password) },
                    ].map(hint => (
                      <span key={hint.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${hint.ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hint.ok ? '✓' : '○'} {hint.label}
                      </span>
                    ))}
                  </div>
                )}
              </FormField>

              {/* Phone Number */}
              <FormField label="Phone Number" required error={formErrors.phoneNumber} touched={touched.phoneNumber} success={!formErrors.phoneNumber}>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={formData.phoneNumber}
                  onChange={e => handleFieldChange('phoneNumber', e.target.value)}
                  onBlur={() => handleBlur('phoneNumber')}
                  className={inputClass(formErrors.phoneNumber, touched.phoneNumber)}
                />
              </FormField>

              {/* Designation */}
              <FormField label="Designation" required error={formErrors.designation} touched={touched.designation} success={!formErrors.designation}>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={formData.designation}
                  onChange={e => handleFieldChange('designation', e.target.value)}
                  onBlur={() => handleBlur('designation')}
                  className={inputClass(formErrors.designation, touched.designation)}
                />
              </FormField>

              {/* Department */}
              <FormField label="Department" required error={formErrors.department} touched={touched.department} success={!formErrors.department}>
                <select
                  value={formData.department}
                  onChange={e => handleFieldChange('department', e.target.value)}
                  onBlur={() => handleBlur('department')}
                  className={`${inputClass(formErrors.department, touched.department)} appearance-none`}
                >
                  <option value="">Select a department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </FormField>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-blue-200">
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
                    : <><AddRoundedIcon sx={{ fontSize: 18 }} />Add Employee</>}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); resetAddModal() }}
                  className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
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
              <button onClick={() => setEditEmployee(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <CloseRoundedIcon sx={{ fontSize: 20, color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
                  <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} />{editError}
                </div>
              )}
              {[
                { label: 'Full Name',    key: 'name',        placeholder: 'Full name' },
                { label: 'Phone Number', key: 'phoneNumber', placeholder: '+91 9876543210' },
                { label: 'Designation',  key: 'designation', placeholder: 'Software Engineer' },
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
                <button type="submit" disabled={editSubmitting}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {editSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                    : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditEmployee(null)}
                  className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
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
