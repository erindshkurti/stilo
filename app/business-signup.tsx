import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

    // Responsive sizing
    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 520 : width - 48;

    async function handleSignUp() {
        if (!businessName.trim()) {
            Alert.alert('Error', 'Please enter your business name');
            return;
        }

        setLoading(true);

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

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // TODO: Create business profile in database
            router.replace('/(tabs)');
        }

        setLoading(false);
    }

    async function handleGoogleAuth() {
        Alert.alert("Coming Soon", "Google Auth configuration requires a bit more setup.");
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
                                placeholder="Business Name"
                                value={businessName}
                                onChangeText={setBusinessName}
                                className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-100 focus:border-neutral-300 text-base"
                            />
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
