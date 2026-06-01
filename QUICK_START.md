# Quick Start Guide - 10 Minutes to Running

## Step 1: Create Firebase Project (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `attendance-manager`
4. Click "Create project"
5. Wait for completion

## Step 2: Get Credentials (2 minutes)

1. In Firebase → Project Settings (⚙️)
2. Go to "Your apps" → Click "Web" icon
3. Copy these 6 values:
   ```
   apiKey
   authDomain
   projectId
   storageBucket
   messagingSenderId
   appId
   ```

## Step 3: Create Environment File (1 minute)

Create `.env.local` in project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

## Step 4: Setup Firebase (3 minutes)

### 4a. Enable Email/Password Auth
1. Firebase → Authentication
2. Click "Get started" → "Email/Password"
3. Toggle "Enable" → Save

### 4b. Create Firestore
1. Firebase → Firestore Database
2. Click "Create database"
3. Select "Start in test mode"
4. Choose your region → Create

### 4c. Create Collections
In Firestore, click "Create collection":
- `users`
- `attendance`
- `leaveRequests`
- `loginActivity`

### 4d. Create Demo Users
1. Firebase → Authentication → Users
2. Click "Add user"
3. Create Account 1:
   - Email: `admin@company.com`
   - Password: `Demo123!`
4. Create Account 2:
   - Email: `employee@company.com`
   - Password: `Demo123!`

### 4e. Add User Documents
Go to Firestore → `users` collection → Add documents:

**Document 1 (Admin):**
```json
{
  "uid": "[ADMIN_USER_ID_FROM_AUTH]",
  "name": "Admin User",
  "email": "admin@company.com",
  "role": "admin",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLogin": "2024-01-01T00:00:00Z"
}
```

**Document 2 (Employee):**
```json
{
  "uid": "[EMPLOYEE_USER_ID_FROM_AUTH]",
  "name": "John Doe",
  "email": "employee@company.com",
  "role": "employee",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLogin": "2024-01-01T00:00:00Z"
}
```

**To get User IDs from Auth:**
1. Firebase → Authentication → Users
2. Click each user to see their UID
3. Copy the UID

### 4f. Set Security Rules
Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /attendance/{document=**} {
      allow read: if request.auth.uid != null;
      allow create, update: if request.auth.uid != null;
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /leaveRequests/{document=**} {
      allow read: if request.auth.uid != null;
      allow create, update: if request.auth.uid != null;
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /loginActivity/{document=**} {
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth.uid != null;
    }
  }
}
```

Click "Publish"

## Step 5: Run Application (1 minute)

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Open browser
# http://localhost:3000
```

## Step 6: Test It! (1 minute)

### Test as Admin:
1. Email: `admin@company.com`
2. Password: `Demo123!`
3. You should see: `/admin/dashboard`

### Test as Employee:
1. Click "Sign Out"
2. Email: `employee@company.com`
3. Password: `Demo123!`
4. You should see: `/employee/dashboard`

## Done! 🎉

Your attendance management system is now running!

## Key URLs

| Page | URL | Role |
|------|-----|------|
| Login | http://localhost:3000 | All |
| Admin Dashboard | http://localhost:3000/admin/dashboard | Admin |
| Employee Dashboard | http://localhost:3000/employee/dashboard | Employee |

## Common Issues

### "Firebase credentials not found"
- Check `.env.local` exists
- Verify all 6 values are correct
- Restart dev server

### "User not found"
- Check user document exists in Firestore `users` collection
- Verify `uid` field matches Auth user ID

### Login not working
- Check email/password in Firebase Auth
- Verify user document exists with correct role

### "Access denied"
- Check Firestore security rules are published
- Verify user is logged in

## Quick Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Run linter
pnpm lint
```

## Next Steps

1. Customize colors in `app/globals.css`
2. Add more employees
3. Test attendance tracking
4. Test leave requests
5. Deploy to Vercel (click "Publish")

## Need Help?

See full documentation:
- `README_FIREBASE.md` - Complete guide
- `FIREBASE_SETUP.md` - Detailed setup
- `IMPLEMENTATION_SUMMARY.md` - What's built

Enjoy! 🚀
