import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db, DEV } from './firebase'
import { UserProfile } from './auth-context'

const c = (name: string) => DEV ? `dev_${name}` : name

// ── Users Service ─────────────────────────────────────────────────────────────

export async function createUser(userData: UserProfile) {
  try {
    const userRef = doc(db, c('users'), userData.uid)
    await setDoc(userRef, userData)
    return userData
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export const activateUser = async (uid: string) => {
  await updateDoc(doc(db, c('users'), uid), { status: 'active' })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, c('users'), uid))
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null
  } catch (error) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersCollection = collection(db, c('users'))
    const snapshot = await getDocs(usersCollection)
    return snapshot.docs.map((doc) => doc.data() as UserProfile)
  } catch (error) {
    console.error('Error getting all users:', error)
    throw error
  }
}

export async function updateUser(uid: string, updates: Partial<UserProfile>) {
  try {
    const userRef = doc(db, c('users'), uid)
    await updateDoc(userRef, updates)
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export const deleteUser = async (uid: string): Promise<void> => {
  const userRef = doc(db, c('users'), uid)
  await deleteDoc(userRef)
}

export async function deactivateUser(uid: string) {
  try {
    const userRef = doc(db, c('users'), uid)
    await updateDoc(userRef, { status: 'inactive' })
  } catch (error) {
    console.error('Error deactivating user:', error)
    throw error
  }
}

// ── Attendance Service ────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id?: string
  uid: string
  userId?: string
  date: Timestamp
  checkInTime?: Timestamp | null
  checkOutTime?: Timestamp | null
  status: 'present' | 'absent' | 'on-leave'
  workHours?: number
}

export async function recordAttendance(
  attendance: Omit<AttendanceRecord, 'id'>
) {
  try {
    const attendanceCollection = collection(db, c('attendance'))
    const docRef = await addDoc(attendanceCollection, attendance)
    return { ...attendance, id: docRef.id }
  } catch (error) {
    console.error('Error recording attendance:', error)
    throw error
  }
}

export async function getAttendanceByUser(uid: string): Promise<AttendanceRecord[]> {
  try {
    const q = query(
      collection(db, c('attendance')),
      where('uid', '==', uid),
      orderBy('date', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as AttendanceRecord))
  } catch (error) {
    console.error('Error getting attendance:', error)
    throw error
  }
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  try {
    const q = query(
      collection(db, c('attendance')),
      orderBy('date', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as AttendanceRecord))
  } catch (error) {
    console.error('Error getting all attendance:', error)
    throw error
  }
}

export async function updateAttendance(
  attendanceId: string,
  updates: Partial<AttendanceRecord>
) {
  try {
    const attendanceRef = doc(db, c('attendance'), attendanceId)
    await updateDoc(attendanceRef, updates)
  } catch (error) {
    console.error('Error updating attendance:', error)
    throw error
  }
}

// ── Leave Request Service ─────────────────────────────────────────────────────

export interface LeaveRequest {
  id?: string
  uid: string
  employeeName: string
  email?: string
  startDate: Timestamp
  updatedAt?: Timestamp
  endDate: Timestamp
  leaveType: 'casual' | 'sick' | 'vacation' | 'personal'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvalDate?: Timestamp
  createdAt: Timestamp
  days: number
}

export async function createLeaveRequest(
  leaveRequest: Omit<LeaveRequest, 'id'>
) {
  try {
    const leaveCollection = collection(db, c('leaveRequests'))
    const docRef = await addDoc(leaveCollection, leaveRequest)
    return { ...leaveRequest, id: docRef.id }
  } catch (error) {
    console.error('Error creating leave request:', error)
    throw error
  }
}

export async function getLeaveRequestsByUser(uid: string): Promise<LeaveRequest[]> {
  try {
    const q = query(
      collection(db, c('leaveRequests')),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as LeaveRequest))
  } catch (error) {
    console.error('Error getting leave requests:', error)
    throw error
  }
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const q = query(
      collection(db, c('leaveRequests')),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as LeaveRequest))
  } catch (error) {
    console.error('Error getting all leave requests:', error)
    throw error
  }
}

export async function approveLeaveRequest(leaveId: string, adminUid: string) {
  try {
    const leaveRef = doc(db, c('leaveRequests'), leaveId)
    await updateDoc(leaveRef, {
      status: 'approved',
      approvedBy: adminUid,
      approvalDate: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error approving leave request:', error)
    throw error
  }
}

export async function rejectLeaveRequest(leaveId: string, adminUid: string) {
  try {
    const leaveRef = doc(db, c('leaveRequests'), leaveId)
    await updateDoc(leaveRef, {
      status: 'rejected',
      approvedBy: adminUid,
      approvalDate: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error rejecting leave request:', error)
    throw error
  }
}

export async function createAdminLeaveEntry(
  uid: string,
  employeeName: string,
  date: string,
  adminUid: string,
): Promise<void> {
  try {
    const dateTs = Timestamp.fromDate(new Date(date + 'T00:00:00'))
    await addDoc(collection(db, c('leaveRequests')), {
      uid,
      employeeName,
      startDate:    dateTs,
      endDate:      dateTs,
      leaveType:    'casual',
      reason:       'Marked on leave by admin',
      status:       'approved',
      approvedBy:   adminUid,
      approvalDate: Timestamp.now(),
      createdAt:    Timestamp.now(),
      days:         1,
    })
  } catch (error) {
    console.error('Error creating admin leave entry:', error)
    throw error
  }
}

// ── Real-time Listeners ───────────────────────────────────────────────────────

export function subscribeToLeaveRequests(
  callback: (leaves: LeaveRequest[]) => void
) {
  const q = query(
    collection(db, c('leaveRequests')),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const leaves = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as LeaveRequest))
      callback(leaves)
    },
    (error) => {
      console.error('subscribeToLeaveRequests error:', error.code, error.message)
    }
  )
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const usersCollection = collection(db, c('users'))
  return onSnapshot(
    usersCollection,
    (snapshot) => {
      const users = snapshot.docs.map((docSnap) => docSnap.data() as UserProfile)
      callback(users)
    },
    (error) => {
      console.error('subscribeToUsers error:', error.code, error.message)
    }
  )
}

export function subscribeToAttendance(
  callback: (attendance: AttendanceRecord[]) => void
) {
  const q = query(
    collection(db, c('attendance')),
    orderBy('date', 'desc')
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        const uid: string = data.uid || data.userId || ''
        return {
          ...data,
          uid,
          id: docSnap.id,
        } as AttendanceRecord
      })
      callback(records)
    },
    (error) => {
      console.error('subscribeToAttendance error:', error.code, error.message)
    }
  )
}