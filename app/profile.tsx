import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

export default function ProfileScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'recent'>('upcoming');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string>('');
    
    // Real booking states
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);

    const isLargeScreen = width > 768;

    useEffect(() => {
        async function loadProfileAndBookings() {
            if (!user) return;

            // 1. Load Profile
            if (user.photoURL) setAvatarUrl(user.photoURL);
            if (user.displayName) setFullName(user.displayName);

            try {
                const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    if (data.avatar_url && !user.photoURL) setAvatarUrl(data.avatar_url);
                    if (data.full_name && !user.displayName) setFullName(data.full_name);
                }
            } catch (error) {
                console.error('Error loading profile details:', error);
            }

            // 2. Load Real Bookings
            try {
                const bookingsSnap = await getDocs(
                    query(collection(db, 'bookings'), where('customer_id', '==', user.uid))
                );

                const now = new Date();
                const upcoming: any[] = [];
                const recent: any[] = [];

                const bizCache: Record<string, any> = {};
                const serviceCache: Record<string, any> = {};

                const rawBookings = bookingsSnap.docs.map(d => ({id: d.id, ...d.data() as any}));
                rawBookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                for (const b of rawBookings) {
                    if (b.status === 'cancelled') continue;

                    if (!bizCache[b.business_id]) {
                        const bizDoc = await getDoc(doc(db, 'businesses', b.business_id));
                        bizCache[b.business_id] = bizDoc.exists() ? bizDoc.data() : { name: 'Unknown Salon', address: '' };
                    }
                    if (!serviceCache[b.service_id] && b.service_id) {
                        const srvDoc = await getDoc(doc(db, 'businesses', b.business_id, 'services', b.service_id));
                        serviceCache[b.service_id] = srvDoc.exists() ? srvDoc.data() : { name: 'Service' };
                    }

                    const bizData = bizCache[b.business_id];
                    const srvData = serviceCache[b.service_id] || { name: 'Service' };

                    const startDate = new Date(b.start_time);
                    const isUpcoming = startDate >= now && b.status === 'confirmed';
                    
                    const formattedDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    const formattedBooking = {
                        id: b.id,
                        businessId: b.business_id,
                        serviceId: b.service_id,
                        businessName: bizData.name || 'Salon',
                        service: srvData.name || 'Service',
                        date: formattedDate,
                        location: bizData.address ? `${bizData.address}${bizData.city ? `, ${bizData.city}` : ''}` : 'Location hidden',
                        imageUrl: bizData.cover_image_url || bizData.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop',
                        status: b.status,
                        rawDate: startDate
                    };

                    if (isUpcoming) {
                        upcoming.push(formattedBooking);
                    } else {
                        recent.push(formattedBooking);
                    }
                }

                recent.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

                setUpcomingBookings(upcoming);
                setRecentBookings(recent);
            } catch (error) {
                console.error('Error loading bookings:', error);
            } finally {
                setLoadingBookings(false);
            }
        }

        loadProfileAndBookings();
    }, [user]);

    const handleCancel = (bookingId: string) => {
        Alert.alert(
            "Cancel Appointment",
            "Are you sure you want to cancel this appointment?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            setUpcomingBookings(prev => prev.filter(b => b.id !== bookingId));
                            await updateDoc(doc(db, 'bookings', bookingId), {
                                status: 'cancelled'
                            });
                        } catch (e) {
                            console.error('Failed to cancel:', e);
                        }
                    } 
                }
            ]
        );
    };

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
                            {loadingBookings ? (
                                <View className="items-center justify-center py-20">
                                    <Text className="text-neutral-500">Loading bookings...</Text>
                                </View>
                            ) : (activeTab === 'upcoming' ? upcomingBookings : recentBookings).length > 0 ? (
                                <View className="space-y-4">
                                    {(activeTab === 'upcoming' ? upcomingBookings : recentBookings).map((booking) => (
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
                                            <View className="ml-2 gap-2">
                                                {activeTab === 'upcoming' ? (
                                                    <>
                                                        <TouchableOpacity 
                                                            onPress={() => router.push(`/booking/${booking.businessId}?serviceId=${booking.serviceId}`)}
                                                            className="bg-black px-4 py-2 rounded-lg items-center"
                                                        >
                                                            <Text className="text-white font-medium text-sm">Reschedule</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity 
                                                            onPress={() => handleCancel(booking.id)}
                                                            className="bg-red-50 px-4 py-2 rounded-lg items-center border border-red-100"
                                                        >
                                                            <Text className="text-red-600 font-medium text-sm">Cancel</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                ) : (
                                                    <TouchableOpacity 
                                                        onPress={() => router.push(`/booking/${booking.businessId}?serviceId=${booking.serviceId}`)}
                                                        className="bg-neutral-100 px-4 py-2 rounded-lg items-center"
                                                    >
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
