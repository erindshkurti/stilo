import { Feather } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';

export default function StylistInviteScreen() {
    const router = useRouter();
    const { businessId, stylistId } = useLocalSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/sign-in');
            return;
        }

        async function fetchInviteDetails() {
            if (!businessId || !stylistId || !user) return;
            
            try {
                // Verify the business exists
                const bizSnap = await getDoc(doc(db, 'businesses', businessId as string));
                if (bizSnap.exists()) {
                    setBusinessName(bizSnap.data().name);
                } else {
                    setError('Business not found');
                }
            } catch (e) {
                console.error('Error fetching invite:', e);
                setError('Failed to load invitation details');
            } finally {
                setLoading(false);
            }
        }

        fetchInviteDetails();
    }, [businessId, stylistId, user, authLoading]);

    const handleAccept = async () => {
        if (!user || !businessId || !stylistId) return;
        
        setAccepting(true);
        try {
            // 1. Update Profile to Stylist
            await updateDoc(doc(db, 'profiles', user.uid), {
                user_type: 'stylist',
                business_id: businessId,
                email: user.email
            });

            // 2. Link Stylist record to UID
            await updateDoc(doc(db, 'businesses', businessId as string, 'stylists', stylistId as string), {
                userId: user.uid
            });

            // 3. Success! Go to dashboard
            router.replace('/stylist/dashboard');
        } catch (e: any) {
            console.error('Error accepting invite:', e);
            const msg = e.message || '';
            if (msg.includes('permissions')) {
                setError('Permission error: Please ensure you are signed in with the correct email address.');
            } else {
                setError('Failed to accept invitation. Please try again.');
            }
            setAccepting(false);
        }
    };

    const handleDecline = () => {
        // Just take them to regular customer area
        router.replace('/bookings');
    };

    if (loading || authLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <Header />
            <View className="flex-1 items-center justify-center px-6">
                <View className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 w-full max-w-md">
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4">
                            <Feather name="user-plus" size={32} color="#10b981" />
                        </View>
                        <Text className="text-2xl font-bold text-center">Professional Invitation</Text>
                        <Text className="text-neutral-500 text-center mt-2">
                            You've been invited to join the team at:
                        </Text>
                        <Text className="text-xl font-semibold text-emerald-600 mt-1">{businessName}</Text>
                    </View>

                    {error && (
                        <View className="bg-red-50 p-4 rounded-xl mb-6">
                            <Text className="text-red-600 text-center">{error}</Text>
                        </View>
                    )}

                    <View className="space-y-3">
                        <Button
                            label={accepting ? "Accepting..." : "Accept Invitation"}
                            variant="primary"
                            onPress={handleAccept}
                            disabled={accepting}
                        />
                        <TouchableOpacity 
                            onPress={handleDecline}
                            disabled={accepting}
                            className="h-14 items-center justify-center"
                        >
                            <Text className="text-neutral-500 font-medium">Not now, just browse</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-neutral-400 text-xs text-center mt-6">
                        Accepting this invitation will give you access to your personal schedule and client bookings at {businessName}.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
