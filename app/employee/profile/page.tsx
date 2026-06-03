'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogOut, Menu, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function EmployeeProfileContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    department: '',
    designation: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { userProfile, signOut, updateUserProfile } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await updateUserProfile({
        name: formData.name || userProfile?.name,
        phoneNumber: formData.phoneNumber || userProfile?.phoneNumber,
        department: formData.department || userProfile?.department,
        designation: formData.designation || userProfile?.designation,
      })
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold">
                E
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Attendance</h1>
                <p className="text-xs text-slate-500">Employee Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <Link href="/employee/dashboard">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left">
                <span className="w-5 h-5">📊</span>
                <span className="font-medium">Dashboard</span>
              </button>
            </Link>
            <Link href="/employee/profile">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left bg-slate-100">
                <span className="w-5 h-5">👤</span>
                <span className="font-medium">Profile</span>
              </button>
            </Link>
            <Link href="/employee/leaves">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left">
                <span className="w-5 h-5">📋</span>
                <span className="font-medium">Leaves</span>
              </button>
            </Link>
          </nav>

          {/* User Info & Logout */}
          <div className="px-4 py-6 border-t border-slate-200 space-y-4">
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Logged in as</p>
              <p className="font-medium text-slate-900 text-sm">{userProfile?.name}</p>
              <p className="text-xs text-slate-500">{userProfile?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                <span className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">✓</span>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Profile Form */}
            <Card className="p-8 shadow-md">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder={userProfile?.name}
                      value={formData.name}
                      onChange={handleInputChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      placeholder={userProfile?.phoneNumber || '+1234567890'}
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-slate-700 font-medium">
                      Department
                    </Label>
                    <Input
                      id="department"
                      name="department"
                      placeholder={userProfile?.department || 'Engineering'}
                      value={formData.department}
                      onChange={handleInputChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation" className="text-slate-700 font-medium">
                      Designation
                    </Label>
                    <Input
                      id="designation"
                      name="designation"
                      placeholder={userProfile?.designation || 'Software Engineer'}
                      value={formData.designation}
                      onChange={handleInputChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Email (Read-only)</Label>
                  <Input
                    type="email"
                    value={userProfile?.email || ''}
                    disabled
                    className="h-11 bg-slate-100 border-slate-200 cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Link href="/employee/dashboard">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Card>
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
