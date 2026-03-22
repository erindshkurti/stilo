import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { BookingDetailModal } from '../../components/BookingDetailModal';

interface Booking {
    id: string;
    business_id: string;
    stylist_id: string;
    customer_id: string;
    service_id: string;
    start_time: string;
    end_time: string;
    status: string;
    customerName?: string;
    serviceName?: string;
}

export default function StylistDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [stylistRecord, setStylistRecord] = useState<any>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [status, setStatus] = useState({ type: 'Active', label: 'On duty', color: 'bg-green-500' });

    useEffect(() => {
        if (!user) return;
        loadDashboard();
    }, [user]);

    async function loadDashboard() {
        try {
            // 1. Get User Profile
            const profileSnap = await getDoc(doc(db, 'profiles', user!.uid));
            if (!profileSnap.exists()) return;
            const profileData = profileSnap.data();
            setProfile(profileData);

            if (profileData.user_type !== 'stylist' || !profileData.business_id) {
                console.log('Not a stylist or no business linked');
                setLoading(false);
                return;
            }

            // 2. Find Stylist Record in Business subcollection
            const stylistsSnap = await getDocs(
                query(collection(db, 'businesses', profileData.business_id, 'stylists'), where('userId', '==', user!.uid))
            );

            if (stylistsSnap.empty) {
                console.log('No stylist record found for this user in business', profileData.business_id);
                setLoading(false);
                return;
            }

            const stylistDoc = stylistsSnap.docs[0];
            const stylistData = { id: stylistDoc.id, ...stylistDoc.data() };
            setStylistRecord(stylistData);

            // 3. Fetch Bookings for this Stylist
            const bookingsSnap = await getDocs(
                query(
                    collection(db, 'bookings'),
                    where('business_id', '==', profileData.business_id),
                    where('stylist_id', '==', stylistDoc.id),
                    orderBy('start_time', 'asc')
                )
            );

            const fetchedBookings: Booking[] = [];
            for (const d of bookingsSnap.docs) {
                const b = { id: d.id, ...d.data() } as Booking;
                
                // Only upcoming or today's recent? For now all.
                // Enrich with customer and service names
                const custSnap = await getDoc(doc(db, 'profiles', b.customer_id));
                const srvSnap = await getDoc(doc(db, 'businesses', b.business_id, 'services', b.service_id));
                
                const custData = custSnap.exists() ? custSnap.data() : null;
                
                fetchedBookings.push({
                    ...b,
                    customerName: custData ? (custData.full_name || custData.display_name || custData.email?.split('@')[0] || 'Customer') : 'Customer',
                    serviceName: srvSnap.exists() ? srvSnap.data().name : 'Service'
                });
            }
            setBookings(fetchedBookings);
            
            // 4. Determine Dynamic Status
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const todayStr = now.toISOString().split('T')[0];

            // Check Hours
            const hoursSnap = await getDocs(
                query(collection(db, 'businesses', profileData.business_id, 'stylists', stylistDoc.id, 'hours'), where('day_of_week', '==', currentDay))
            );
            
            let isAvailable = false;
            let statusLabel = 'Off duty';

            if (!hoursSnap.empty) {
                const dayHours = hoursSnap.docs[0].data();
                if (!dayHours.is_closed) {
                    if (currentTime >= dayHours.open_time && currentTime <= dayHours.close_time) {
                        isAvailable = true;
                        statusLabel = 'On duty';
                    }
                }
            }

            // Check Blocks if still available
            if (isAvailable) {
                const blocksSnap = await getDocs(
                    query(
                        collection(db, 'businesses', profileData.business_id, 'stylists', stylistDoc.id, 'blocks'),
                        where('date', '==', todayStr)
                    )
                );
                
                for (const bDoc of blocksSnap.docs) {
                    const b = bDoc.data();
                    if (currentTime >= b.start_time && currentTime <= b.end_time) {
                        isAvailable = false;
                        statusLabel = b.reason || 'On break';
                        break;
                    }
                }
            }

            setStatus({
                type: isAvailable ? 'Active' : 'Away',
                label: statusLabel,
                color: isAvailable ? 'bg-green-500' : 'bg-neutral-400'
            });

        } catch (error) {
            console.error('Error loading stylist dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.start_time) >= new Date());

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />
            <ScrollView className="flex-1">
                <View className="px-6 py-4 items-center">
                    <View style={{ maxWidth: 800, width: '100%' }}>
                        
                        {/* Welcome Header */}
                        <View className="flex-row items-center justify-between mb-8">
                            <View>
                                <Text className="text-3xl font-bold text-neutral-900">Hello, {stylistRecord?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Stylist'}</Text>
                                <Text className="text-neutral-500 mt-1">Here is your schedule for today</Text>
                            </View>
                        </View>

                        {/* Summary Stats */}
                        <View className="flex-row gap-4 mb-8">
                            <View className="flex-1 bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
                                <Text className="text-neutral-500 text-sm font-medium uppercase tracking-wider mb-1">Today</Text>
                                <Text className="text-3xl font-bold text-neutral-900">{upcomingBookings.length}</Text>
                                <Text className="text-neutral-400 text-xs mt-1">Appointments</Text>
                            </View>
                             <View className="flex-1 bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
                                <Text className="text-neutral-500 text-sm font-medium uppercase tracking-wider mb-1">Status</Text>
                                <View className="flex-row items-center">
                                    <View className={`w-2 h-2 rounded-full ${status.color} mr-2`} />
                                    <Text className="text-lg font-bold text-neutral-900">{status.type}</Text>
                                </View>
                                <Text className="text-neutral-400 text-xs mt-1">{status.label}</Text>
                            </View>
                        </View>

                        {/* Quick Actions */}
                        <View className="flex-row gap-4 mb-8">
                            <TouchableOpacity 
                                onPress={() => router.push('/stylist/hours')}
                                className="flex-1 bg-white border border-neutral-200 p-4 rounded-2xl flex-row items-center justify-center"
                            >
                                <Feather name="clock" size={18} color="#000" />
                                <Text className="ml-2 font-bold text-neutral-900">Working Hours</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => router.push('/stylist/blocks')}
                                className="flex-1 bg-white border border-neutral-200 p-4 rounded-2xl flex-row items-center justify-center"
                            >
                                <Feather name="slash" size={18} color="#000" />
                                <Text className="ml-2 font-bold text-neutral-900">Blocked Time</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Recent/Upcoming Appointments */}
                        <View className="mb-8">
                            <View className="flex-row items-center justify-between mb-6">
                                <Text className="text-xl font-bold text-neutral-900">Upcoming Schedule</Text>
                                <TouchableOpacity onPress={() => loadDashboard()} className="p-2">
                                    <Feather name="refresh-cw" size={18} color="#737373" />
                                </TouchableOpacity>
                            </View>

                            {upcomingBookings.length > 0 ? (
                                <View className="space-y-4">
                                    {upcomingBookings.map((booking) => (
                                        <View key={booking.id} className="bg-white border border-neutral-100 rounded-2xl p-5 flex-row items-center shadow-sm">
                                            <View className="items-center justify-center bg-neutral-50 w-16 h-16 rounded-xl mr-5">
                                                <Text className="text-neutral-900 font-bold text-lg">
                                                    {new Date(booking.start_time).getHours().toString().padStart(2, '0')}:
                                                    {new Date(booking.start_time).getMinutes().toString().padStart(2, '0')}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-lg font-bold text-neutral-900">{booking.customerName}</Text>
                                                <View className="flex-row items-center mt-1">
                                                    <Feather name="scissors" size={14} color="#737373" />
                                                    <Text className="text-neutral-600 ml-1.5 font-medium">{booking.serviceName}</Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    setSelectedBooking(booking);
                                                    setModalVisible(true);
                                                }}
                                                className="bg-neutral-900 px-4 py-2 rounded-xl"
                                            >
                                                <Text className="text-white font-bold text-xs uppercase">View</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="bg-neutral-50 rounded-3xl py-12 items-center border border-dashed border-neutral-200">
                                    <Feather name="calendar" size={40} color="#d4d4d4" />
                                    <Text className="text-neutral-500 mt-4 text-center px-8">You don't have any appointments scheduled for today.</Text>
                                </View>
                            )}
                        </View>

                    </View>
                </View>
            </ScrollView>

            <BookingDetailModal 
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedBooking(null);
                }}
                booking={selectedBooking}
                onUpdate={loadDashboard}
                isStylistView={true}
            />
        </SafeAreaView>
    );
}
