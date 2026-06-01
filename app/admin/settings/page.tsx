'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Plus, Edit2, Trash2, X, AlertCircle, CheckCircle,
  Loader2, Shield, Users, Eye, EyeOff, Mail, Phone,
  Settings, BarChart3, Clock, FileText, LogOut, Menu,
  ShieldCheck, ShieldOff, AlertTriangle
} from 'lucide-react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createUser, getAllUsers, updateUser, deactivateUser, deleteUser } from '@/lib/firestore-service'
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

interface AdminForm {
  name: string
  email: string
  password: string
  phoneNumber: string
}

const EMPTY_FORM: AdminForm = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function SettingsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [admins, setAdmins] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Add Admin modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<AdminForm>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { userProfile, signOut } = useAuth()
  const router = useRouter()

  // ── Load admins ─────────────────────────────────────────────────────────────

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const all = await getAllUsers()
      setAdmins(all.filter(u => u.role === 'admin'))
    } catch (err) {
      console.error('Error loading admins:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
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

  // ── Add Admin ───────────────────────────────────────────────────────────────

const handleAddAdmin = async (e: React.FormEvent) => {
  e.preventDefault()
  setFormError('')
  setSubmitting(true)

  try {
    if (!formData.name || !formData.email || !formData.password) {
      throw new Error('Name, email, and password are required')
    }
    if (formData.password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    //  KEY FIX: Create a secondary Firebase app instance
    // This prevents switching the current admin session
    const { initializeApp } = await import('firebase/app')
    const { getAuth, createUserWithEmailAndPassword: createUser2 } = await import('firebase/auth')

    const firebaseConfig = auth.app.options // reuse same config
    const secondaryApp = initializeApp(firebaseConfig, 'secondary')
    const secondaryAuth = getAuth(secondaryApp)

    //  Create new user in secondary app (current session untouched!)
    const userCredential = await createUser2(
      secondaryAuth,
      formData.email,
      formData.password
    )

    //  Immediately sign out from secondary app
    await secondaryAuth.signOut()

    //  Delete secondary app instance
    const { deleteApp } = await import('firebase/app')
    await deleteApp(secondaryApp)

    //  Create Firestore profile
    const newAdmin: UserProfile = {
      uid: userCredential.user.uid,
      email: formData.email,
      name: formData.name,
      role: 'admin',
      phoneNumber: formData.phoneNumber,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      status: 'active',
    }
    await createUser(newAdmin)

    //  Now safely sign out current admin
    setFormData(EMPTY_FORM)
    setShowAddModal(false)
    setFormSuccess(`Admin "${formData.name}" created! Logging you out...`)

    setTimeout(async () => {
      await signOut()
      router.push('/')
    }, 2000)

  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      setFormError('This email is already registered')
    } else if (err.code === 'auth/invalid-email') {
      setFormError('Invalid email address')
    } else if (err.code === 'auth/weak-password') {
      setFormError('Password is too weak')
    } else {
      setFormError(err.message || 'Failed to create admin')
    }
  } finally {
    setSubmitting(false)
  }
}
  // ── Delete Admin ────────────────────────────────────────────────────────────

const handleDeleteAdmin = async () => {
  if (!deleteTarget) return

  const activeAdmins = admins.filter(a => a.status === 'active')
  if (activeAdmins.length <= 1 && deleteTarget.uid !== userProfile?.uid) {
    setDeleteError('Cannot delete the last admin!')
    return
  }

  setDeleteSubmitting(true)
  setDeleteError('')

  try {
    await deleteUser(deleteTarget.uid)
    
    //  If deleting yourself → auto logout
    if (deleteTarget.uid === userProfile?.uid) {
      setDeleteTarget(null)
      await signOut()
      router.push('/')
      return
    }

    setDeleteTarget(null)
    await loadAdmins()
    setFormSuccess(`Admin "${deleteTarget.name}" removed successfully!`)
    setTimeout(() => setFormSuccess(''), 4000)
  } catch (err: any) {
    setDeleteError(err.message || 'Failed to delete admin')
  } finally {
    setDeleteSubmitting(false)
  }
}
  // ── Sidebar menu ────────────────────────────────────────────────────────────

  const menuItems = [
    { label: 'Dashboard', icon: BarChart3, href: '/admin/dashboard' },
    { label: 'Employees', icon: Users, href: '/admin/employees' },
    { label: 'Attendance', icon: Clock, href: '/admin/attendance' },
    { label: 'Leave Requests', icon: FileText, href: '/admin/leaves' },
    { label: 'Settings', icon: Settings, href: '/app/admin/settings', active: true },
  ]

  const activeAdminCount = admins.filter(a => a.status === 'active').length


  const canAddAdmin = activeAdminCount === 0 || 
  (activeAdminCount === 1 && admins.find(a => a.uid === userProfile?.uid) !== undefined)
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
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage admin accounts and system configuration</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Success toast */}
          {formSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">{formSuccess}</p>
            </div>
          )}

          {/* ── Admin Management Section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 text-white flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Admin Management</h2>
                  <p className="text-sm text-slate-500">{activeAdminCount} active admin{activeAdminCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
  <Button
  onClick={() => { setShowAddModal(true); setFormError(''); setFormData(EMPTY_FORM) }}
  disabled={!canAddAdmin}
  className="bg-violet-600 hover:bg-violet-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus className="w-4 h-4" />Add Admin
</Button>
            </div>

            {/* Info banner */}
         <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
  <div className="text-sm text-amber-800">
    <p className="font-medium">
      {activeAdminCount >= 1 
        ? 'Maximum 1 admin allowed — remove existing admin to add new one'  
        : 'Admin accounts have full system access'}
    </p>
  </div>
