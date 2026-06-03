# Firebase Setup Guide

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `attendance-manager`
4. Accept terms and click "Create project"
5. Wait for the project to be created

## 2. Get Firebase Credentials

1. In Firebase Console, click the gear icon → Project Settings
2. Go to "Service accounts" tab
3. Click "Generate new private key" (save this securely, it's sensitive)
4. Go to "General" tab and find your Web app credentials
5. Copy these values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

## 3. Setup Environment Variables

Create a `.env.local` file in your project root with these values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 4. Enable Firebase Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. In "Sign-in method" tab, enable "Email/Password"
4. Click "Email/Password"
5. Toggle "Enable" and save

## 5. Create Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (change to production rules later)
4. Select region (closest to your users)
5. Click "Create"

## 6. Create Demo Users

1. Go to Authentication → Users
2. Click "Add user"
3. Create admin account:
   - Email: `admin@company.com`
   - Password: `Demo123!`
4. Create employee account:
   - Email: `employee@company.com`
   - Password: `Demo123!`

## 7. Add Collections & Security Rules

After creating users, run this in the Firestore console to initialize collections:

### Create Collections

1. Click "Start collection"
2. Name it `users`
3. Click "Auto-ID" to add a document
4. Add these fields for admin:

```
uid: admin@company.com (uid from auth)
name: Admin User
email: admin@company.com
role: admin (string)
phoneNumber: +1234567890 (string)
department: Management (string)
designation: Administrator (string)
createdAt: (server timestamp)
lastLogin: (server timestamp)
status: active (string)
```

Repeat for employee account with role: `employee`

### Create More Collections

1. `attendance` - empty (will be populated by app)
2. `leaveRequests` - empty (will be populated by app)
3. `loginActivity` - empty (will be populated by app)

## 8. Security Rules

Go to Firestore → Rules and update with these production rules:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId || request.auth.uid == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if request.auth.uid == userId || request.auth.uid == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Attendance collection
    match /attendance/{document=**} {
      allow read: if request.auth.uid != null;
      allow create, update: if request.auth.uid != null && (
        resource.data.uid == request.auth.uid || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Leave Requests collection
    match /leaveRequests/{document=**} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid != null && resource.data.uid == request.auth.uid;
      allow update: if request.auth.uid != null && (
        resource.data.uid == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Login Activity collection
    match /loginActivity/{document=**} {
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth.uid != null;
    }
  }
}
```

## 9. Run the Application

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

## 10. Test the System

1. Go to http://localhost:3000
2. Log in with admin credentials: `admin@company.com` / `Demo123!`
3. Access admin dashboard at `/admin/dashboard`
4. Log out and log in as employee: `employee@company.com` / `Demo123!`
5. Access employee dashboard at `/employee/dashboard`

## Features Implemented

✅ **Authentication**
- Email/Password login with Firebase Auth
- Session persistence
- Logout functionality
- Protected routes

✅ **Admin Features**
- View all employees
- Monitor attendance statistics
- Manage leave requests (approve/reject)
- Track login activity
- Real-time data updates

✅ **Employee Features**
- View personal dashboard
- Check-in/check-out
- View attendance history
- Request leaves
- Update profile
- Check leave balance

✅ **Security**
- Role-based access control
- Firestore security rules
- Protected routes
- User-specific data isolation

## Troubleshooting

### Firebase credentials not found
- Make sure `.env.local` has all required variables
- Restart the dev server after adding env vars

### Users not appearing
- Check if users are created in Firebase Auth with correct roles in Firestore
- Verify Firestore security rules allow reading users

### Real-time updates not working
- Check browser console for errors
- Verify Firestore listeners are properly connected
- Check network tab for failed requests

## Next Steps

1. Set up Firebase Hosting for deployment
2. Configure email verification
3. Add password reset functionality
4. Set up attendance marking with geolocation
5. Implement attendance reports
6. Add notifications for leave approvals
7. Set up automated backup

For more info, visit [Firebase Documentation](https://firebase.google.com/docs)
