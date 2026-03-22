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

interface Stylist {
    id: string;
    name: string;
    image_url?: string;
}

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

export default function BusinessCalendar() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 1024;

    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<any>(null);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user, selectedDate]);

    async function loadData() {
        try {
            // 1. Get Business
            const bizSnap = await getDocs(query(collection(db, 'businesses'), where('owner_id', '==', user!.uid)));
            if (bizSnap.empty) return;
            const bizDoc = bizSnap.docs[0];
            const bizData = { id: bizDoc.id, ...bizDoc.data() };
            setBusiness(bizData);

            // 2. Get Stylists
            const stylistsSnap = await getDocs(collection(db, 'businesses', bizDoc.id, 'stylists'));
            const stylistsList = stylistsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Stylist));
            setStylists(stylistsList);

            // 3. Get Bookings for the selected day
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const bookingsSnap = await getDocs(
                query(
                    collection(db, 'bookings'),
                    where('business_id', '==', bizDoc.id),
                    where('start_time', '>=', startOfDay.toISOString()),
                    where('start_time', '<=', endOfDay.toISOString()),
                    orderBy('start_time', 'asc')
                )
            );

            const fetchedBookings: Booking[] = [];
            const profileCache: Record<string, string> = {};
            const serviceCache: Record<string, string> = {};

            for (const d of bookingsSnap.docs) {
                const b = { id: d.id, ...d.data() } as Booking;
                
                // Enrich
                if (!profileCache[b.customer_id]) {
                    const cSnap = await getDoc(doc(db, 'profiles', b.customer_id));
                    profileCache[b.customer_id] = cSnap.exists() ? cSnap.data().full_name : 'Customer';
                }
                if (!serviceCache[b.service_id]) {
                    const sSnap = await getDoc(doc(db, 'businesses', bizDoc.id, 'services', b.service_id));
                    serviceCache[b.service_id] = sSnap.exists() ? sSnap.data().name : 'Service';
                }

                fetchedBookings.push({
                    ...b,
                    customerName: profileCache[b.customer_id],
                    serviceName: serviceCache[b.service_id]
                });
            }
            setBookings(fetchedBookings);

        } catch (error: any) {
            if (error.message?.includes('requires an index')) {
                console.warn('Calendar query failed: Missing Firestore index. Please click the link in your console to create it.');
            }
            console.error('Error loading calendar:', error);
        } finally {
            setLoading(false);
        }
    }

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />
            <ScrollView className="flex-1">
                <View className="px-6 py-8">
                    {/* Header with Date Selector */}
                    <View className="flex-row items-center justify-between mb-8">
                        <View>
                            <Text className="text-3xl font-bold text-neutral-900">Schedule</Text>
                            <Text className="text-neutral-500 mt-1">{business?.name}</Text>
                        </View>
                        <View className="flex-row items-center bg-neutral-100 rounded-2xl p-1">
                            <TouchableOpacity onPress={() => changeDate(-1)} className="p-3">
                                <Feather name="chevron-left" size={20} color="#000" />
                            </TouchableOpacity>
                            <View className="px-4">
                                <Text className="font-bold text-neutral-900">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => changeDate(1)} className="p-3">
                                <Feather name="chevron-right" size={20} color="#000" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Master Grid */}
                    <View className="flex-row" style={{ minHeight: 600 }}>
                        {/* Time labels column */}
                        <View className="w-16 pt-20">
                            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                                <View key={h} className="h-20 justify-start">
                                    <Text className="text-neutral-400 text-xs font-medium">{h}:00</Text>
                                </View>
                            ))}
                        </View>

                        {/* Stylist columns */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View className="flex-row">
                                {stylists.map((stylist) => {
                                    const stylistBookings = bookings.filter(b => b.stylist_id === stylist.id);
                                    
                                    return (
                                        <View key={stylist.id} className="w-64 border-l border-neutral-100 px-2">
                                            {/* Stylist Header */}
                                            <View className="items-center mb-6">
                                                {stylist.image_url ? (
                                                    <Image source={{ uri: stylist.image_url }} className="w-12 h-12 rounded-full mb-2 bg-neutral-100" />
                                                ) : (
                                                    <View className="w-12 h-12 rounded-full bg-neutral-200 items-center justify-center mb-2">
                                                        <Feather name="user" size={20} color="#737373" />
                                                    </View>
                                                )}
                                                <Text className="font-bold text-neutral-900 text-center" numberOfLines={1}>{stylist.name}</Text>
                                            </View>

                                            {/* Hourly Slots / Bookings Overlay */}
                                            <View className="relative">
                                                {/* Background Grid Lines */}
                                                {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                                                    <View key={h} className="h-20 border-t border-neutral-50" />
                                                ))}

                                                {/* Booking Cards */}
                                                {stylistBookings.map((b) => {
                                                    const start = new Date(b.start_time);
                                                    const hour = start.getHours();
                                                    const mins = start.getMinutes();
                                                    // Calculate top based on hour (9:00 = 0)
                                                    const top = (hour - 9) * 80 + (mins / 60) * 80;
                                                    
                                                    // Duration for height (simplistic assume 1hr for now or calc)
                                                    const end = new Date(b.end_time);
                                                    const durMins = (end.getTime() - start.getTime()) / 60000;
                                                    const height = (durMins / 60) * 80;

                                                    return (
                                                        <TouchableOpacity 
                                                            key={b.id}
                                                            onPress={() => {
                                                                setSelectedBooking(b);
                                                                setModalVisible(true);
                                                            }}
                                                            style={{ 
                                                                position: 'absolute', 
                                                                top, 
                                                                height: height - 4,
                                                                left: 4,
                                                                right: 4,
                                                            }}
                                                            className="bg-neutral-900 rounded-xl p-3 shadow-sm border border-black/10"
                                                        >
                                                            <Text className="text-white font-bold text-xs" numberOfLines={1}>{b.customerName}</Text>
                                                            <Text className="text-neutral-400 text-[10px] mt-0.5" numberOfLines={1}>{b.serviceName}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    );
                                })}

                                {stylists.length === 0 && (
                                    <View className="w-64 items-center justify-center opacity-50">
                                        <Text className="text-neutral-400">No team members</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
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
                onUpdate={loadData}
            />
        </SafeAreaView>
    );
}
