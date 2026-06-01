# Attendance Management System - Firebase Setup Guide

This is a complete, production-ready attendance management system with role-based access control, built with React, Next.js, Firebase Authentication, and Firestore.

## Features

### ✅ Authentication & Security
- Email/Password authentication with Firebase Auth
- Role-based access control (Admin & Employee)
- Protected routes with automatic redirection
- Session persistence
- Login activity tracking

### ✅ Admin Dashboard
- Real-time employee statistics
- Attendance overview (present, absent, on leave)
- Leave request management (approve/reject)
- Employee management
- Activity timeline
- Quick action links

### ✅ Employee Dashboard
- Personal check-in/check-out
- Attendance history
- Leave balance tracking
- Leave request submission
- Profile management
- Real-time data updates

### ✅ Admin Features
- View all employees
- Manage employee accounts (create, edit, deactivate)
- Monitor attendance records
- Approve/reject leave requests
- View login activity logs
- Department and designation tracking

### ✅ Employee Features
- Check-in/check-out functionality
- View personal attendance history
- Request leaves (casual, sick, vacation, personal)
- Update profile information
- Track leave balance
- View leave request status

## Quick Start (5 minutes)

### 1. Clone or Download the Project
```bash
cd attendance-manager
pnpm install
```

### 2. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" → Enter `attendance-manager` → Click "Create"
3. Wait for project to be ready

### 3. Get Firebase Credentials
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Service accounts** tab
3. Under "Web App" section, find your Web app credentials
4. You'll see your Firebase config - copy these values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### 4. Setup Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Enable Firebase Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get started** → **Sign-in method**
3. Click **Email/Password**
4. Toggle "Enable" and save

### 6. Create Firestore Database
1. Go to **Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (change to production rules later)
4. Select your region and click **Create**

### 7. Create Demo Users in Firebase Auth
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Create two accounts:

**Admin Account:**
- Email: `admin@company.com`
- Password: `Demo123!`

**Employee Account:**
- Email: `employee@company.com`
- Password: `Demo123!`

### 8. Initialize Firestore Collections
Click "Create collection" for each:
- `users` (add docs later)
- `attendance`
- `leaveRequests`
- `loginActivity`

### 9. Add User Documents to Firestore
In Firestore Console, under `users` collection, create two documents:

**Document 1 (for admin):**
```
uid: [same as admin user ID from Auth]
name: Admin User
email: admin@company.com
role: admin
phoneNumber: +1234567890
department: Management
designation: Administrator
createdAt: (server timestamp)
lastLogin: (server timestamp)
status: active
```

**Document 2 (for employee):**
```
uid: [same as employee user ID from Auth]
name: John Doe
email: employee@company.com
role: employee
phoneNumber: +1234567890
department: Engineering
designation: Software Engineer
createdAt: (server timestamp)
lastLogin: (server timestamp)
status: active
```

