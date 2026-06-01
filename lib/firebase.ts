import { initializeApp } from 'firebase/app'
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

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app