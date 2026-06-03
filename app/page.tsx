'use client'

import { useState,useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Lock, Mail, Clock, AlertCircle } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { userProfile } = useAuth()


useEffect(() => {
  if (!userProfile) return

  if (userProfile.role === 'admin') {
    router.push('/admin/dashboard')
  } else {
    router.push('/employee/dashboard')
  }
}, [userProfile, router])


const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()

  setError('')
  setLoading(true)

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    )

    const userDoc = await getDoc(
      doc(db, 'users', userCredential.user.uid)
    )


    if (!userDoc.exists()) {
  await signOut(auth)
  setError('User profile not found')
  return
}
    const userData = userDoc.data()

    if (userData?.status === 'inactive') {
      await signOut(auth)

      setError(
        'Your account has been deactivated. Please contact administrator.'
      )

      return
    }

    console.log('Login successful')
  } catch (error: any) {
  console.log('Firebase Login Error:', error.code)

  switch (error.code) {
    case 'auth/invalid-credential':
      setError('Invalid email or password')
      break

    case 'auth/invalid-email':
      setError('Please enter a valid email address')
      break

    case 'auth/too-many-requests':
      setError('Too many failed attempts. Please try again later.')
      break

    default:
      setError('Login failed. Please try again.')
  }
}
}



  // const handleDemoLogin = async (demoRole: 'admin' | 'employee') => {
  //   setError('')
  //   setLoading(true)

  //   try {
  //     const demoEmail = demoRole === 'admin' ? 'admin@company.com' : 'employee@company.com'
  //     const demoPassword = 'Demo123!'

  //     await signInWithEmailAndPassword(auth, demoEmail, demoPassword)
  //     // Auth context will handle the redirect
  //   } catch (err: any) {
  //     const errorMessage = demoRole === 'admin' 
  //       ? 'Admin demo account not available. Please create one in Firebase console.' 
  //       : 'Employee demo account not available. Please create one in Firebase console.'
  //     setError(errorMessage)
  //     console.error('Demo login error:', err)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-6 shadow-lg">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Attendance Manager</h1>
          <p className="text-slate-600">Sign in to your account to continue</p>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-xl border-0">
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
            {error && (
  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    <p className="text-sm text-red-700">{error}</p>
  </div>
)}

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-11 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              {/* Demo Credentials */}
              {/* <div className="pt-4 border-t border-slate-200 space-y-3">
                <p className="text-xs text-slate-600 font-medium text-center">Demo Login (create these accounts in Firebase)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleDemoLogin('admin')}
                    className="text-xs h-9 border-slate-200 hover:bg-slate-50"
                  >
                    Admin Demo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleDemoLogin('employee')}
                    className="text-xs h-9 border-slate-200 hover:bg-slate-50"
                  >
                    Employee Demo
                  </Button>
                </div>
              </div> */}
            </form>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-6">
          Protected by enterprise security standards
        </p>
      </div>
    </div>
  )
}