### 10. Setup Firestore Security Rules
Go to **Firestore** → **Rules** and replace with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own, admins can read/write all
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Attendance - read all, create/update own or as admin, admin can delete
    match /attendance/{document=**} {
      allow read: if request.auth.uid != null;
      allow create, update: if request.auth.uid != null && (
        resource.data.uid == request.auth.uid || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Leave Requests - read all, create own, update own or as admin
    match /leaveRequests/{document=**} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid != null && resource.data.uid == request.auth.uid;
      allow update: if request.auth.uid != null && (
        resource.data.uid == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Login Activity - admins can read, anyone can create
    match /loginActivity/{document=**} {
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth.uid != null;
    }
  }
}
```

### 11. Run the Application
```bash
pnpm dev
```

Visit http://localhost:3000 and log in with:
- **Admin:** `admin@company.com` / `Demo123!`
- **Employee:** `employee@company.com` / `Demo123!`

## Project Structure

```
app/
├── page.tsx                    # Login page
├── admin/
│   ├── dashboard/page.tsx      # Admin dashboard
│   ├── employees/page.tsx      # Employee management
│   ├── attendance/page.tsx     # Attendance records
│   └── leaves/page.tsx         # Leave management
├── employee/
│   ├── dashboard/page.tsx      # Employee dashboard
│   ├── profile/page.tsx        # Profile management
│   └── leaves/page.tsx         # Leave requests
└── layout.tsx                  # Root layout with AuthProvider

lib/
├── firebase.ts                 # Firebase configuration
├── auth-context.tsx            # Authentication context
├── protected-route.tsx         # Protected route wrapper
└── firestore-service.ts        # Firestore operations

components/ui/                  # Shadcn components
```

## API/Service Methods

### Authentication
```typescript
signInWithEmailAndPassword(auth, email, password)
signOut(auth)
```

### User Management
```typescript
createUser(userData)
getUserProfile(uid)
getAllUsers()
updateUser(uid, updates)
deactivateUser(uid)
```

### Attendance
```typescript
recordAttendance(attendance)
getAttendanceByUser(uid)
getAllAttendance()
updateAttendance(attendanceId, updates)
subscribeToAttendance(callback)
```

### Leave Requests
```typescript
createLeaveRequest(leaveRequest)
getLeaveRequestsByUser(uid)
getAllLeaveRequests()
approveLeaveRequest(leaveId, adminUid)
rejectLeaveRequest(leaveId, adminUid)
subscribeToLeaveRequests(callback)
```

## Firestore Collections Schema

### users
```
{
  uid: string,
  name: string,
  email: string,
  role: 'admin' | 'employee',
  phoneNumber?: string,
  department?: string,
  designation?: string,
  profileImage?: string,
  createdAt: Timestamp,
  lastLogin: Timestamp,
  status: 'active' | 'inactive'
}
```

### attendance
```
{
  id: string,
  uid: string,
  date: Timestamp,
  checkInTime?: Timestamp,
  checkOutTime?: Timestamp,
  status: 'present' | 'absent' | 'on-leave',
  workHours?: number
}
```

### leaveRequests
```
{
  id: string,
  uid: string,
  employeeName: string,
  startDate: Timestamp,
  endDate: Timestamp,
  leaveType: 'casual' | 'sick' | 'vacation' | 'personal',
  reason: string,
  status: 'pending' | 'approved' | 'rejected',
  approvedBy?: string,
  approvalDate?: Timestamp,
  createdAt: Timestamp,
  days: number
}
```

### loginActivity
```
{
  uid: string,
  status: 'login' | 'logout',
  timestamp: Timestamp,
  role: 'admin' | 'employee'
}
```

## Deployment

### Deploy to Vercel
```bash
# Push to GitHub first
git add .
git commit -m "Initial commit"
git push

# Then:
# 1. Go to https://vercel.com
# 2. Click "New Project"
# 3. Import your repository
# 4. Add environment variables (same as .env.local)
# 5. Deploy
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Troubleshooting

### Error: "Firebase credentials not found"
- Make sure `.env.local` exists with all required variables
- Restart the dev server after adding env vars
- Check that all env variable names are exact

### Error: "User not found in Firestore"
- Make sure user documents exist in the `users` collection
- Check that `uid` in Firestore matches the Auth user ID
- Use the exact same email in both Auth and Firestore

### Error: "Access denied" when reading data
- Check Firestore security rules
- Make sure user is logged in (check Auth state)
- Verify user role in Firestore document

### Real-time updates not working
- Check browser console for errors
- Verify Firestore listeners are connected
- Check network tab for failed requests

### Login loop - redirecting continuously
- Clear browser cache and cookies
- Check if user document exists in Firestore
- Verify Auth state in browser console

## Security Considerations

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Firebase config is public** - It's meant to be exposed in the client
3. **Security is enforced in Firestore rules**, not in the client
4. **Use HTTPS in production**
5. **Regularly audit login activity logs**
6. **Implement rate limiting for login attempts** (Firebase provides this)
7. **Use strong passwords** - Enforce in your system
8. **Regular backups** - Set up Firestore backups
9. **Monitor for suspicious activity** - Check login logs
10. **Update dependencies** - Keep npm packages updated

## Next Steps

1. **Customize theme colors** - Update `globals.css` design tokens
2. **Add attendance marking location** - Use Geolocation API
3. **Setup email notifications** - Firebase Cloud Functions
4. **Add bulk employee import** - CSV upload feature
5. **Create attendance reports** - Generate PDFs
6. **Setup automatic leave balance reset** - Cron jobs
7. **Add performance metrics** - Analytics dashboard
8. **Implement 2FA** - Additional security
9. **Setup employee feedback** - Performance reviews
10. **Add mobile app** - React Native version

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)

## License

This project is open source and available under the MIT License.

---

**Last Updated:** May 2026
**Firebase SDK Version:** 12.14.0
**Next.js Version:** 16.0.0
