# Firebase Setup Guide

Follow these steps to configure your Stilo Firebase project from scratch if you ever need to set up a new environment or recreate the backend.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com).
2. Click **Create a project**. Name it (e.g., `stilo-app`).
3. Disable Google Analytics for now unless you specifically want it.
4. Once created, click the **Web `</>`** icon to add a web app.
5. Register the app. Firebase will provide a block of `firebaseConfig` keys. Copy these values into your local `.env` file as `EXPO_PUBLIC_FIREBASE_*` (e.g., `EXPO_PUBLIC_FIREBASE_API_KEY`).

## 2. Enable Authentication
Authentication is crucial for both Customers and Business Owners.
1. Go to **Authentication** in the sidebar.
2. Click **Get Started**.
3. Go to the **Sign-in method** tab and enable:
   * **Email/Password**
   * **Google**
4. *Important Note for Google Sign-In*: You must configure a support email, and if you deploy to Vercel/Netlify, you MUST add your deployment URL to the **Authorized domains** list in the Authentication Settings tab.

## 3. Enable Firestore Database
1. Go to **Firestore Database** in the sidebar.
2. Click **Create database**.
3. Start in **Production mode**.
4. Choose a server location closest to your users.
5. Our code automatically handles structuring the data (creating `businesses`, `profiles`, and `bookings` collections). You do not need to pre-create these!

## 4. Enable Storage
1. Go to **Storage** in the sidebar.
2. Click **Get Started**.
3. Start in **Production mode**.
4. Important: Creating Firebase Storage buckets now requires upgrading your Firebase project to the **Blaze (Pay-as-you-go) plan**. The free-tier storage thresholds still apply, meaning you won't be charged unless your app explodes in popularity and you exceed gigabytes of hosting.

## 5. Deploy Security Rules
The local repository contains highly robust security rules (`firestore.rules` and `storage.rules`) to protect your specific salon data (ensuring businesses can only edit their own shops, customers can only view availability, etc).

You must deploy these rules from your terminal to your Firebase project:

```bash
# Login to Firebase CLI
npx firebase-tools login

# Connect to your specific project
npx firebase-tools use --add

# Deploy ONLY the security rules and storage configuration
npx firebase-tools deploy --only firestore:rules,storage
```

Your new Firebase backend is fully set up, secured, and ready to go!