</div>

            {/* Admins Table */}
            <Card className="overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                  <span className="ml-3 text-slate-600">Loading admins...</span>
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-16">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No admins found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Admin</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Contact</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Created</th>
                        <th className="px-6 py-4 text-right font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {admins.map(admin => {
                        const isSelf = admin.uid === userProfile?.uid
                        const isLastActive = activeAdminCount <= 1 && admin.status === 'active'

                        return (
                          <tr key={admin.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                  {admin.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-900">{admin.name}</p>
                                    {isSelf && (
                                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">You</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">{admin.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Mail className="w-3 h-3" />
                                  <span className="text-xs">{admin.email}</span>
                                </div>
                                {admin.phoneNumber && (
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <Phone className="w-3 h-3" />
                                    <span className="text-xs">{admin.phoneNumber}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {admin.status === 'active' ? (
                                  <ShieldCheck className="w-4 h-4 text-green-600" />
                                ) : (
                                  <ShieldOff className="w-4 h-4 text-red-500" />
                                )}
                                <Badge className={`border-0 ${admin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {admin.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs">
                              {admin.createdAt?.toDate().toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </td>
                         <td className="px-6 py-4 text-right">
  {isLastActive && !isSelf ? (
    <span className="text-xs text-slate-400 italic">Last admin</span>
  ) : (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-600 hover:bg-red-50 gap-1.5"
      onClick={() => { setDeleteTarget(admin); setDeleteError('') }}
    >
      <Trash2 className="w-4 h-4" />
      <span className="text-xs">Remove</span>
    </Button>
  )}
</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

        </main>
      </div>

      {/* ════════ ADD ADMIN MODAL ════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-linear-to-br from-violet-600 to-violet-700 text-white flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Add New Admin</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Full system access will be granted</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Arjun Kumar"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:border-violet-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Email <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="admin@company.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    required
                    className="pl-9 h-11 bg-slate-50 border-slate-200 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    required
                    className="pr-10 h-11 bg-slate-50 border-slate-200 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="+91 9876543210"
                    value={formData.phoneNumber}
                    onChange={e => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                    className="pl-9 h-11 bg-slate-50 border-slate-200 focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white h-11"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    <><Shield className="w-4 h-4 mr-2" />Create Admin</>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="h-11">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM MODAL ════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 space-y-5">
              {/* Warning icon */}
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
              </div>

           <div className="text-center space-y-2">
  <h2 className="text-xl font-bold text-slate-900">Remove Admin?</h2>
  <p className="text-slate-600 text-sm">
    You're about to remove{' '}
    <span className="font-semibold text-slate-900">{deleteTarget.name}</span> as an admin.
  </p>
  {/* ✅ Extra warning if deleting yourself */}
  {deleteTarget.uid === userProfile?.uid && (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mt-2">
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <p className="text-xs text-red-700 font-medium">
        You are deleting your own account — you will be logged out immediately!
      </p>
    </div>
  )}
</div>
              {/* Target admin info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {deleteTarget.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{deleteTarget.name}</p>
                  <p className="text-xs text-slate-500">{deleteTarget.email}</p>
                </div>
              </div>

              {deleteError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleDeleteAdmin}
                  disabled={deleteSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white h-11"
                >
                  {deleteSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" />Yes, Remove</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <SettingsContent />
    </ProtectedRoute>
  )
}