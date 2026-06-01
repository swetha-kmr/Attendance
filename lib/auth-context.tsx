'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

export interface UserProfile {
  uid: string
  email: string
  name: string
  role: 'admin' | 'employee'
  profileImage?: string
  phoneNumber?: string
  department?: string
  designation?: string
  createdAt: Timestamp
  lastLogin: Timestamp
  status: 'active' | 'inactive'
}

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDoc = await getDoc(userDocRef)
          setUser(firebaseUser)

          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile
            setUserProfile(profileData)

            // Update last login
            await setDoc(
              userDocRef,
              { lastLogin: Timestamp.now() },
              { merge: true }
            )

            // Log login activity
            await logLoginActivity(firebaseUser.uid, 'login')
          } else {
            // Create default profile if doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              role: 'employee',
              createdAt: Timestamp.now(),
              lastLogin: Timestamp.now(),
              status: 'active',
            }
            await setDoc(userDocRef, newProfile)
            setUserProfile(newProfile)
          }

          setUser(firebaseUser)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      if (user) {
        await logLoginActivity(user.uid, 'logout')
      }
      await firebaseSignOut(auth)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')

    try {
      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, updates, { merge: true })

      // Update local state
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null))
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const logLoginActivity = async (uid: string, status: 'login' | 'logout') => {
    try {
      const activityRef = doc(db, 'loginActivity', `${uid}_${Date.now()}`)
      await setDoc(activityRef, {
        uid,
        status,
        timestamp: Timestamp.now(),
        role: userProfile?.role || 'employee',
      })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signOut, updateUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
