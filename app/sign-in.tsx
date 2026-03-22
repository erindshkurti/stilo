import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GoogleLogo } from '../components/GoogleLogo';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { auth, db } from '../lib/firebase';

export default function SignInScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const returnTo = params.returnTo as string | undefined;

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
                if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
                    setError('Invalid email or password. Please try again.');
                } else {
                    setError(msg);
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

            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            const cred = await signInWithPopup(auth, provider);

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
            <Header />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
                    <View className="items-center mb-10">
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-4xl' : 'text-3xl'}`}>
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </Text>
                        <Text className={`text-neutral-500 text-center ${isLargeScreen ? 'text-lg' : 'text-base'}`}>
                            {isSignUp ? 'Sign up to book appointments' : 'Sign in to manage your bookings'}
                        </Text>
                    </View>

                    <View className="space-y-4">
                        <Button
                            label="Continue with Google"
                            variant="google"
                            icon={<GoogleLogo size={20} />}
                            onPress={handleGoogleAuth}
                        />

                        <View className="flex-row items-center my-4">
                            <View className="flex-1 h-[1px] bg-neutral-100" />
                            <Text className="mx-4 text-neutral-400 text-sm">Or continue with email</Text>
                            <View className="flex-1 h-[1px] bg-neutral-100" />
                        </View>

                        <View className="space-y-3">
                            {isSignUp && (
                                <TextInput
                                    placeholder="Full Name"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-100 focus:border-neutral-300 text-base"
                                />
                            )}
                            <TextInput
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-100 focus:border-neutral-300 text-base"
                            />
                            <TextInput
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-100 focus:border-neutral-300 text-base"
                            />
                        </View>

                        {/* Error Message - Right above the action button */}
                        {error ? (
                            <View className="bg-red-50 border border-red-300 rounded-xl p-4 flex-row items-center">
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
                            className="mt-2"
                        />

                        <TouchableOpacity
                            onPress={() => setIsSignUp(!isSignUp)}
                            className="items-center mt-4 py-2"
                        >
                            <Text className={`text-neutral-500 ${isLargeScreen ? 'text-base' : 'text-sm'}`}>
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
                                    <Text className="text-neutral-600 text-center">
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
