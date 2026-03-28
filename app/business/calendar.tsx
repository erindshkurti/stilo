import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    customerEmail?: string;
    customerPhone?: string;
    customerAvatar?: string;
    serviceName?: string;
}

export default function BusinessCalendar() {
    const insets = useSafeAreaInsets();
    const { user, isLoading } = useAuth();
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

    // Date strip: generate 60 days centered on today
    const STRIP_DAYS = 60;
    const STRIP_OFFSET = 30; // today is at index 30
    const DATE_CHIP_WIDTH = 64; // 56px chip + 8px margin
    const dateStripRef = useRef<ScrollView>(null);

    const baseDate = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - STRIP_OFFSET);
        return d;
    }, []);

    const dateStrip = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        return d;
    }), [baseDate]);

    // Scroll to center a specific date in the strip
    const scrollViewWidth = useRef(0);
    const scrollToDate = useCallback((date: Date, animated = true) => {
        const dateNorm = new Date(date);
        dateNorm.setHours(0, 0, 0, 0);
        const baseNorm = new Date(baseDate);
        baseNorm.setHours(0, 0, 0, 0);
        const daysDiff = Math.round((dateNorm.getTime() - baseNorm.getTime()) / (1000 * 60 * 60 * 24));
        // Center the date using measured ScrollView width
        const visibleWidth = scrollViewWidth.current || (width - 144);
        const offset = (daysDiff * DATE_CHIP_WIDTH) - (visibleWidth / 2) + (DATE_CHIP_WIDTH / 2);
        dateStripRef.current?.scrollTo({ x: Math.max(0, offset), animated });
    }, [baseDate, width]);

    // Initial scroll to today — fires from onLayout after width is measured
    const hasScrolledInitially = useRef(false);

    useEffect(() => {
        if (stylists.length > 0 && !selectedStylistId) {
            setSelectedStylistId(stylists[0].id);
        }
    }, [stylists]);

    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        scrollToDate(date);
    }, [scrollToDate]);

    const shiftSelectedDate = useCallback((delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + delta);
        setSelectedDate(newDate);
        scrollToDate(newDate);
    }, [selectedDate, scrollToDate]);

    useEffect(() => {
        if (isLoading || !user) return;
        loadData();
    }, [user, selectedDate, isLoading]);

    async function loadData() {
        try {
            const bizSnap = await getDocs(query(collection(db, 'businesses'), where('owner_id', '==', user!.uid)));
            if (bizSnap.empty) return;
            const bizDoc = bizSnap.docs[0];
            const bizData = { id: bizDoc.id, ...bizDoc.data() };
            setBusiness(bizData);

            const stylistsSnap = await getDocs(collection(db, 'businesses', bizDoc.id, 'stylists'));
            const stylistsList = stylistsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Stylist));
            setStylists(stylistsList);

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
            const profileCache: Record<string, any> = {};
            const serviceCache: Record<string, string> = {};

            for (const d of bookingsSnap.docs) {
                const bData = d.data();
                if (bData.status === 'cancelled') continue;
                const b = { id: d.id, ...bData } as Booking;
                
                if (!profileCache[b.customer_id]) {
                    const cSnap = await getDoc(doc(db, 'profiles', b.customer_id));
                    profileCache[b.customer_id] = cSnap.exists() ? cSnap.data() : { full_name: 'Customer' };
                }
                if (!serviceCache[b.service_id]) {
                    const sSnap = await getDoc(doc(db, 'businesses', bizDoc.id, 'services', b.service_id));
                    serviceCache[b.service_id] = sSnap.exists() ? sSnap.data().name : 'Service';
                }

                fetchedBookings.push({
                    ...b,
                    customerName: profileCache[b.customer_id].full_name || 'Customer',
                    customerEmail: profileCache[b.customer_id].email,
                    customerPhone: profileCache[b.customer_id].phone,
                    customerAvatar: profileCache[b.customer_id].avatar_url,
                    serviceName: serviceCache[b.service_id]
                });
            }
            setBookings(fetchedBookings);
        } catch (error: any) {
            console.error('Error loading calendar:', error);
        } finally {
            setLoading(false);
        }
    }

    const renderStylistColumn = (stylist: Stylist) => {
        const stylistBookings = bookings.filter(b => b.stylist_id === stylist.id);
        return (
            <View key={stylist.id} style={[styles.stylistColumn, isLargeScreen ? styles.stylistColumnLarge : styles.stylistColumnMobile]}>
                {isLargeScreen && (
                    <View style={styles.stylistHeader}>
                        {stylist.image_url ? (
                            <Image source={{ uri: stylist.image_url }} style={styles.stylistAvatar} />
                        ) : (
                            <View style={styles.stylistAvatarPlaceholder}>
                                <Feather name="user" size={20} color="#737373" />
                            </View>
                        )}
                        <Text style={styles.stylistName} numberOfLines={1}>{stylist.name}</Text>
                    </View>
                )}
                <View style={{ position: 'relative' }}>
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                        <View key={h} style={styles.hourSlot} />
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
                                onPress={() => { setSelectedBooking(b); setModalVisible(true); }}
                                style={[styles.bookingCard, { top, height: height - 4 }]}
                            >
                                <View style={styles.bookingContent}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <View style={{ marginRight: 6, opacity: 0.8 }}>
                                            <Feather name="scissors" size={13} color="#fff" />
                                        </View>
                                        <Text style={styles.bookingText} numberOfLines={1}>
                                            {b.customerName || 'Client'}{' '}
                                            <Text style={styles.bookingService}>• {b.serviceName}</Text>
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

    if (isLoading || loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (!user) return null;

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={{ flex: 1 }}>
                <Header showBack={true} backHref="/business/dashboard" />
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={[styles.container, isLargeScreen ? styles.containerLarge : styles.containerMobile]}>
                        <View style={styles.headerRow}>
                            <View>
                                <Text style={styles.title}>Schedule</Text>
                                <Text style={styles.subtitle}>{business?.name}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    const today = new Date();
                                    setSelectedDate(today);
                                    scrollToDate(today);
                                }}
                                style={styles.todayButton}
                            >
                                <Text style={styles.todayButtonText}>Today</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.dateLabel}>
                            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Text>

                        <View style={styles.dateStripContainer}>
                            <TouchableOpacity
                                onPress={() => shiftSelectedDate(-1)}
                                style={styles.navArrowButton}
                            >
                                <Feather name="chevron-left" size={20} color="#737373" />
                            </TouchableOpacity>

                            <ScrollView
                                ref={dateStripRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.dateScrollView}
                                contentContainerStyle={styles.dateScrollContent}
                                onLayout={(e) => {
                                    scrollViewWidth.current = e.nativeEvent.layout.width;
                                    if (!hasScrolledInitially.current) {
                                        hasScrolledInitially.current = true;
                                        // Use setTimeout(0) to ensure content is rendered
                                        setTimeout(() => scrollToDate(selectedDate, false), 0);
                                    }
                                }}
                            >
                                {dateStrip.map((date, idx) => {
                                    const isSelected = date.toDateString() === selectedDate.toDateString();
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => handleDateSelect(date)}
                                            style={[styles.dateButton, isSelected ? styles.dateButtonSelected : styles.dateButtonNormal]}
                                        >
                                            <Text style={[styles.dateWeekday, isSelected ? styles.textNeutral400 : styles.textNeutral400]}>
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </Text>
                                            <Text style={[styles.dateDay, isSelected ? styles.textWhite : styles.textNeutral900]}>
                                                {date.getDate()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <TouchableOpacity
                                onPress={() => shiftSelectedDate(1)}
                                style={styles.navArrowButton}
                            >
                                <Feather name="chevron-right" size={20} color="#737373" />
                            </TouchableOpacity>
                        </View>

                        {!isLargeScreen && (
                            <View style={styles.stylistStripContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {stylists.map((stylist) => {
                                        const isSelected = selectedStylistId === stylist.id;
                                        return (
                                            <TouchableOpacity
                                                key={stylist.id}
                                                onPress={() => setSelectedStylistId(stylist.id)}
                                                style={[styles.stylistPill, isSelected ? styles.stylistPillSelected : styles.stylistPillNormal]}
                                            >
                                                {stylist.image_url ? (
                                                    <Image source={{ uri: stylist.image_url }} style={styles.pillAvatar} />
                                                ) : (
                                                    <View style={[styles.pillAvatarPlaceholder, isSelected ? styles.bgNeutral800 : styles.bgNeutral100]}>
                                                        <Feather name="user" size={12} color={isSelected ? '#fff' : '#737373'} />
                                                    </View>
                                                )}
                                                <Text style={[styles.pillText, isSelected ? styles.textWhite : styles.textNeutral900]}>{stylist.name}</Text>
                                            </TouchableOpacity>
                                        );
                                      })}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.calendarBody}>
                            <View style={[isLargeScreen ? styles.timeGutterLarge : styles.timeGutterMobile, isLargeScreen ? { paddingTop: 104 } : { paddingTop: 0 }]}>
                                {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                                    <View key={h} style={styles.timeLabelSlot}>
                                        <View style={[styles.timeLabelContainer, isLargeScreen ? { right: 16 } : { right: 12 }]}>
                                            <Text style={styles.timeLabelText}>
                                                {h}:00
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <View style={{ flex: 1 }}>
                                {isLargeScreen ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row' }}>
                                            {stylists.map(stylist => renderStylistColumn(stylist))}
                                        </View>
                                    </ScrollView>
                                ) : (
                                    <View>
                                        {stylists.find(s => s.id === selectedStylistId) ? (
                                            renderStylistColumn(stylists.find(s => s.id === selectedStylistId)!)
                                        ) : (
                                            <View style={styles.emptyState}>
                                                <Text style={{ color: '#a3a3a3' }}>Select a team member</Text>
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
                    onClose={() => { setModalVisible(false); setSelectedBooking(null); }}
                    booking={selectedBooking}
                    onUpdate={loadData}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    container: {
        paddingVertical: 32,
    },
    containerLarge: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        paddingHorizontal: 24,
    },
    containerMobile: {
        paddingHorizontal: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#171717',
    },
    subtitle: {
        color: '#737373',
        marginTop: 4,
    },
    todayButton: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
    },
    todayButtonText: {
        color: '#171717',
        fontWeight: 'bold',
        fontSize: 12,
    },
    dateLabel: {
        color: '#a3a3a3',
        fontWeight: '500',
        marginBottom: 24,
    },
    dateStripContainer: {
        marginBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
    },
    navArrowButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    dateScrollView: {
        flex: 1,
        marginHorizontal: 8,
    },
    dateScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 80,
        borderRadius: 16,
        marginHorizontal: 4,
    },
    dateButtonNormal: {
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    dateButtonSelected: {
        backgroundColor: 'black',
    },
    dateWeekday: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dateDay: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
    },
    textNeutral400: {
        color: '#a3a3a3',
    },
    textNeutral900: {
        color: '#171717',
    },
    textWhite: {
        color: 'white',
    },
    stylistStripContainer: {
        marginBottom: 32,
    },
    stylistPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 12,
        borderWidth: 1,
    },
    stylistPillNormal: {
        backgroundColor: 'white',
        borderColor: '#e5e5e5',
    },
    stylistPillSelected: {
        backgroundColor: 'black',
        borderColor: 'black',
    },
    pillAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    pillAvatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    bgNeutral800: {
        backgroundColor: '#262626',
    },
    bgNeutral100: {
        backgroundColor: '#f5f5f5',
    },
    pillText: {
        fontWeight: '500',
        fontSize: 14,
    },
    calendarBody: {
        flexDirection: 'row',
        minHeight: 600,
    },
    timeGutterLarge: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: '#f5f5f5',
    },
    timeGutterMobile: {
        width: 64,
        borderRightWidth: 1,
        borderRightColor: '#f5f5f5',
    },
    timeLabelSlot: {
        height: 80,
        position: 'relative',
    },
    timeLabelContainer: {
        position: 'absolute',
        top: -10,
        backgroundColor: 'white',
        paddingHorizontal: 4,
        zIndex: 10,
    },
    timeLabelText: {
        color: '#737373',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
    },
    stylistColumn: {
        borderLeftWidth: 1,
        borderLeftColor: '#f5f5f5',
        flex: 1,
    },
    stylistColumnLarge: {
        paddingHorizontal: 16,
        minWidth: 300,
    },
    stylistColumnMobile: {
        paddingHorizontal: 8,
    },
    stylistHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    stylistAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
    },
    stylistAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e5e5e5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    stylistName: {
        fontWeight: 'bold',
        color: '#171717',
        textAlign: 'center',
    },
    hourSlot: {
        height: 80,
        borderTopWidth: 1,
        borderTopColor: '#fafafa',
    },
    bookingCard: {
        position: 'absolute',
        left: 4,
        right: 4,
        backgroundColor: '#171717',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    bookingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookingText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    bookingService: {
        color: '#e5e5e5',
        fontWeight: '500',
        fontSize: 12,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    }
});
