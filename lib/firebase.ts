import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAIVn5BP-So-O6byCMDGMjueD5F5o5Rl7U",
  authDomain: "attendance-system-93513.firebaseapp.com",
  projectId: "attendance-system-93513",
  storageBucket: "attendance-system-93513.firebasestorage.app",
  messagingSenderId: "63116454206",
  appId: "1:63116454206:web:42d08707a39bb4453ca46f",
}

// Main App
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp()

// Secondary App (for creating employees without affecting main auth session)
const secondaryApp =
  getApps().find(a => a.name === 'Secondary') ||
  initializeApp(firebaseConfig, 'Secondary')

export const auth = getAuth(app)
export const secondaryAuth = getAuth(secondaryApp)
export const db = getFirestore(app)


export const DEV = process.env.NODE_ENV === 'development'
export default app