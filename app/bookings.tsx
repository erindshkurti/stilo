import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

export default function BookingsScreen() {
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
    
    // Cancellation Modal State
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

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
        setBookingToCancel(bookingId);
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;
        try {
            setUpcomingBookings(prev => prev.filter(b => b.id !== bookingToCancel));
            await updateDoc(doc(db, 'bookings', bookingToCancel), {
                status: 'cancelled'
            });
        } catch (e) {
            console.error('Failed to cancel:', e);
        } finally {
            setShowCancelModal(false);
            setBookingToCancel(null);
        }
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
                <Text>Please sign in to view your bookings.</Text>
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

                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }} 
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={(activeTab === 'upcoming' ? upcomingBookings : recentBookings).length > 0}
                >
                    <View className="max-w-4xl mx-auto w-full px-6 py-8 flex-1">

                        {/* Header Section */}
                        <View className="mb-8">
                            <Text className="text-3xl font-bold text-neutral-900">Bookings</Text>
                            <Text className="text-neutral-500 mt-1">Manage your personal appointments</Text>
                        </View>

                        {/* Modern Tabs */}
                        <View className="flex-row bg-neutral-100 p-1.5 rounded-2xl mb-8 w-full">
                            <TouchableOpacity
                                onPress={() => setActiveTab('upcoming')}
                                className={`flex-1 py-3 px-2 rounded-xl flex-row justify-center items-center ${activeTab === 'upcoming' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Feather name="clock" size={16} color={activeTab === 'upcoming' ? '#000' : '#737373'} />
                                <Text className={`ml-2 font-semibold text-sm ${activeTab === 'upcoming' ? 'text-black' : 'text-neutral-500'}`}>
                                    Upcoming
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('recent')}
                                className={`flex-1 py-3 px-2 rounded-xl flex-row justify-center items-center ${activeTab === 'recent' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Feather name="check-circle" size={16} color={activeTab === 'recent' ? '#000' : '#737373'} />
                                <Text className={`ml-2 font-semibold text-sm ${activeTab === 'recent' ? 'text-black' : 'text-neutral-500'}`}>
                                    Past
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Booking Lists */}
                        <View className="flex-1 mt-4">
                            {loadingBookings ? (
                                <View className="items-center justify-center py-20">
                                    <View className="w-10 h-10 border-4 border-neutral-100 border-t-black rounded-full animate-spin mb-4" />
                                    <Text className="text-neutral-500 font-medium">Loading your agenda...</Text>
                                </View>
                            ) : (activeTab === 'upcoming' ? upcomingBookings : recentBookings).length > 0 ? (
                                <View className="gap-6">
                                    {(activeTab === 'upcoming' ? upcomingBookings : recentBookings).map((booking) => (
                                        <View
                                            key={booking.id}
                                            className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm"
                                        >
                                            <View className="flex-row items-center mb-5">
                                                <Image
                                                    source={{ uri: booking.imageUrl }}
                                                    className="w-16 h-16 rounded-2xl bg-neutral-100 mr-4"
                                                />
                                                <View className="flex-1">
                                                    <View className="flex-row justify-between items-center mb-0.5">
                                                        <Text className="font-bold text-lg text-neutral-900 pr-2 flex-1" numberOfLines={1}>
                                                            {booking.businessName}
                                                        </Text>
                                                        <View className="flex-row items-center">
                                                            <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${booking.status === 'confirmed' ? 'bg-green-500' : 'bg-neutral-300'}`} />
                                                            <Text className={`text-[10px] font-bold uppercase tracking-widest ${booking.status === 'confirmed' ? 'text-green-600' : 'text-neutral-400'}`}>
                                                                {booking.status}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View className="flex-row items-center">
                                                        <Feather name="scissors" size={12} color="#a3a3a3" />
                                                        <Text className="text-neutral-400 font-medium text-sm ml-1.5">{booking.service}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View className="flex-row items-center justify-between mb-6 px-1">
                                                <View className="flex-row items-center">
                                                    <Feather name="calendar" size={14} color="#000" />
                                                    <Text className="ml-2 text-neutral-900 font-semibold text-xs">{booking.date}</Text>
                                                </View>
                                                <View className="flex-row items-center">
                                                    <Feather name="map-pin" size={12} color="#a3a3a3" />
                                                    <Text className="ml-1.5 text-neutral-400 font-medium text-xs">{booking.location.split(',')[0]}</Text>
                                                </View>
                                            </View>

                                            <View className="flex-row gap-3">
                                                {activeTab === 'upcoming' ? (
                                                    <>
                                                        <TouchableOpacity 
                                                            onPress={() => router.push(`/booking/${booking.businessId}?serviceId=${booking.serviceId}&rescheduleId=${booking.id}`)}
                                                            className="flex-1 bg-black py-3.5 rounded-2xl items-center"
                                                        >
                                                            <Text className="text-white font-bold text-xs tracking-tight">Reschedule</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity 
                                                            onPress={() => handleCancel(booking.id)}
                                                            className="px-6 py-3.5 rounded-2xl items-center bg-red-50"
                                                        >
                                                            <Text className="text-red-500 font-bold text-xs tracking-tight">Cancel</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                ) : (
                                                    <TouchableOpacity 
                                                        onPress={() => router.push(`/booking/${booking.businessId}?serviceId=${booking.serviceId}`)}
                                                        className="w-full bg-neutral-100 py-3.5 rounded-2xl items-center"
                                                    >
                                                        <Text className="text-black font-bold text-xs tracking-tight">Rebook Service</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="items-center justify-center py-20 px-8">
                                    <View className="mb-6 bg-neutral-50 p-6 rounded-full border border-neutral-100">
                                        <Feather name="calendar" size={48} color="#d4d4d4" />
                                    </View>
                                    <Text className="text-xl font-bold text-neutral-900 mb-2 text-center">
                                        No {activeTab} bookings found
                                    </Text>
                                    <View className="max-w-[280px]">
                                        <Text className="text-neutral-500 mb-8 text-center text-base leading-6">
                                            {activeTab === 'upcoming' 
                                                ? "Ready for a new look? Find a top-rated professional near you." 
                                                : "You haven't completed any appointments yet."}
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => router.push('/')}
                                        className="bg-black px-10 py-4 rounded-2xl flex-row items-center shadow-lg"
                                    >
                                        <Feather name="search" size={20} color="white" />
                                        <Text className="text-white font-bold text-lg ml-3">Find a Stylist</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Cancel Confirmation Modal */}
            <Modal visible={showCancelModal} transparent animationType="fade">
                <View className="flex-1 bg-black/40 justify-center items-center px-6">
                    <View className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl items-center">
                        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-5">
                            <Feather name="alert-circle" size={32} color="#dc2626" />
                        </View>
                        <Text className="text-2xl font-bold text-neutral-900 mb-2 text-center">Cancel Booking?</Text>
                        <Text className="text-neutral-500 mb-8 text-center text-base leading-6 px-2">This action cannot be undone. Are you sure you wish to cancel this appointment?</Text>
                        
                        <View className="flex-row gap-3 w-full">
                            <TouchableOpacity 
                                className="flex-1 py-4 bg-neutral-100 rounded-xl items-center"
                                onPress={() => setShowCancelModal(false)}
                            >
                                <Text className="font-bold text-neutral-900 text-base">Keep It</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="flex-1 py-4 bg-red-600 rounded-xl items-center"
                                onPress={confirmCancel}
                            >
                                <Text className="font-bold text-white text-base">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
