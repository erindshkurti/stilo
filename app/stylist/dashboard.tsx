import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Image, useWindowDimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    customerEmail?: string;
    customerPhone?: string;
    customerAvatar?: string;
    serviceName?: string;
}

export default function StylistDashboard() {
    const insets = useSafeAreaInsets();
    const { user, isLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;

    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (isLoading || !user) return;
        loadData();
    }, [user, isLoading]);

    async function loadData() {
        try {
            const profileSnap = await getDoc(doc(db, 'profiles', user!.uid));
            if (!profileSnap.exists()) {
                setLoading(false);
                return;
            }
            const profileData = profileSnap.data();
            setProfile(profileData);
            
            if (profileData.user_type !== 'stylist' || !profileData.business_id) {
                setLoading(false);
                return;
            }

            const businessId = profileData.business_id;

            // Find the stylist document ID that belongs to this user
            const stylistSnap = await getDocs(
                query(
                    collection(db, 'businesses', businessId, 'stylists'),
                    where('userId', '==', user!.uid)
                )
            );
            
            if (stylistSnap.empty) {
                setLoading(false);
                return;
            }
            const stylistDocId = stylistSnap.docs[0].id;

            // Get bookings where stylist_id matches the stylist document ID
            const bookingsSnap = await getDocs(
                query(
                    collection(db, 'bookings'),
                    where('business_id', '==', businessId),
                    where('stylist_id', '==', stylistDocId),
                    orderBy('start_time', 'desc')
                )
            );

            const fetchedBookings: Booking[] = [];
            const customerCache: Record<string, any> = {};
            const serviceCache: Record<string, string> = {};

            for (const d of bookingsSnap.docs) {
                const bData = d.data();
                const b = { id: d.id, ...bData } as Booking;
                
                if (!customerCache[b.customer_id]) {
                    const cSnap = await getDoc(doc(db, 'profiles', b.customer_id));
                    customerCache[b.customer_id] = cSnap.exists() ? cSnap.data() : { full_name: 'Customer' };
                }
                if (!serviceCache[b.service_id]) {
                    const sSnap = await getDoc(doc(db, 'businesses', businessId, 'services', b.service_id));
                    serviceCache[b.service_id] = sSnap.exists() ? sSnap.data().name : 'Service';
                }

                fetchedBookings.push({
                    ...b,
                    customerName: customerCache[b.customer_id].full_name || 'Customer',
                    customerEmail: customerCache[b.customer_id].email,
                    customerPhone: customerCache[b.customer_id].phone,
                    customerAvatar: customerCache[b.customer_id].avatar_url,
                    serviceName: serviceCache[b.service_id]
                });
            }
            setBookings(fetchedBookings);
        } catch (error: any) {
            console.error('Error loading stylist dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

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
                <Header />
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={[styles.container, isLargeScreen ? styles.containerLarge : styles.containerMobile]}>
                        <View style={styles.header}>
                            <Text style={styles.title}>My Work Bookings</Text>
                            <Text style={styles.subtitle}>Manage your upcoming appointments</Text>
                        </View>

                        {bookings.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconCircle}>
                                    <Feather name="calendar" size={32} color="#a3a3a3" />
                                </View>
                                <Text style={styles.emptyTitle}>No appointments yet</Text>
                                <Text style={styles.emptySubtitle}>When customers book with you, they'll appear here.</Text>
                            </View>
                        ) : (
                            <View style={styles.list}>
                                {bookings.map((booking) => (
                                    <TouchableOpacity
                                        key={booking.id}
                                        onPress={() => { setSelectedBooking(booking); setModalVisible(true); }}
                                        style={styles.card}
                                    >
                                        <View style={styles.avatarContainer}>
                                            {booking.customerAvatar ? (
                                                <Image source={{ uri: booking.customerAvatar }} style={styles.avatar} />
                                            ) : (
                                                <Feather name="user" size={24} color="#737373" />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.customerName}>{booking.customerName}</Text>
                                            <Text style={styles.serviceName}>{booking.serviceName}</Text>
                                            <View style={styles.timeRow}>
                                                <Feather name="clock" size={14} color="#737373" />
                                                <Text style={styles.timeText}>
                                                    {new Date(booking.start_time).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })} at {new Date(booking.start_time).toLocaleTimeString('en-US', { 
                                                        hour: 'numeric', 
                                                        minute: '2-digit' 
                                                    })}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.statusBadge, booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusNeutral]}>
                                            <Text style={[styles.statusText, booking.status === 'confirmed' ? styles.textGreen600 : styles.textNeutral500]}>
                                                {booking.status}
                                            </Text>
                                        </View>
                                        <Feather name="chevron-right" size={20} color="#d4d4d4" style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    containerLarge: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
    },
    containerMobile: {},
    header: {
        marginBottom: 32,
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
    emptyContainer: {
        backgroundColor: '#fafafa',
        borderRadius: 24,
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#e5e5e5',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        backgroundColor: '#f5f5f5',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#171717',
        fontWeight: 'bold',
        fontSize: 18,
    },
    emptySubtitle: {
        color: '#737373',
        textAlign: 'center',
        marginTop: 8,
    },
    list: {
        gap: 16,
    },
    card: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f5f5f5',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    customerName: {
        color: '#171717',
        fontWeight: 'bold',
        fontSize: 18,
    },
    serviceName: {
        color: '#737373',
        fontWeight: '500',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    timeText: {
        color: '#737373',
        fontSize: 14,
        marginLeft: 6,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statusConfirmed: {
        backgroundColor: '#f0fdf4',
    },
    statusNeutral: {
        backgroundColor: '#f5f5f5',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    textGreen600: {
        color: '#16a34a',
    },
    textNeutral500: {
        color: '#737373',
    }
});
