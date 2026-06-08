'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

import FingerprintRoundedIcon   from '@mui/icons-material/FingerprintRounded'
import EmailRoundedIcon         from '@mui/icons-material/EmailRounded'
import LockRoundedIcon          from '@mui/icons-material/LockRounded'
import VisibilityRoundedIcon    from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import ErrorRoundedIcon         from '@mui/icons-material/ErrorRounded'
import BlockRoundedIcon         from '@mui/icons-material/BlockRounded'
import SecurityRoundedIcon      from '@mui/icons-material/SecurityRounded'
import PersonOffRoundedIcon     from '@mui/icons-material/PersonOffRounded'

export default function LoginPage() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [error, setError]               = useState('')
  const [isDeactivated, setIsDeactivated] = useState(false)
  const [isNotFound, setIsNotFound]     = useState(false)

  const router = useRouter()
  const { userProfile } = useAuth()

 
useEffect(() => {
  if (!userProfile) return
  if (userProfile.status === 'inactive') return  // ← add this line
  if (userProfile.role === 'admin') router.push('/admin/dashboard')
  else router.push('/employee/dashboard')
}, [userProfile, router])

  const clearErrors = () => {
    setError('')
    setIsDeactivated(false)
    setIsNotFound(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))

      if (!userDoc.exists()) {
        await signOut(auth)
        setIsNotFound(true)
        setLoading(false)
        return
      }

      const userData = userDoc.data()

      if (userData?.status === 'inactive') {
        await signOut(auth)
        setIsDeactivated(true)
        setLoading(false)
        return
      }

      // Update last login
      try {
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          lastLogin: serverTimestamp(),
        })
      } catch (_) {}

      // Auth context useEffect will handle redirect
    } catch (err: any) {
      setLoading(false)
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError('Invalid email or password.')
          break
        case 'auth/invalid-email':
          setError('Please enter a valid email address.')
          break
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.')
          break
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection.')
          break
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">

      <div className="w-full max-w-md">

        {/* ── Logo + Title ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-200 mb-5">
            <FingerprintRoundedIcon sx={{ fontSize: 28, color: '#fff' }} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">SeyonSync</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Sign in to your account</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Deactivated banner */} 
          {isDeactivated && (
            <div className="flex items-start gap-3 px-6 py-4 bg-red-50 border-b border-red-100">
              <BlockRoundedIcon sx={{ fontSize: 20, color: '#dc2626' }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-extrabold text-red-700">Please contact your administrator</p>
                {/* <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                  Your account has been deactivated. Please contact your administrator.
                </p> */}
              </div>
            </div>
          )}

          {/* Not found banner */}
          {isNotFound && (
            <div className="flex items-start gap-3 px-6 py-4 bg-amber-50 border-b border-amber-100">
              <PersonOffRoundedIcon sx={{ fontSize: 20, color: '#d97706' }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-extrabold text-amber-700">Account Not Found</p>
                <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                  No profile exists for this account. Please contact your administrator.
                </p>
              </div>
            </div>
          )}

          <div className="p-8 space-y-5">

            {/* General error (network, rate-limit, invalid email) */}
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-2xl">
                <ErrorRoundedIcon sx={{ fontSize: 18, color: '#dc2626' }} className="shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <EmailRoundedIcon sx={{ fontSize: 18 }} />
                  </span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearErrors() }}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockRoundedIcon sx={{ fontSize: 18 }} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearErrors() }}
                    required
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword
                      ? <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                      : <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                    }
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 accent-blue-600"
                  />
                  <span className="text-sm text-slate-500 font-medium">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-extrabold transition-all duration-200 shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-slate-400">
          <SecurityRoundedIcon sx={{ fontSize: 15 }} />
          <p className="text-xs font-medium">Protected by enterprise security standards</p>
        </div>

      </div>
    </div>
  )
}