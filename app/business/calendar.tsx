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
    const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);

    // Initial selected stylist
    useEffect(() => {
        if (stylists.length > 0 && !selectedStylistId) {
            setSelectedStylistId(stylists[0].id);
        }
    }, [stylists]);

    // Generate dates for horizontal strip (3 days before and 3 after)
    const dateStrip = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(selectedDate);
        // We want today (or selectedDate) to be roughly central if possible, 
        // but for simplicity let's just do a 7 day range around selectedDate
        d.setDate(d.getDate() - 3 + i);
        return d;
    });

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

    const renderStylistColumn = (stylist: Stylist) => {
        const stylistBookings = bookings.filter(b => b.stylist_id === stylist.id);
        
        return (
            <View 
                key={stylist.id} 
                className={`border-l border-neutral-100 ${isLargeScreen ? 'px-4 flex-1 min-w-[300px] max-w-[500px]' : 'px-2 flex-1'}`}
            >
                {isLargeScreen && (
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
                )}

                <View className="relative">
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                        <View key={h} className="h-20 border-t border-neutral-50" />
                    ))}

                    {stylistBookings.map((b) => {
                        const start = new Date(b.start_time);
                        const hour = start.getHours();
                        const mins = start.getMinutes();
                        const top = (hour - 9) * 80 + (mins / 60) * 80;
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
                                className="bg-neutral-900 rounded-xl px-3 py-1 shadow-sm border border-black/10"
                            >
                                <View className="flex-1 justify-center items-center px-2">
                                    <View className="flex-row items-center justify-center">
                                        <View className="mr-1.5 opacity-80">
                                            <Feather name="scissors" size={13} color="#fff" />
                                        </View>
                                        <Text className="text-white font-bold text-sm leading-tight text-center" numberOfLines={1}>
                                            {b.customerName || 'Client'}{' '}
                                            <Text className="text-neutral-200 font-medium text-xs">• {b.serviceName}</Text>
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
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
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-2">
                        <View>
                            <Text className="text-3xl font-bold text-neutral-900">Schedule</Text>
                            <Text className="text-neutral-500 mt-1">{business?.name}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setSelectedDate(new Date())}
                            className="bg-neutral-100 px-4 py-2 rounded-full active:bg-neutral-200"
                        >
                            <Text className="text-neutral-900 font-bold text-xs">Today</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-neutral-400 font-medium mb-6">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>

                    {/* Horizontal Date Strip */}
                    <View className="mb-8">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {dateStrip.map((date, idx) => {
                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => setSelectedDate(date)}
                                        className={`items-center justify-center w-14 h-20 rounded-2xl mr-3 ${isSelected ? 'bg-black' : 'bg-neutral-50 border border-neutral-100'}`}
                                    >
                                        <Text className={`text-[10px] uppercase font-bold ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </Text>
                                        <Text className={`text-lg font-bold mt-1 ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity
                                onPress={() => {
                                    const next = new Date(selectedDate);
                                    next.setDate(next.getDate() + 7);
                                    setSelectedDate(next);
                                }}
                                className="items-center justify-center w-14 h-20 rounded-2xl bg-neutral-50 border border-neutral-100 active:bg-neutral-100"
                            >
                                <Feather name="chevron-right" size={20} color="#737373" />
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Stylist Avatar Switcher (Sticky-like for mobile) */}
                    <View className="mb-8">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {stylists.map((stylist) => {
                                const isSelected = selectedStylistId === stylist.id;
                                return (
                                    <TouchableOpacity
                                        key={stylist.id}
                                        onPress={() => setSelectedStylistId(stylist.id)}
                                        className={`flex-row items-center px-4 py-2 rounded-full mr-3 border ${isSelected ? 'bg-black border-black shadow-lg shadow-black/20' : 'bg-white border-neutral-200'}`}
                                    >
                                        {stylist.image_url ? (
                                            <Image source={{ uri: stylist.image_url }} className="w-6 h-6 rounded-full mr-2" />
                                        ) : (
                                            <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${isSelected ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                                                <Feather name="user" size={12} color={isSelected ? '#fff' : '#737373'} />
                                            </View>
                                        )}
                                        <Text className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-neutral-900'}`}>{stylist.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Master Grid */}
                    <View className="flex-row" style={{ minHeight: 600 }}>
                        {/* Time labels column */}
                        <View className={`${isLargeScreen ? 'w-20' : 'w-16'} border-r border-neutral-100 ${isLargeScreen ? 'pt-[104px]' : 'pt-0'}`}>
                            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                                <View key={h} className="h-20 relative">
                                    <View className={`absolute -top-[10px] ${isLargeScreen ? 'right-4' : 'right-3'} bg-white px-1 z-10`}>
                                        <Text className={`text-neutral-500 ${isLargeScreen ? 'text-sm' : 'text-sm'} font-bold uppercase tracking-tight`}>
                                            {h}:00
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Stylist content area */}
                        <View className="flex-1">
                            {isLargeScreen ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row">
                                        {stylists.map(stylist => renderStylistColumn(stylist))}
                                    </View>
                                </ScrollView>
                            ) : (
                                <View>
                                    {stylists.find(s => s.id === selectedStylistId) ? (
                                        renderStylistColumn(stylists.find(s => s.id === selectedStylistId)!)
                                    ) : (
                                        <View className="flex-1 items-center justify-center pt-20">
                                            <Text className="text-neutral-400">Select a team member</Text>
                                        </View>
                                    )}
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
                onUpdate={loadData}
            />
        </SafeAreaView>
    );
}
