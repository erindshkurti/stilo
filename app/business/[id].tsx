import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Share, Text, TouchableOpacity, View, useWindowDimensions, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, increment } from 'firebase/firestore';
import { AlertModal } from '../../components/AlertModal';

interface BusinessDetails {
    id: string;
    name: string;
    description: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    rating: number;
    review_count: number;
    phone: string;
    cover_image_url: string | null;
    logo_url: string | null;
}

interface PortfolioImage {
    id: string;
    image_url: string;
    caption: string;
    is_featured?: boolean;
}

interface Service {
    id: string;
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
}

interface Stylist {
    id: string;
    name: string;
    image_url: string | null;
    specialties: string[] | null;
}

export default function BusinessPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 1024;
    const insets = useSafeAreaInsets();

    const [business, setBusiness] = useState<BusinessDetails | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [team, setTeam] = useState<Stylist[]>([]);
    const [loading, setLoading] = useState(true);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);
    const [userRating, setUserRating] = useState<number | null>(null);
    const [ratingLoading, setRatingLoading] = useState(false);
    
    // Alert Modal State
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type: 'error' | 'success' | 'info'; confirmLabel?: string; onConfirm?: () => void; cancelLabel?: string; onCancel?: () => void }>({ 
        title: '', 
        message: '', 
        type: 'info' 
    });

    const showAlert = (config: typeof alertConfig) => {
        setAlertConfig(config);
        setShowAlertModal(true);
    };
    const { user } = useAuth();

    useEffect(() => {
        if (!id) return;

        async function fetchData() {
            try {
                // 1. Fetch Business Details
                const businessSnap = await getDoc(doc(db, 'businesses', id as string));
                if (!businessSnap.exists()) throw new Error('Business not found');
                setBusiness({ id: businessSnap.id, ...businessSnap.data() } as BusinessDetails);

                // 2. Fetch Portfolio (subcollection)
                const portfolioSnap = await getDocs(
                    query(collection(db, 'businesses', id as string, 'portfolio'), orderBy('display_order'))
                );
                setPortfolio(portfolioSnap.docs.map(d => ({ id: d.id, ...d.data() } as PortfolioImage)));

                // 3. Fetch Services (subcollection)
                const servicesSnap = await getDocs(
                    collection(db, 'businesses', id as string, 'services')
                );
                setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));

                // 4. Fetch Team/Stylists (subcollection)
                const teamSnap = await getDocs(
                    collection(db, 'businesses', id as string, 'stylists')
                );
                setTeam(teamSnap.docs.map(d => ({ id: d.id, ...d.data() } as Stylist)));

            } catch (error) {
                console.error('Error fetching business details:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    // Fetch User Rating
    useEffect(() => {
        if (!user || !id) return;
        async function fetchUserRating() {
            if (!user) return;
            try {
                const ratingSnap = await getDoc(doc(db, 'ratings', `${user.uid}_${id}`));
                if (ratingSnap.exists()) {
                    const r = ratingSnap.data().rating;
                    setUserRating(r);
                    setSelectedRating(r);
                }
            } catch (e) {
                console.error('Fetch user rating error:', e);
            }
        }
        fetchUserRating();
    }, [user, id]);

    const handleShare = async () => {
        if (!business) return;
        try {
            const url = Linking.createURL(`business/${id}`);
            await Share.share({
                message: `Check out ${business.name} on Stilo! Book your appointment now: ${url}`,
                title: business.name
            });
        } catch (e) {
            console.error('Share error:', e);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (!business) {
        return (
            <View className="flex-1 items-center justify-center bg-white px-6">
                <Text className="text-lg font-bold text-center">Business not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3 bg-neutral-100 rounded-lg">
                    <Text>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ headerShown: false }} />
            <Header />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                <View className="w-full items-center pb-32">
                    <View style={{ width: '100%', maxWidth: 1200 }}>
                        {/* Cover Image Section */}
                        <View className={`relative w-full h-72 bg-neutral-200 ${isLargeScreen ? 'rounded-b-3xl overflow-hidden' : ''}`}>
                            {business.cover_image_url ? (
                                <Image
                                    source={{ uri: business.cover_image_url }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="w-full h-full items-center justify-center bg-neutral-800">
                                    <Feather name="image" size={48} color="#525252" />
                                </View>
                            )}

                            {/* Overlay Gradient/Shadow */}
                            <View className="absolute inset-0 bg-black/20" />

                            {/* Back Button - Only show on mobile or if Header doesn't provide enough nav context. 
                                Since Header is present, maybe we keep these overlays as quick actions? 
                                User asked to "keep the header", implying they want the main nav. 
                                We'll keep these overlay buttons as they are contextually useful for the Business Profile specifically. */}
                            {/* Back Button Overlay */}
                            <View className="absolute top-0 left-0 right-0 z-10">
                                <View className="px-4 py-4 flex-row justify-between items-center">
                                    <TouchableOpacity
                                        onPress={() => router.back()}
                                        className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                                    >
                                        <Feather name="arrow-left" size={24} color="#000" />
                                    </TouchableOpacity>

                                    <View className="flex-row gap-3">
                                        <TouchableOpacity 
                                            onPress={handleShare}
                                            className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                                        >
                                            <Feather name="share" size={20} color="#000" />
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            onPress={() => {
                                                if (!user) {
                                                    showAlert({
                                                        title: 'Sign In Required',
                                                        message: 'Please sign in to rate this business and share your experience.',
                                                        type: 'info',
                                                        confirmLabel: 'Sign In',
                                                        onConfirm: () => {
                                                            setShowAlertModal(false);
                                                            router.push('/sign-in');
                                                        },
                                                        cancelLabel: 'Cancel',
                                                        onCancel: () => setShowAlertModal(false)
                                                    });
                                                    return;
                                                }
                                                setRatingModalVisible(true);
                                            }}
                                            className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                                        >
                                            <Feather name="star" size={20} color="#000" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Main Info Card - Slightly overlapping cover */}
                        <View className="px-6 -mt-8">
                            <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1 mr-4">
                                        <Text className="text-3xl font-bold text-neutral-900 mb-2">{business.name}</Text>
                                        <View className="flex-row items-center mb-1">
                                            <Feather name="map-pin" size={16} color="#737373" />
                                            <Text className="text-neutral-600 ml-1 text-base">
                                                {business.address}, {business.city}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Feather name="star" size={18} color="#F59E0B" fill="#F59E0B" />
                                            <Text className="font-bold ml-1 text-base text-neutral-900">{business.rating?.toFixed(1) || 'New'}</Text>
                                            <Text className="text-neutral-500 ml-1 text-base">({business.review_count || 0} reviews)</Text>
                                        </View>
                                    </View>

                                    {/* Desktop: Book Button & Logo */}
                                    <View className="items-end">
                                        {!!business.logo_url && !isLargeScreen && (
                                            <Image
                                                source={{ uri: business.logo_url }}
                                                className="w-16 h-16 rounded-full border-2 border-white shadow-sm mb-4"
                                            />
                                        )}
                                        {!!business.logo_url && isLargeScreen && !router.canGoBack() && (
                                            <Image
                                                source={{ uri: business.logo_url }}
                                                className="w-16 h-16 rounded-full border-2 border-white shadow-sm mb-4"
                                            />
                                        )}

                                        {isLargeScreen && (
                                            <TouchableOpacity
                                                onPress={() => router.push(`/booking/${id}`)}
                                                className="bg-black px-6 py-3 rounded-xl shadow-md active:opacity-90"
                                            >
                                                <Text className="text-white font-bold text-base">Book an Appointment</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {/* Description */}
                                {!!business.description && (
                                    <Text className="mt-4 text-neutral-600 text-base leading-6" numberOfLines={3}>
                                        {business.description}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Portfolio Carousel */}
                        {portfolio.length > 0 && (
                            <View className="mt-8">
                                <View className="px-6 flex-row justify-between items-center mb-4">
                                    <Text className="text-xl font-bold text-neutral-900">Portfolio</Text>
                                    <TouchableOpacity>
                                        <Text className="text-neutral-500 font-medium text-base">See all</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
                                    {[...portfolio].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)).map((item) => (
                                        <TouchableOpacity key={item.id} className="rounded-xl overflow-hidden shadow-sm">
                                            <Image
                                                source={{ uri: item.image_url }}
                                                className="w-64 h-40 bg-neutral-100"
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Services */}
                        <View className="mt-8 px-6">
                            <Text className="text-xl font-bold text-neutral-900 mb-4">Services</Text>
                            <View className={isLargeScreen ? "flex-row flex-wrap -mx-2" : "gap-y-4"}>
                                {services.map((service) => (
                                    <View key={service.id} className={isLargeScreen ? "w-1/2 p-2" : ""}>
                                        <View className="flex-row justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                            <View className="flex-1 mr-4">
                                                <Text className="font-semibold text-neutral-900 text-lg">{service.name}</Text>
                                                <Text className="text-neutral-500 text-base mt-1">{service.duration_minutes} min</Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="font-bold text-neutral-900 text-lg">${service.price}</Text>
                                                <TouchableOpacity
                                                    onPress={() => router.push(`/booking/${id}?serviceId=${service.id}`)}
                                                    className="mt-2 bg-black px-4 py-2 rounded-lg"
                                                >
                                                    <Text className="text-white text-sm font-bold">Book</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                                {services.length === 0 && (
                                    <Text className="text-neutral-500 italic">No services listed yet.</Text>
                                )}
                            </View>
                        </View>

                        {/* Team Grid */}
                        <View className="mt-8 px-6">
                            <Text className="text-xl font-bold text-neutral-900 mb-4">Meet the Team</Text>
                            <View className={`flex-row flex-wrap ${isLargeScreen ? 'gap-8' : '-mx-2'}`}>
                                {team.map((member) => (
                                    <TouchableOpacity
                                        key={member.id}
                                        className={`${isLargeScreen ? 'w-auto items-start' : 'w-1/3 px-2 mb-4 items-center'}`}
                                    >
                                        <View className="w-24 h-24 rounded-full bg-neutral-100 mb-3 overflow-hidden shadow-sm border border-neutral-100">
                                            {member.image_url ? (
                                                <Image source={{ uri: member.image_url }} className="w-full h-full" />
                                            ) : (
                                                <View className="w-full h-full items-center justify-center bg-neutral-200">
                                                    <Feather name="user" size={32} color="#a3a3a3" />
                                                </View>
                                            )}
                                        </View>
                                        <Text className={`font-medium text-base ${isLargeScreen ? 'text-left' : 'text-center'}`} numberOfLines={1}>
                                            {member.name}
                                        </Text>
                                        <Text className={`text-sm text-neutral-500 ${isLargeScreen ? 'text-left' : 'text-center'}`} numberOfLines={1}>
                                            Stylist
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {team.length === 0 && (
                                    <Text className="text-neutral-500 italic">No team members listed yet.</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Bottom Action Bar - Mobile Only */}
            {!isLargeScreen && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 shadow-lg">
                    <View className="w-full items-center">
                        <View style={{ width: '100%', maxWidth: 1200, padding: 24, paddingBottom: 32 }}>
                            <TouchableOpacity
                                onPress={() => router.push(`/booking/${id}`)}
                                className="w-full bg-black py-4 rounded-xl items-center shadow-md active:opacity-90"
                            >
                                <Text className="text-white font-bold text-lg">Book an Appointment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            {/* Rating Modal */}
            <Modal
                visible={ratingModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRatingModalVisible(false)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View className="bg-white w-full max-w-sm rounded-3xl p-8 items-center">
                        <Text className="text-2xl font-bold text-neutral-900 mb-2">Rate {business.name}</Text>
                        <Text className="text-neutral-500 text-center mb-8">How was your experience with this business?</Text>
                        
                        <View className="flex-row gap-3 mb-10">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity 
                                    key={star} 
                                    onPress={() => setSelectedRating(star)}
                                    className="p-1"
                                >
                                    <Ionicons 
                                        name={star <= selectedRating ? "star" : "star-outline"} 
                                        size={40} 
                                        color={star <= selectedRating ? "#F59E0B" : "#D4D4D4"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="w-full space-y-3">
                            <TouchableOpacity 
                                onPress={async () => {
                                    if (selectedRating === 0) return;
                                    setRatingLoading(true);
                                    try {
                                        await runTransaction(db, async (transaction) => {
                                            const bizRef = doc(db, 'businesses', id as string);
                                            const ratingRef = doc(db, 'ratings', `${user?.uid}_${id}`);
                                            
                                            const bizDoc = await transaction.get(bizRef);
                                            const ratingDoc = await transaction.get(ratingRef);

                                            if (!bizDoc.exists()) throw new Error('Business not found');

                                            const bizData = bizDoc.data();
                                            const oldAvg = bizData.rating || 0;
                                            const oldCount = bizData.review_count || 0;
                                            const newRatingValue = selectedRating;

                                            let newAvg;
                                            let newCount;

                                            if (ratingDoc.exists()) {
                                                const oldRatingValue = ratingDoc.data().rating;
                                                newCount = oldCount;
                                                newAvg = (oldAvg * oldCount - oldRatingValue + newRatingValue) / oldCount;
                                            } else {
                                                newCount = oldCount + 1;
                                                newAvg = (oldAvg * oldCount + newRatingValue) / newCount;
                                            }

                                            transaction.set(ratingRef, {
                                                user_id: user?.uid,
                                                business_id: id,
                                                rating: newRatingValue,
                                                updated_at: new Date().toISOString()
                                            });

                                            transaction.update(bizRef, {
                                                rating: newAvg,
                                                review_count: newCount
                                            });
                                            
                                            // Update local state
                                            setBusiness(prev => prev ? { ...prev, rating: newAvg, review_count: newCount } : null);
                                            setUserRating(newRatingValue);
                                        });

                                        setRatingModalVisible(false);
                                        setSelectedRating(0);
                                    } catch (e) {
                                        console.error('Rating error:', e);
                                        showAlert({
                                            title: 'Error',
                                            message: 'Failed to save rating. Please try again.',
                                            type: 'error',
                                            onConfirm: () => setShowAlertModal(false)
                                        });
                                    } finally {
                                        setRatingLoading(false);
                                    }
                                }}
                                disabled={selectedRating === 0 || ratingLoading}
                                className={`w-full py-4 rounded-xl items-center ${selectedRating === 0 ? 'bg-neutral-200' : 'bg-black'}`}
                            >
                                <Text className="text-white font-bold text-lg">
                                    {ratingLoading ? 'Submitting...' : (userRating ? 'Update Rating' : 'Submit Rating')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => setRatingModalVisible(false)}
                                className="w-full py-4 items-center"
                            >
                                <Text className="text-neutral-500 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <AlertModal
                visible={showAlertModal}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                confirmLabel={alertConfig.confirmLabel}
                onConfirm={alertConfig.onConfirm || (() => setShowAlertModal(false))}
                cancelLabel={alertConfig.cancelLabel}
                onCancel={alertConfig.onCancel}
            />
        </SafeAreaView>
    );
}
