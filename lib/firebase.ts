import { getApp, getApps, initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern
let app;
let authInstance;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

if (Platform.OS === 'web') {
    authInstance = getAuth(app);
} else {
    try {
        const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
        const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
        authInstance = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
    } catch (e) {
        console.warn('Firebase Auth persistence init failed:', e);
        authInstance = getAuth(app);
    }
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
