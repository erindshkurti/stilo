import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

// Mock data for bookings
const MOCK_BOOKINGS = {
    upcoming: [
        {
            id: '1',
            businessName: 'Bella Hair Studio',
            service: 'Haircut & Styling',
            date: 'Tomorrow, 2:00 PM',
            location: '123 Main St, New York, NY',
            imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop',
            status: 'confirmed'
        }
    ],
    recent: [
        {
            id: '2',
            businessName: 'The Cut Above',
            service: 'Full Color',
            date: 'Dec 15, 2023',
            location: '456 Broadway, New York, NY',
            imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=200&h=200&fit=crop',
            status: 'completed'
        },
        {
            id: '3',
            businessName: 'Style & Grace',
            service: 'Blowout',
            date: 'Nov 28, 2023',
            location: '789 5th Ave, New York, NY',
            imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200&h=200&fit=crop',
            status: 'completed'
        }
    ]
};

export default function ProfileScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'recent'>('upcoming');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string>('');
    const isLargeScreen = width > 768;

    useEffect(() => {
        async function loadProfile() {
            if (!user) return;

            // Prioritize Google/Auth Provider Metadata
            if (user.user_metadata?.avatar_url) {
                setAvatarUrl(user.user_metadata.avatar_url);
            }
            if (user.user_metadata?.full_name) {
                setFullName(user.user_metadata.full_name);
            }

            try {
                // Fetch from Supabase profile to see if there are overrides or missing data
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    if (data.avatar_url && !user.user_metadata?.avatar_url) {
                        setAvatarUrl(data.avatar_url);
                    }
                    if (data.full_name && !user.user_metadata?.full_name) {
                        setFullName(data.full_name);
                    }
                }
            } catch (error) {
                console.error('Error loading profile details:', error);
            }
        }

        loadProfile();
    }, [user]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <Text>Please sign in to view your profile.</Text>
                <TouchableOpacity onPress={() => router.replace('/sign-in')} className="mt-4">
                    <Text className="text-blue-600 font-medium">Go to Sign In</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top']}>
                <Header />

                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    <View className="max-w-4xl mx-auto w-full px-6 py-8">

                        {/* Profile Header */}
                        <View className="items-center mb-10">
                            <View className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 mb-4 border-2 border-neutral-100">
                                {avatarUrl ? (
                                    <Image
                                        source={{ uri: avatarUrl }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="w-full h-full items-center justify-center">
                                        <Feather name="user" size={40} color="#9ca3af" />
                                    </View>
                                )}
                            </View>
                            <Text className="text-2xl font-bold text-neutral-900">
                                {fullName || user.email?.split('@')[0] || 'User'}
                            </Text>
                            <Text className="text-neutral-500 mt-1">{user.email}</Text>
                        </View>

                        {/* Tabs */}
                        <View className="flex-row border-b border-neutral-200 mb-8">
                            <TouchableOpacity
                                onPress={() => setActiveTab('upcoming')}
                                className={`pb-4 px-4 mr-6 ${activeTab === 'upcoming'
                                        ? 'border-b-2 border-black'
                                        : 'opacity-50'
                                    }`}
                            >
                                <Text className={`font-medium text-base ${activeTab === 'upcoming' ? 'text-black' : 'text-neutral-500'
                                    }`}>
                                    Upcoming Bookings
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('recent')}
                                className={`pb-4 px-4 ${activeTab === 'recent'
                                        ? 'border-b-2 border-black'
                                        : 'opacity-50'
                                    }`}
                            >
                                <Text className={`font-medium text-base ${activeTab === 'recent' ? 'text-black' : 'text-neutral-500'
                                    }`}>
                                    Recent History
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Booking Lists */}
                        <View className="min-h-[300px]">
                            {MOCK_BOOKINGS[activeTab].length > 0 ? (
                                <View className="space-y-4">
                                    {MOCK_BOOKINGS[activeTab].map((booking) => (
                                        <View
                                            key={booking.id}
                                            className="bg-white border border-neutral-100 rounded-xl p-4 flex-row items-center shadow-sm"
                                        >
                                            <Image
                                                source={{ uri: booking.imageUrl }}
                                                className="w-20 h-20 rounded-lg bg-neutral-100 mr-4"
                                            />
                                            <View className="flex-1">
                                                <Text className="font-bold text-lg text-neutral-900 mb-1">{booking.businessName}</Text>
                                                <Text className="text-neutral-600 font-medium mb-1">{booking.service}</Text>
                                                <View className="flex-row items-center text-neutral-500 mb-1">
                                                    <Feather name="calendar" size={14} color="#737373" />
                                                    <Text className="text-neutral-500 text-sm ml-1.5">{booking.date}</Text>
                                                </View>
                                                <View className="flex-row items-center text-neutral-500">
                                                    <Feather name="map-pin" size={14} color="#737373" />
                                                    <Text className="text-neutral-500 text-sm ml-1.5 truncate" numberOfLines={1}>{booking.location}</Text>
                                                </View>
                                            </View>
                                            <View className="ml-2">
                                                {activeTab === 'upcoming' ? (
                                                    <TouchableOpacity className="bg-black px-4 py-2 rounded-lg">
                                                        <Text className="text-white font-medium text-sm">Reschedule</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity className="bg-neutral-100 px-4 py-2 rounded-lg">
                                                        <Text className="text-neutral-900 font-medium text-sm">Rebook</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="items-center justify-center py-20">
                                    <Feather name="calendar" size={48} color="#e5e5e5" />
                                    <Text className="text-neutral-400 mt-4 text-center">
                                        No {activeTab} bookings found.
                                    </Text>
                                </View>
                            )}
                        </View>

                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
