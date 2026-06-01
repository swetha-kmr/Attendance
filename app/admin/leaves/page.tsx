'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function LeaveManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const leaveRequests = [
    {
      id: 1,
      employeeName: 'John Doe',
      email: 'john@company.com',
      leaveType: 'Casual Leave',
      startDate: '2024-02-10',
      endDate: '2024-02-12',
      days: 3,
      reason: 'Personal work',
      status: 'Pending',
      requestDate: '2024-02-05',
    },
    {
      id: 2,
      employeeName: 'Sarah Smith',
      email: 'sarah@company.com',
      leaveType: 'Sick Leave',
      startDate: '2024-02-08',
      endDate: '2024-02-08',
      days: 1,
      reason: 'Medical appointment',
      status: 'Approved',
      requestDate: '2024-02-07',
    },
    {
      id: 3,
      employeeName: 'Mike Johnson',
      email: 'mike@company.com',
      leaveType: 'Vacation',
      startDate: '2024-02-20',
      endDate: '2024-02-25',
      days: 6,
      reason: 'Family vacation',
      status: 'Pending',
      requestDate: '2024-02-01',
    },
    {
      id: 4,
      employeeName: 'Emily Davis',
      email: 'emily@company.com',
      leaveType: 'Casual Leave',
      startDate: '2024-01-28',
      endDate: '2024-01-28',
      days: 1,
      reason: 'Family event',
      status: 'Approved',
      requestDate: '2024-01-25',
    },
    {
      id: 5,
      employeeName: 'Robert Wilson',
      email: 'robert@company.com',
      leaveType: 'Vacation',
      startDate: '2024-02-15',
      endDate: '2024-02-18',
      days: 4,
      reason: 'Planning travel',
      status: 'Rejected',
      requestDate: '2024-01-30',
    },
    {
      id: 6,
      employeeName: 'Lisa Anderson',
      email: 'lisa@company.com',
      leaveType: 'Sick Leave',
      startDate: '2024-02-09',
      endDate: '2024-02-09',
      days: 1,
      reason: 'Not feeling well',
      status: 'Pending',
      requestDate: '2024-02-08',
    },
  ]

  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch =
      request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: leaveRequests.filter((r) => r.status === 'Pending').length,
    approved: leaveRequests.filter((r) => r.status === 'Approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'Rejected').length,
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Leave Management</h1>
          <p className="text-slate-600">Review and manage employee leave requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Clock,
              label: 'Pending',
              value: stats.pending,
              color: 'from-amber-600 to-amber-700',
            },
            {
              icon: CheckCircle,
              label: 'Approved',
              value: stats.approved,
              color: 'from-green-600 to-green-700',
            },
            {
              icon: XCircle,
              label: 'Rejected',
              value: stats.rejected,
              color: 'from-red-600 to-red-700',
            },
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Employee
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-50"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Request Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{filteredRequests.length}</span> requests
              </div>
            </div>
          </div>
        </Card>

        {/* Leave Requests Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Employee</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Leave Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Start Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">End Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Days</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Reason</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                          {request.employeeName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.employeeName}</p>
                          <p className="text-xs text-slate-500">{request.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`border-0 ${
                          request.leaveType === 'Casual Leave'
                            ? 'bg-blue-100 text-blue-700'
                            : request.leaveType === 'Sick Leave'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {request.leaveType}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {new Date(request.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {new Date(request.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{request.days}</td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 max-w-xs truncate">{request.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`border-0 ${
                          request.status === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : request.status === 'Approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {request.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {request.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
