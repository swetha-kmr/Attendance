'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from './auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'employee'
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }

    if (
      !loading &&
      user &&
      userProfile &&
      requiredRole &&
      userProfile.role !== requiredRole
    ) {
      // Redirect to appropriate dashboard
      if (userProfile.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    }
  }, [user, userProfile, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  if (requiredRole && userProfile.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
