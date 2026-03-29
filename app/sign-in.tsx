import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { collection, collectionGroup, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, OAuthProvider } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../components/Button';
import { GoogleLogo } from '../components/GoogleLogo';
import { FormInput } from '../components/FormInput';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { auth, db } from '../lib/firebase';

export default function SignInScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const returnTo = params.returnTo as string | undefined;

    const [isAppleAvailable, setIsAppleAvailable] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');

    // Responsive sizing
    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 480 : width - 48;

    // Clear password when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            setPassword('');
            setError('');
        }, [])
    );

    // Clear fields when toggling between Sign In and Sign Up
    useEffect(() => {
        setPassword('');
        setError('');
    }, [isSignUp]);

    // Handle OAuth callback - redirect authenticated users
    useEffect(() => {
        async function handleAuthRedirect() {
            if (user) {
                let profile: any = null;
                try {
                    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
                    if (profileSnap.exists()) {
                        profile = profileSnap.data();
                    } else {
                        // Create default customer profile
                        profile = {
                            user_type: 'customer',
                            email: user.email,
                            created_at: new Date().toISOString()
                        };
                        await setDoc(doc(db, 'profiles', user.uid), profile, { merge: true });
                    }

                    // 1. Check for Stylist Invitation (ONLY for Customers)
                    if (profile.user_type === 'customer') {
                        try {
                            const stylistQ = query(collectionGroup(db, 'stylists'), where('email', '==', user.email?.toLowerCase()));
                            const stylistSnap = await getDocs(stylistQ);
                            
                            if (!stylistSnap.empty) {
                                // Found an invitation! Redirect to acceptance page
                                const stylistDoc = stylistSnap.docs[0];
                                const bizId = stylistDoc.ref.parent.parent?.id;
                                
                                // Only redirect if not already linked (as a safety, though userType would be stylist)
                                if (bizId) {
                                    router.replace(`/stylist/invite?businessId=${bizId}&stylistId=${stylistDoc.id}` as any);
                                    return;
                                }
                            }
                        } catch (indexError) {
                            // If index is building, we skip elite sync for now to allow login
                            console.log('[Auth] Index building or missing, skipping invite check');
                        }
                    }
                } catch (e) {
                    console.error('[Auth] Error fetching profile:', e);
                    profile = profile || { user_type: 'customer' };
                }

                const userType = profile.user_type;

                // 2. Common-Sense Redirection
                // Priority: Use role-based destination UNLESS a specific deep-link is requested
                const defaultDest = userType === 'business_owner' ? '/business/dashboard' :
                                   userType === 'stylist' ? '/stylist/dashboard' :
                                   '/bookings';

                // Only respect returnTo if it's a specific route (not home or generic profile)
                if (returnTo && returnTo !== '/' && returnTo !== '/profile' && !returnTo.startsWith('/profile?')) {
                    router.replace(returnTo as any);
                } else {
                    router.replace(defaultDest);
                }
            }
        }

        handleAuthRedirect();
    }, [user, router, returnTo]);

    useEffect(() => {
        async function checkApple() {
            try {
                const available = await AppleAuthentication.isAvailableAsync();
                setIsAppleAvailable(available);
            } catch (e) {
                setIsAppleAvailable(false);
            }
        }
        if (Platform.OS === 'ios') {
            checkApple();
        }
    }, []);

    async function handleEmailAuth() {
        setLoading(true);
        setError('');

        // Save returnTo if present
        if (returnTo) {
            try { await AsyncStorage.setItem('auth_return_url', returnTo as string); } catch (e) { console.error('Storage error', e); }
        } else {
            await AsyncStorage.removeItem('auth_return_url');
        }

        // Validate
        if (!email || !password) {
            setError('Please enter both email and password');
            setLoading(false);
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (isSignUp && !fullName.trim()) {
            setError('Please enter your full name');
            setLoading(false);
            return;
        }

        if (isSignUp) {
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                // Create profile document
                await setDoc(doc(db, 'profiles', cred.user.uid), {
                    user_type: 'customer',
                    email: cred.user.email,
                    full_name: fullName.trim(),
                    created_at: new Date().toISOString(),
                });
                // handleAuthRedirect effect will take over and update roles based on invites
            } catch (signUpError: any) {
                setError(signUpError.message || 'Failed to create account.');
                setLoading(false);
            }
        } else {
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // useEffect handles redirect when user state updates
            } catch (signInError: any) {
                const msg = signInError.message || '';
                if (
                    msg.includes('user-not-found') || 
                    msg.includes('wrong-password') || 
                    msg.includes('invalid-credential') ||
                    msg.includes('invalid-email') ||
                    msg.includes('user-disabled')
                ) {
                    setError('Invalid email or password combination. Please try again.');
                } else {
                    setError('Invalid email or password combination. Please try again.');
                }
                setLoading(false);
            }
        }
    }

    async function handleGoogleAuth() {
        try {
            setLoading(true);
            setError('');

            if (returnTo) {
                console.log('Saving returnTo to storage:', returnTo);
                await AsyncStorage.setItem('auth_return_url', returnTo as string);
            } else {
                await AsyncStorage.removeItem('auth_return_url');
            }

            let cred;
            if (Platform.OS === 'web') {
                const provider = new GoogleAuthProvider();
                provider.addScope('email');
                provider.addScope('profile');
                cred = await signInWithPopup(auth, provider);
            } else {
                // Native flow
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                const idToken = userInfo.data?.idToken;
                if (!idToken) throw new Error('No ID token found');
                const googleCredential = GoogleAuthProvider.credential(idToken);
                cred = await signInWithCredential(auth, googleCredential);
            }

            // Ensure profile exists in Firestore
            const { getDoc } = await import('firebase/firestore');
            const profileSnap = await getDoc(doc(db, 'profiles', cred.user.uid));
            if (!profileSnap.exists()) {
                await setDoc(doc(db, 'profiles', cred.user.uid), {
                    user_type: 'customer',
                    email: cred.user.email,
                    avatar_url: cred.user.photoURL ?? null,
                    created_at: new Date().toISOString(),
                }, { merge: true });
            }
            // handleAuthRedirect effect will take over role checking
            // useEffect handles redirect when user state updates
        } catch (error: any) {
            console.error('Google auth error:', error);
            setError(error.message || 'Failed to sign in with Google');
            setLoading(false);
        }
    }

    async function handleAppleAuth() {
        try {
            setLoading(true);
            setError('');

            if (returnTo) {
                await AsyncStorage.setItem('auth_return_url', returnTo as string);
            } else {
                await AsyncStorage.removeItem('auth_return_url');
            }

            // 1. Generate Nonce for Firebase (matched to flexilist pattern)
            const rawNonce = Math.random().toString(36).substring(2, 10) + 
                             Math.random().toString(36).substring(2, 10);
            const hashedNonce = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                rawNonce
            );

            // 2. Request Apple Credentials
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });

            // 3. Authenticate with Firebase
            const provider = new OAuthProvider('apple.com');
            const firebaseCredential = provider.credential({
                idToken: credential.identityToken!,
                rawNonce: rawNonce,
            });

            const cred = await signInWithCredential(auth, firebaseCredential);

            // 4. Ensure profile exists
            const profileSnap = await getDoc(doc(db, 'profiles', cred.user.uid));
            if (!profileSnap.exists()) {
                await setDoc(doc(db, 'profiles', cred.user.uid), {
                    user_type: 'customer',
                    email: cred.user.email,
                    full_name: credential.fullName 
                        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
                        : cred.user.displayName || null,
                    created_at: new Date().toISOString(),
                }, { merge: true });
            }
        } catch (error: any) {
            if (error.code === 'ERR_CANCELED') {
                // Ignore User Cancellation
            } else {
                console.error('Apple auth error:', error);
                setError(error.message || 'Failed to sign in with Apple');
            }
        } finally {
            setLoading(false);
        }
    }

    // Show loading screen while checking auth or redirecting in the effect
    if (user && !error) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header showBack={true} />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
                    <View className="items-center mb-12">
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-4xl' : 'text-3xl'}`}>
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </Text>
                        <Text className={`text-neutral-500 text-center ${isLargeScreen ? 'text-lg' : 'text-base'}`}>
                            {isSignUp ? 'Sign up to book appointments' : 'Sign in to manage your bookings'}
                        </Text>
                    </View>

                    <View>
                        <Button
                            label="Continue with Google"
                            variant="google"
                            icon={<GoogleLogo size={20} />}
                            onPress={handleGoogleAuth}
                        />

                        {isAppleAvailable && (
                            <Button
                                variant="primary"
                                label="Continue with Apple"
                                onPress={handleAppleAuth}
                                icon={<Ionicons name="logo-apple" size={20} color="white" />}
                                className="mt-4"
                            />
                        )}

                        <View className="flex-row items-center my-6">
                            <View className="flex-1 h-[1px] bg-neutral-100" />
                            <Text className="mx-4 text-neutral-400 text-sm">Or continue with email</Text>
                            <View className="flex-1 h-[1px] bg-neutral-100" />
                        </View>

                        <View>
                            {isSignUp && (
                                <FormInput
                                    placeholder="Full Name"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    style={{ marginBottom: 16 }}
                                />
                            )}
                            <FormInput
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                style={{ marginBottom: 16 }}
                            />
                            <FormInput
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        {/* Error Message - Right above the action button */}
                        {error ? (
                            <View className="bg-red-50 border border-red-300 rounded-xl p-4 flex-row items-center my-4">
                                <View className="w-6 h-6 bg-red-500 rounded-full items-center justify-center mr-3">
                                    <Text className="text-white text-sm font-bold">✕</Text>
                                </View>
                                <Text className="text-red-700 flex-1 font-medium">{error}</Text>
                            </View>
                        ) : null}

                        <Button
                            label={isSignUp ? "Create account" : "Sign in"}
                            loading={loading}
                            onPress={handleEmailAuth}
                            className="mt-6"
                        />

                        <TouchableOpacity
                            onPress={() => setIsSignUp(!isSignUp)}
                            className="items-center mt-4 py-2"
                        >
                            <Text className="text-neutral-500 text-base">
                                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                                <Text className="font-semibold text-black">
                                    {isSignUp ? "Sign in" : "Sign up"}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Business Sign Up Link */}
                        {isSignUp && (
                            <View className="mt-6 pt-6 border-t border-neutral-100">
                                <TouchableOpacity
                                    onPress={() => router.push('/business-signup')}
                                    className="items-center py-3"
                                >
                                    <Text className="text-neutral-600 text-center text-base">
                                        Want to list your business?{' '}
                                        <Text className="font-semibold text-black">Create a business account</Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
