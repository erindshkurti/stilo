# Stilo - Salon Booking Platform

A modern, full-stack salon booking application built with React Native and Expo, enabling customers to discover and book appointments with hair stylists and salons.

## ✨ Key Features

### For Customers
- **Smart Search** - Find salons by location and service with autocomplete suggestions
- **Browse & Discover** - Explore featured salons and view detailed business profiles
- **Easy Booking** - Select services, choose time slots, and book appointments seamlessly
- **Profile Management** - Track bookings and manage personal information
- **Google Sign-In** - Quick authentication with Google OAuth

### For Business Owners
- **Business Onboarding** - Multi-step wizard to set up salon profile
- **Dashboard** - Comprehensive view of business information and bookings
- **Service Management** - Add and manage services with pricing and duration
- **Portfolio Gallery** - Showcase work with image uploads and featured images
- **Business Hours** - Configure operating hours for each day of the week
- **Team Management** - Add and manage stylists
- **Cover Images** - Upload custom cover images for business profile

## 🛠 Technology Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tooling
- **Expo Router** - File-based routing system
- **NativeWind** - Tailwind CSS for React Native
- **TypeScript** - Type-safe development

### Backend & Services
- **Firebase** - Backend-as-a-Service
  - Cloud Firestore (NoSQL Document Database)
  - Firebase Authentication (Email/Password & Google OAuth)
  - Firebase Storage (Image uploads)
  - Firebase Security Rules

### Key Libraries
- `expo-image-picker` - Image selection and upload
- `expo-linear-gradient` - UI gradients
- `@expo/vector-icons` - Icon library
- `@react-native-async-storage/async-storage` - Local storage
- `react-native-safe-area-context` - Safe area handling

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account and project

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stilo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Database & Storage Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (Production mode)
3. Enable **Firebase Storage**
4. Enable **Authentication** (Email/Password and Google providers)

### 5. Deploy Security Rules

Install the Firebase CLI and deploy the custom security rules:
```bash
npx firebase-tools deploy --only firestore:rules,storage
```

### 6. Start the Development Server

```bash
npx expo start
```

This will start the Expo development server. You can then:
- Press `w` to open in web browser
- Press `i` to open in iOS simulator (macOS only)
- Press `a` to open in Android emulator
- Scan QR code with Expo Go app on your mobile device

## 📱 Running on Different Platforms

### Web
```bash
npx expo start --web
```

### iOS Simulator (macOS only)

The project supports both the standard Expo flow and a custom Development Client build.

**1. Standard Expo Start**
```bash
npx expo start --ios
```

**2. Native Development Build (Recommended for Native Features)**
This custom script bypasses the known `devicectl` Xcode 16 network bug and forces the raw native compilation specifically for your active Simulator:
```bash
npm run simulator:ios
```

#### 🛠 Troubleshooting iOS Sync Issues
If the simulator is not reflecting your code changes (stale bundle):

1.  **Kill any zombie Metro processes**:
    Find the process ID (PID) from the "Port 8081 is running" error and kill it:
    ```bash
    kill <PID>
    ```
2.  **Restart with a clear cache**:
    ```bash
    npx expo start --clear
    ```
3.  **Force Build**: If all else fails, force a fresh native build:
    ```bash
    CI=1 npx expo run:ios
    ```

### Android
```bash
npx expo start --android
```

## 🏗 Project Structure

```
stilo/
├── app/                    # Application screens (file-based routing)
│   ├── index.tsx          # Landing page
│   ├── search.tsx         # Search results
│   ├── sign-in.tsx        # Authentication
│   ├── profile.tsx        # Customer profile
│   ├── booking/           # Booking flow
│   └── business/          # Business owner screens
│       ├── dashboard.tsx  # Business dashboard
│       ├── onboarding.tsx # Business setup wizard
│       └── settings.tsx   # Business settings
├── components/            # Reusable UI components
│   ├── Header.tsx
│   ├── StylistCard.tsx
│   ├── AutocompleteInput.tsx
│   └── onboarding/        # Onboarding form components
├── lib/                   # Utilities and services
│   ├── firebase.ts       # Firebase initialization & exports
│   ├── auth.tsx          # Authentication context listener
│   └── search.ts         # Search utilities
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage security rules
└── firebase.json          # Firebase deployment config
```

## 🗄 Database Schema (Firestore)

The app uses a NoSQL document structure in Cloud Firestore:

### Top Level Collections
- `profiles/{userId}` - Customer and business owner profiles
- `businesses/{businessId}` - Salon/business information
- `bookings/{bookingId}` - All customer appointments across businesses

### Subcollections (under `businesses/{businessId}`)
- `services/{serviceId}` - Offerings and prices
- `hours/{hourId}` - Operating hours
- `stylists/{stylistId}` - Team members
- `portfolio/{imageId}` - Gallery images

## 🔐 Authentication

The app supports two authentication methods:
1. **Email/Password** - Traditional signup and login
2. **Google OAuth** - Quick sign-in with Google account

User types:
- `customer` - Can browse and book appointments
- `business` - Can manage salon profile and services

## 📝 Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run lint` - Run ESLint

## 🎨 Design Features

- Responsive design for mobile and desktop
- Modern UI with glassmorphism effects
- Smooth animations and transitions
- Consistent 1200px max-width layout
- Dark mode support (coming soon)

## 🚢 Deployment

### Web Deployment

The application is configured for deployment to Vercel. For detailed deployment instructions, see:
- `docs/vercel_deployment.md` - Complete Vercel deployment guide
- `docs/deployment_guide.md` - General deployment overview

### Firebase Setup

For deployment of database rules and configuration:
- Ensure `.firebaserc` points to your project aliases.
- Deploy changes with `npx firebase-tools deploy`.

> **Note**: Legacy Supabase documentation remains in `docs/` for historical context only. The application is now fully reliant on Firebase.

### Mobile Deployment (iOS)

The application is configured for cloud builds using Expo Application Services (EAS). Building locally is not recommended due to complex certificate and keychain management.

**Prerequisites:**
- Ensure `GoogleService-Info.plist` is uploaded as an EAS secret.
  ```bash
  eas secret:create --scope project --name GOOGLE_SERVICES_IOS --type file --value ./GoogleService-Info.plist
  ```
- Ensure the app is registered in **App Store Connect** and the bundle ID has the **Sign In with Apple** capability enabled in the Apple Developer Portal.

**Build & Submit to App Store Connect:**
To natively bump the version number, compile the `.ipa` locally on your Mac's CPU (bypassing the slow Expo cloud queues), and automatically submit it to TestFlight:
```bash
npm run deploy:ios
```
This single command ensures Apple doesn't reject duplicate versions, leverages local compilation for peak speed, and pushes the binary securely straight to your App Store Connect account.

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainers.
