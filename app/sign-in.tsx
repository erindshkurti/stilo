import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GoogleLogo } from '../components/GoogleLogo';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function SignInScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                let userType = user.user_metadata?.user_type;

                // If user_type is not set (new Google OAuth user), default to customer
                if (!userType) {
                    console.log('No user_type found, setting to customer');

                    // Update user metadata to set user_type as customer
                    const { error } = await supabase.auth.updateUser({
                        data: { user_type: 'customer' }
                    });

                    if (error) {
                        console.error('Error updating user metadata:', error);
                    }

                    userType = 'customer';
                }

                if (userType === 'business') {
                    router.replace('/business/dashboard');
                } else {
                    router.replace('/');
                }
            }
        }

        handleAuthRedirect();
    }, [user, router]);

    async function handleEmailAuth() {
        setLoading(true);
        setError('');

        // Basic validation
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

        if (isSignUp) {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        user_type: 'client',
                    }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
            } else {
                // New users are always clients, redirect to root
                router.replace('/');
            }
        } else {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

            if (signInError) {
                // Provide user-friendly error messages
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Invalid email or password. Please try again.');
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError('Please confirm your email address before signing in.');
                } else {
                    setError(signInError.message);
                }
            } else {
                // Check user type and redirect accordingly
                const { data: { user } } = await supabase.auth.getUser();
                const userType = user?.user_metadata?.user_type;

                if (userType === 'business') {
                    router.replace('/business/dashboard');
                } else {
                    router.replace('/');
                }
            }
        }

        setLoading(false);
    }

    async function handleGoogleAuth() {
        try {
            setLoading(true);
            setError('');

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'http://localhost:8081',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });

            if (error) {
                setError(error.message);
                setLoading(false);
            }
            // Note: The page will redirect to Google, so we don't need to handle success here
        } catch (error: any) {
            console.error('Google auth error:', error);
            setError(error.message || 'Failed to sign in with Google');
            setLoading(false);
        }
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
