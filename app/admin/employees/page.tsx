'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { secondaryAuth } from '@/lib/firebase'
import {
  Search, Plus, Edit2, UserX, ChevronDown,
  Mail, Phone, X, AlertCircle, Loader2,
  Users, UserCheck, UserMinus, Eye, EyeOff,
  Settings, BarChart3, Clock, FileText, LogOut, Menu
} from 'lucide-react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createUser, getAllUsers, updateUser, deactivateUser } from '@/lib/firestore-service'
import { Timestamp } from 'firebase/firestore'
import { ProtectedRoute } from '@/lib/protected-route'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string
  email: string
  name: string
  role: 'admin' | 'employee'
  phoneNumber?: string
  department?: string
  designation?: string
  createdAt: Timestamp
  lastLogin: Timestamp
  status: 'active' | 'inactive'
}

interface NewEmployeeForm {
  name: string
  email: string
  password: string
  phoneNumber: string
  department: string
  designation: string
}

const EMPTY_FORM: NewEmployeeForm = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  department: '',
  designation: '',
}

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design']

// ─── Main Content ─────────────────────────────────────────────────────────────

function EmployeeManagementContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Add Employee modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<NewEmployeeForm>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Edit modal state
  const [editEmployee, setEditEmployee] = useState<UserProfile | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phoneNumber: '', department: '', designation: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const { userProfile, signOut } = useAuth()
  const router = useRouter()


  // ── Load employees ──────────────────────────────────────────────────────────

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const all = await getAllUsers()
      // Show only employees (not admins)
      setEmployees(all.filter(u => u.role === 'employee'))
    } catch (err) {
      console.error('Error loading employees:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  // ── Logout ──────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // ── Add Employee ────────────────────────────────────────────────────────────

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    const validationErrors = validateEmployeeForm()

    try {
      // Validate
     if (validationErrors.length > 0) {
  setFormError(validationErrors[0])
  setSubmitting(false)
  return
}
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // 1. Create Firebase Auth user
   
const userCredential = await createUserWithEmailAndPassword(
  secondaryAuth,
  formData.email,
  formData.password
)

console.log('Admin Auth User:', auth.currentUser?.email)
console.log('Secondary Auth User:', secondaryAuth.currentUser?.email)
      // 2. Create Firestore profile
      const newProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        role: 'employee',
        phoneNumber: formData.phoneNumber,
        department: formData.department,
        designation: formData.designation,
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        status: 'active',
      }
      await createUser(newProfile)

      
toast.success(`user added successfully!`)

      setFormData(EMPTY_FORM)
      setShowAddModal(false)
      await loadEmployees()
    } catch (err: any) {
      // Firebase auth error codes
      if (err.code === 'auth/email-already-in-use') {
        setFormError('This email is already registered')
      } else if (err.code === 'auth/invalid-email') {
        setFormError('Invalid email address')
      } else if (err.code === 'auth/weak-password') {
        setFormError('Password is too weak')
      } else {
        setFormError(err.message || 'Failed to create employee')
      }
    } finally {
      setSubmitting(false)
    }
  }
  const validateEmployeeForm = () => {
  const errors: string[] = []

  const name = formData.name.trim()
  const email = formData.email.trim()
  const phone = formData.phoneNumber.trim()

  // Name
  if (!name) {
    errors.push('Full name is required')
  } else if (name.length < 3) {
    errors.push('Full name must be at least 3 characters')
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    errors.push('Full name can contain only letters and spaces')
  }

  // Email
  if (!email) {
    errors.push('Email address is required')
  } else if (
    !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)
  ) {
    errors.push('Please enter a valid email address')
  }

  // Password
 // Password
