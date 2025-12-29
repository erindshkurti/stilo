import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GoogleLogo } from '../components/GoogleLogo';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';

export default function BusinessSignUpScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(false);

    // Split error states for better UX placement
    const [formError, setFormError] = useState<string | null>(null);
    const [googleError, setGoogleError] = useState<string | null>(null);

    // Responsive sizing
    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 520 : width - 48;

    // Clear password when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            setPassword('');
            setFormError(null);
            setGoogleError(null);
        }, [])
    );

    async function handleSignUp() {
        // Clear other errors
        setGoogleError(null);

        // Validate business name
        if (!businessName.trim()) {
            setFormError('Please enter your business name');
            return;
        }

        // Validate email
        if (!email.trim() || !email.includes('@')) {
            setFormError('Please enter a valid email address');
            return;
        }

        // Validate password
        if (password.length < 6) {
            setFormError('Password is too short');
            return;
        }

        setLoading(true);
        setFormError(null); // Clear any previous errors

        try {
            console.log('Attempting signup with:', { email, businessName, passwordLength: password.length });

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        user_type: 'business',
                        business_name: businessName,
                    }
                }
            });

            console.log('Signup response:', {
                user: data.user?.id,
                session: !!data.session,
                error: error?.message,
                errorDetails: error
            });

            if (error) throw error;

            // Check if email confirmation is required
            if (data.user && !data.session) {
                // Email confirmation required
                Alert.alert(
                    'Confirm Your Email',
                    `We've sent a confirmation email to ${email}. Please check your inbox and click the confirmation link to continue setting up your business.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/sign-in')
                        }
                    ]
                );
                setLoading(false);
                return;
            }

            // Successfully signed up with session (no email confirmation needed)
            if (data.session) {
                console.log('User signed up successfully with session:', data.user?.id);
                router.replace('/business/onboarding');
            } else {
                // Unexpected state
                throw new Error('Signup completed but no session was created. Please try signing in.');
            }
        } catch (error: any) {
            console.error('Signup error:', error);
            setFormError(error.message || 'Failed to create account. Please try a different email address.');
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleAuth() {
        // Clear other errors
        setFormError(null);

        if (!businessName.trim()) {
            setGoogleError('Please enter your business name first');
            return;
        }

        try {
            setLoading(true);
            setGoogleError(null); // Clear any previous errors

            // Flag this as a business signup attempt
            await AsyncStorage.setItem('pending_business_signup', 'true');
            // Store business name to use later if possible, or we'll ask again/fetch it
            await AsyncStorage.setItem('pending_business_name', businessName);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'http://localhost:8081',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    // @ts-ignore
                    data: {
                        user_type: 'business',
                        business_name: businessName,
                    },
                }
            });

            if (error) {
                setGoogleError(error.message);
                setLoading(false);
            }
            // Note: The page will redirect to Google, so we don't need to handle success here
        } catch (error: any) {
            console.error('Google auth error:', error);
            setGoogleError(error.message || 'Failed to sign in with Google');
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
                    {/* Header */}
                    <View className="items-center mb-10">
                        <View className="w-16 h-16 bg-black rounded-2xl items-center justify-center mb-4">
                            <Feather name="briefcase" size={32} color="white" />
                        </View>
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-4xl' : 'text-3xl'}`}>
                            List Your Business
                        </Text>
                        <Text className={`text-neutral-500 text-center ${isLargeScreen ? 'text-lg' : 'text-base'}`}>
                            Join Stilo and start accepting bookings today
                        </Text>
                    </View>

                    {/* Benefits */}
                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                        <Text className="font-semibold text-base mb-3">What you'll get:</Text>
                        <View className="space-y-2">
                            {[
                                'Manage your services and pricing',
                                'Accept online bookings 24/7',
                                'Build your client base',
                                'Get discovered by new customers'
                            ].map((benefit, index) => (
                                <View key={index} className="flex-row items-center">
                                    <Feather name="check-circle" size={18} color="#22c55e" />
                                    <Text className="text-neutral-700 ml-2 flex-1">{benefit}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View className="space-y-4">
                        <View className="mb-2">
                            <Text className="font-semibold text-base mb-2 px-1">Enter your business name</Text>
                            <TextInput
                                placeholder="Business Name"
                                value={businessName}
                                onChangeText={setBusinessName}
                                className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-100 focus:border-neutral-300 text-base"
                            />
                        </View>

                        <View>
                            <Text className="font-semibold text-base mb-3 px-1">Choose your sign up method</Text>

                            {/* Google Auth Error Display */}
                            {googleError && (
                                <View className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                                    <View className="flex-row items-center">
                                        <Feather name="alert-circle" size={18} color="#dc2626" />
                                        <Text className="text-red-600 ml-2 flex-1 text-sm">{googleError}</Text>
                                    </View>
                                </View>
                            )}

                            <Button
                                label="Continue with Google"
                                variant="google"
                                icon={<GoogleLogo size={20} />}
                                onPress={handleGoogleAuth}
                            />

                            <View className="flex-row items-center my-4">
                                <View className="flex-1 h-[1px] bg-neutral-100" />
                                <Text className="mx-4 text-neutral-400 text-sm">Or sign up with email</Text>
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
                        </View>

                        {/* Email Form Error Display */}
                        {formError && (
                            <View className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                                <View className="flex-row items-center">
                                    <Feather name="alert-circle" size={20} color="#dc2626" />
                                    <Text className="text-red-600 ml-3 flex-1">{formError}</Text>
                                </View>
                            </View>
                        )}

                        <Button
                            label="Create Business Account"
                            loading={loading}
                            onPress={handleSignUp}
                            className="mt-2"
                        />

                        <TouchableOpacity
                            onPress={() => router.push('/sign-in')}
                            className="items-center mt-4 py-2"
                        >
                            <Text className={`text-neutral-500 ${isLargeScreen ? 'text-base' : 'text-sm'}`}>
                                Already have an account?
                                <Text className="font-semibold text-black"> Sign in</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
