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
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (Email/Password & Google OAuth)
  - Storage for images
  - Row Level Security (RLS)

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
- Supabase account and project

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
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

Run the SQL migrations in your Supabase project:

1. Execute `bookings_schema.sql` to create the database schema
2. (Optional) Run `seed_data.sql` to populate with sample data

### 5. Configure Supabase Storage

Create the following storage buckets in Supabase:
- `avatars` - For user profile pictures
- `business-covers` - For business cover images
- `portfolio` - For business portfolio images

Enable public access and configure RLS policies as needed.

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

### iOS (macOS only)
```bash
npx expo start --ios
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
│   ├── supabase.ts       # Supabase client
│   ├── auth.tsx          # Authentication context
│   └── search.ts         # Search utilities
└── data/                  # Mock data (deprecated)
```

## 🗄 Database Schema

### Main Tables
- `profiles` - User profiles (customers and business owners)
- `businesses` - Salon/business information
- `services` - Services offered by businesses
- `business_hours` - Operating hours
- `stylists` - Team members
- `bookings` - Customer appointments
- `business_portfolio_images` - Portfolio gallery images

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

### Database Setup

For Supabase configuration and database setup, see:
- `docs/supabase_setup.md` - Supabase project configuration
- `docs/database_setup.md` - Database schema setup

### Mobile Deployment

For iOS and Android deployment using Expo Application Services (EAS), refer to the Expo EAS documentation.

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainers.