if (!formData.password) {
  errors.push('Password is required')
} else if (formData.password.length < 6) {
  errors.push('Password must be at least 6 characters')
} else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
  errors.push('Password must contain at least one letter and one number')
}

  // Phone
  if (phone) {
    const phoneRegex = /^[6-9]\d{9}$/

    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      errors.push('Please enter a valid 10-digit mobile number')
    }
  }

  // Department
  if (!formData.department) {
    errors.push('Please select a department')
  }

  // Designation
  if (!formData.designation.trim()) {
    errors.push('Designation is required')
  }

  return errors
}

  // ── Edit Employee ───────────────────────────────────────────────────────────

  const openEdit = (emp: UserProfile) => {
    setEditEmployee(emp)
    setEditForm({
      name: emp.name,
      phoneNumber: emp.phoneNumber || '',
      department: emp.department || '',
      designation: emp.designation || '',
    })
    setEditError('')
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmployee) return
    setEditSubmitting(true)
    setEditError('')
    try {
      await updateUser(editEmployee.uid, {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
        department: editForm.department,
        designation: editForm.designation,
      })
      setEditEmployee(null)
      await loadEmployees()
     toast.success('Employee updated successfully!')
    } catch (err: any) {
      setEditError(err.message || 'Failed to update employee')
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── Deactivate Employee ─────────────────────────────────────────────────────


  const [confirmOpen, setConfirmOpen] = useState(false)
const [selectedEmployee, setSelectedEmployee] = useState<{
  uid: string
  name: string
} | null>(null)

const handleDeactivate = async (uid: string, name: string) => {
  toast(
    `Deactivate ${name}?`,
    {
      description: "The employee will lose access to the system.",
      action: {
        label: "Deactivate",
        onClick: async () => {
          try {
            await deactivateUser(uid)
            await loadEmployees()

            toast.success(
              `${name} has been deactivated successfully`
            )
          } catch (error) {
            toast.error(
              "Failed to deactivate employee"
            )
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    }
  )
}
const confirmDeactivate = async () => {
  if (!selectedEmployee) return

  try {
    await deactivateUser(selectedEmployee.uid)
    await loadEmployees()

    toast.success(
      `${selectedEmployee.name} has been deactivated successfully`
    )

    setConfirmOpen(false)
    setSelectedEmployee(null)
  } catch {
    toast.error('Failed to deactivate employee')
  }
}

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = employees.filter(emp => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchDept = filterDept === 'all' || emp.department === filterDept
    const matchStatus = filterStatus === 'all' || emp.status === filterStatus
    return matchSearch && matchDept && matchStatus
  })

  const activeCount = employees.filter(e => e.status === 'active').length
  const inactiveCount = employees.filter(e => e.status === 'inactive').length

  // ── Sidebar menu ────────────────────────────────────────────────────────────

  const menuItems = [
    { label: 'Dashboard', icon: BarChart3, href: '/admin/dashboard' },
    { label: 'Employees', icon: Users, href: '/admin/employees', active: true },
    { label: 'Attendance', icon: Clock, href: '/admin/attendance' },
    { label: 'Leave Requests', icon: FileText, href: '/admin/leaves' },
      { label: 'Settings', icon: Settings, href: '/admin/settings' },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold">A</div>
              <div>
                <h1 className="font-bold text-slate-900">Attendance</h1>
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map(item => (
              <Link key={item.label} href={item.href}>
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left ${item.active ? 'bg-blue-50 text-blue-700' : ''}`}>
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </Link>
            ))}
          </nav>
          <div className="px-4 py-6 border-t border-slate-200 space-y-4">
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Logged in as</p>
              <p className="font-medium text-slate-900 text-sm">{userProfile?.name}</p>
              <p className="text-xs text-slate-500">{userProfile?.email}</p>
            </div>
            <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          </div>
          <Button
            onClick={() => { setShowAddModal(true); setFormError(''); setFormData(EMPTY_FORM) }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-5 h-5" />Add Employee
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, label: 'Total Employees', value: employees.length, color: 'from-blue-600 to-blue-700' },
              { icon: UserCheck, label: 'Active', value: activeCount, color: 'from-green-600 to-green-700' },
              { icon: UserMinus, label: 'Inactive', value: inactiveCount, color: 'from-red-600 to-red-700' },
            ].map((s, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{s.label}</p>
                    <h3 className="text-3xl font-bold text-slate-900">{s.value}</h3>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${s.color} text-white`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Name or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                <div className="relative">
                  <select
                    value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 appearance-none"
                  >
                    <option value="all">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-end">
                <p className="text-sm text-slate-600">
                  Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of {employees.length} employees
                </p>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-slate-600">Loading employees...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No employees found</p>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or add a new employee</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Employee</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Department</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Designation</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Contact</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map(emp => (
                      <tr key={emp.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {emp.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{emp.name}</p>
                              <p className="text-xs text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {emp.department ? (
                            <Badge className="bg-blue-100 text-blue-700 border-0">{emp.department}</Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-700">{emp.designation || <span className="text-slate-400">—</span>}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-3 h-3" />
                              <span className="text-xs">{emp.email}</span>
                            </div>
                            {emp.phoneNumber && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-3 h-3" />
                                <span className="text-xs">{emp.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`border-0 ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {emp.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:bg-blue-50"
                              onClick={() => openEdit(emp)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {emp.status === 'active' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                               onClick={() => {
  setSelectedEmployee({
    uid: emp.uid,
    name: emp.name,
  })
  setConfirmOpen(true)
}}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* ════════ ADD EMPLOYEE MODAL ════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New Employee</h2>
                <p className="text-sm text-slate-500 mt-0.5">Creates Firebase Auth account + Firestore profile</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddEmployee} className="p-6 space-y-5">

              {formError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Priya Rajan"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="priya@company.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    required
                    className="pl-9 h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Password */}
             {/* Password */}
<div className="space-y-2">
  <Label htmlFor="password" className="text-slate-700 font-medium">
    Temporary Password <span className="text-red-500">*</span>
  </Label>

  <div className="relative">
    <Input
      id="password"
      type={showPassword ? 'text' : 'password'}
      placeholder="Min. 6 characters"
      value={formData.password}
      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
      required
      className="pr-10 h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>

  {/* Add here */}
  <p className="text-xs text-slate-500">
    Password must be at least 6 characters long.
  </p>
</div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder="+91 9876543210"
                    value={formData.phoneNumber}
                    onChange={e => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                    className="pl-9 h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Department</Label>
                <div className="relative">
                  <select
                    value={formData.department}
                    onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 appearance-none h-11"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Designation */}
              <div className="space-y-2">
                <Label htmlFor="designation" className="text-slate-700 font-medium">Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g. Software Engineer"
                  value={formData.designation}
                  onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))}
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Add Employee</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="h-11"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ EDIT EMPLOYEE MODAL ════════ */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
              <button onClick={() => setEditEmployee(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{editError}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Full Name</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-11 bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Phone Number</Label>
                <Input value={editForm.phoneNumber} onChange={e => setEditForm(p => ({ ...p, phoneNumber: e.target.value }))} className="h-11 bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Department</Label>
                <div className="relative">
                  <select
                    value={editForm.department}
                    onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 appearance-none h-11"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Designation</Label>
                <Input value={editForm.designation} onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} className="h-11 bg-slate-50" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={editSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11">
                  {editSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditEmployee(null)} className="h-11">Cancel</Button>
              </div>
            </form>
          </div>
          
        </div>
        
      )}
{confirmOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded shadow-lg w-[420px]">
      
      {/* Header */}
      <div className="px-5 py-4 border-b">
        <h2 className="text-xl font-bold text-blue-700">
          Are you sure?
        </h2>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        <p className="text-gray-700">
          Are you sure you want to deactivate{' '}
          <span className="font-semibold">
            {selectedEmployee?.name}
          </span>
          ?
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-between px-5 pb-4">
        <Button
          onClick={confirmDeactivate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Confirm
        </Button>

        <Button
          variant="destructive"
          onClick={() => {
            setConfirmOpen(false)
            setSelectedEmployee(null)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
    
  )
}

// ─── Page Export with ProtectedRoute ──────────────────────────────────────────

export default function EmployeeManagementPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <EmployeeManagementContent />
    </ProtectedRoute>
  )
}