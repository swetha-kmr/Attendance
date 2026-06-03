'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/lib/protected-route'
import { getLeaveRequestsByUser, createLeaveRequest, LeaveRequest } from '@/lib/firestore-service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogOut, Menu, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'

function EmployeeLeavesContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

    const loadLeaves = async () => {
      try {
        const data = await getLeaveRequestsByUser(userProfile.uid)
        setLeaves(data)
      } catch (err) {
        console.error('Error loading leaves:', err)
      }
    }

    loadLeaves()
  }, [userProfile])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!userProfile) throw new Error('User not found')
      if (!formData.startDate || !formData.endDate || !formData.reason) {
        throw new Error('Please fill all required fields')
      }

      const days = calculateDays()
      if (days < 1) {
        throw new Error('End date must be after start date')
      }

      await createLeaveRequest({
        uid: userProfile.uid,
        employeeName: userProfile.name,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        leaveType: formData.leaveType,
        reason: formData.reason,
        status: 'pending',
        createdAt: Timestamp.now(),
        days,
      })

      setSuccess('Leave request submitted successfully!')
      setFormData({
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: '',
      })
      setShowForm(false)

      // Reload leaves
      const data = await getLeaveRequestsByUser(userProfile.uid)
      setLeaves(data)

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-700'
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
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left">
                <span className="w-5 h-5">👤</span>
                <span className="font-medium">Profile</span>
              </button>
            </Link>
            <Link href="/employee/leaves">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left bg-slate-100">
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
            <h1 className="text-2xl font-bold text-slate-900">Leave Requests</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
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

          {/* Request Form */}
          {showForm && (
            <Card className="p-8 shadow-md mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">New Leave Request</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="leaveType" className="text-slate-700 font-medium">
                      Leave Type
                    </Label>
                    <select
                      id="leaveType"
                      name="leaveType"
                      value={formData.leaveType}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="vacation">Vacation</option>
                      <option value="personal">Personal Leave</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days" className="text-slate-700 font-medium">
                      Number of Days
                    </Label>
                    <Input
                      type="number"
                      value={calculateDays()}
                      disabled
                      className="h-11 bg-slate-100 border-slate-200 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-slate-700 font-medium">
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-slate-700 font-medium">
                      End Date
                    </Label>
                    <Input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                      className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-slate-700 font-medium">
                    Reason
                  </Label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    required
                    placeholder="Provide reason for leave request"
                    className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-500 resize-none h-24"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="mb-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              New Leave Request
            </Button>
          )}

          {/* Leave Requests List */}
          <Card className="p-6 shadow-md">
            <h2 className="text-lg font-bold text-slate-900 mb-4">My Leave Requests</h2>
            <div className="space-y-4">
              {leaves.length > 0 ? (
                leaves.map((leave, index) => (
                  <div
                    key={index}
                    className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {leave.startDate.toDate().toLocaleDateString()} - {leave.endDate.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeColor(leave.status)}`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{leave.reason}</p>
                    <p className="text-xs text-slate-500">
                      {leave.days} days · Applied on {leave.createdAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No leave requests yet</p>
              )}
            </div>
          </Card>
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
