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
import { db } from './firebase'
import { UserProfile } from './auth-context'


// Users Service
export async function createUser(userData: UserProfile) {
  try {
    const userRef = doc(db, 'users', userData.uid)
    await setDoc(userRef, userData)
    return userData
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null
  } catch (error) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersCollection = collection(db, 'users')
    const snapshot = await getDocs(usersCollection)
    return snapshot.docs.map((doc) => doc.data() as UserProfile)
  } catch (error) {
    console.error('Error getting all users:', error)
    throw error
  }
}

export async function updateUser(uid: string, updates: Partial<UserProfile>) {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, updates)
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export const deleteUser = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid)
  await deleteDoc(userRef)
}
export async function deactivateUser(uid: string) {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, { status: 'inactive' })
  } catch (error) {
    console.error('Error deactivating user:', error)
    throw error
  }
}

// Attendance Service
export interface AttendanceRecord {
  id?: string
  uid: string
  date: Timestamp
  checkInTime?: Timestamp
  checkOutTime?: Timestamp
  status: 'present' | 'absent' | 'on-leave'
  workHours?: number
}

export async function recordAttendance(
  attendance: Omit<AttendanceRecord, 'id'>
) {
  try {
    const attendanceCollection = collection(db, 'attendance')
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
      collection(db, 'attendance'),
      where('uid', '==', uid),
      orderBy('date', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as AttendanceRecord))
  } catch (error) {
    console.error('Error getting attendance:', error)
    throw error
  }
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  try {
    const q = query(
      collection(db, 'attendance'),
      orderBy('date', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
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
    const attendanceRef = doc(db, 'attendance', attendanceId)
    await updateDoc(attendanceRef, updates)
  } catch (error) {
    console.error('Error updating attendance:', error)
    throw error
  }
}

// Leave Request Service
export interface LeaveRequest {
  id?: string
  uid: string
  employeeName: string
  startDate: Timestamp
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
    const leaveCollection = collection(db, 'leaveRequests')
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
      collection(db, 'leaveRequests'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as LeaveRequest))
  } catch (error) {
    console.error('Error getting leave requests:', error)
    throw error
  }
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const q = query(
      collection(db, 'leaveRequests'),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as LeaveRequest))
  } catch (error) {
    console.error('Error getting all leave requests:', error)
    throw error
  }
}

export async function approveLeaveRequest(
  leaveId: string,
  adminUid: string
) {
  try {
    const leaveRef = doc(db, 'leaveRequests', leaveId)
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
    const leaveRef = doc(db, 'leaveRequests', leaveId)
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

// Real-time Listener for Leave Requests
export function subscribeToLeaveRequests(
  callback: (leaves: LeaveRequest[]) => void
) {
  const q = query(
    collection(db, 'leaveRequests'),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const leaves = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as LeaveRequest))
    callback(leaves)
  })
}

// Real-time Listener for Users
export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const usersCollection = collection(db, 'users')

  return onSnapshot(usersCollection, (snapshot) => {
    const users = snapshot.docs.map((doc) => doc.data() as UserProfile)
    callback(users)
  })
}

// Real-time Listener for Attendance
export function subscribeToAttendance(
  callback: (attendance: AttendanceRecord[]) => void
) {
  const q = query(
    collection(db, 'attendance'),
    orderBy('date', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as AttendanceRecord))
    callback(records)
  })
}
