import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { findNodeHandle, Platform, ScrollView, Text, TouchableOpacity, useWindowDimensions, View, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { Button } from '../components/Button';
import { DatePicker } from '../components/DatePicker';
import { Header } from '../components/Header';
import { StylistCard } from '../components/StylistCard';

import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { fetchLocationSuggestions, fetchServiceSuggestions } from '../lib/search';
import { collection, collectionGroup, doc, getDocs, getDoc, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';


// Match DB Schema
interface Business {
    id: string;
    name: string;
    city: string; // Using city as location
    rating: number;
    review_count: number;
    cover_image_url: string; // Using cover image for card
    is_featured: boolean;
}

export default function LandingPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user, isLoading } = useAuth();
    const isLargeScreen = width > 768;
    const [location, setLocation] = useState('');
    const [service, setService] = useState('');
    const [date, setDate] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    // Autocomplete state
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [serviceSuggestions, setServiceSuggestions] = useState<string[]>([]);
    const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
    const [loadingServiceSuggestions, setLoadingServiceSuggestions] = useState(false);

    // Track when selections are made to prevent re-fetch
    const locationSelectionMade = useRef(false);
    const serviceSelectionMade = useRef(false);

    // Scroll Logic Refs
    const scrollViewRef = useRef<ScrollView>(null);
    const searchCardRef = useRef<View>(null);

    // Featured Businesses State
    const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

    const [lastCheckedUserId, setLastCheckedUserId] = useState<string | null>(null);

    // Animation value for blinking/popping the service field
    const serviceBlinkAnim = useRef(new Animated.Value(0)).current;

    const triggerServiceBlink = () => {
        serviceBlinkAnim.setValue(0);
        Animated.sequence([
            Animated.timing(serviceBlinkAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(serviceBlinkAnim, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            })
        ]).start();
    };

    // Fetch Featured Businesses
    useEffect(() => {
        async function fetchFeatured() {
            try {
                const q = query(
                    collection(db, 'businesses'),
                    where('is_featured', '==', true),
                    limit(4)
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
                setFeaturedBusinesses(data);
            } catch (err) {
                console.error('Unexpected error fetching featured:', err);
            } finally {
                setIsLoadingFeatured(false);
            }
        }

        fetchFeatured();
    }, []);

    // Debounced autocomplete for location
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Skip if a selection was just made
            if (locationSelectionMade.current) {
                locationSelectionMade.current = false;
                return;
            }

            if (location.trim().length > 0) {
                setLoadingLocationSuggestions(true);
                const suggestions = await fetchLocationSuggestions(location);
                setLocationSuggestions(suggestions);
                setLoadingLocationSuggestions(false);
            } else {
                setLocationSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [location]);

    // Debounced autocomplete for service
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Skip if a selection was just made
            if (serviceSelectionMade.current) {
                serviceSelectionMade.current = false;
                return;
            }

            if (service.trim().length > 0) {
                setLoadingServiceSuggestions(true);
                const suggestions = await fetchServiceSuggestions(service);
                setServiceSuggestions(suggestions);
                setLoadingServiceSuggestions(false);
            } else {
                setServiceSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [service]);

    // Redirect authenticated users to their dashboard
    const params = useLocalSearchParams();

    useEffect(() => {
        async function handleAuthRedirect() {
            // Prevent redundant checks if we are already processing or redirecting
            if (user && !isChecking && !redirecting && user.uid !== lastCheckedUserId) {
                setIsChecking(true);
                setRedirecting(true);
                setLastCheckedUserId(user.uid);

                try {
                    // 1. Check for pending auth redirect (from Sign In flow)
                    const savedReturnTo = await AsyncStorage.getItem('auth_return_url');
                    
                    // Fetch user type to make smart decisions
                    let userType: string | null = null;
                    try {
                        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
                        userType = profileSnap.data()?.user_type ?? null;
                    } catch (e) {
                        console.error('[Landing] Error reading profile:', e);
                    }

                    if (savedReturnTo) {
                        await AsyncStorage.removeItem('auth_return_url');
                        
                        const defaultDest = userType === 'business_owner' ? '/business/dashboard' :
                                           userType === 'stylist' ? '/stylist/dashboard' :
                                           '/bookings';

                        // Only respect savedReturnTo if it's a specific deep link
                        if (savedReturnTo !== '/' && savedReturnTo !== '/profile' && !savedReturnTo.startsWith('/profile?')) {
                            try {
                                router.replace(savedReturnTo as any);
                            } catch (e) {
                                router.replace(defaultDest);
                            }
                        } else {
                            router.replace(defaultDest);
                        }
                        return;
                    }

                    // 2. Check if this is a pending business signup
                    const pendingBusinessSignup = await AsyncStorage.getItem('pending_business_signup');
                    if (pendingBusinessSignup === 'true') {
                        // Preliminary Check: Does this user ALREADY have a business?
                        const bizQ = query(collection(db, 'businesses'), where('owner_id', '==', user.uid));
                        const bizSnap = await getDocs(bizQ);

                        if (!bizSnap.empty) {
                            await AsyncStorage.removeItem('pending_business_signup');
                            router.replace('/business/dashboard?warning=duplicate_business');
                            return;
                        }

                        // Update Firestore profile to business type
                        await setDoc(doc(db, 'profiles', user.uid), { user_type: 'business_owner' }, { merge: true });
                        await AsyncStorage.removeItem('pending_business_signup');
                        router.replace('/business/onboarding');
                        return;
                    }

                    // No default redirect here! 
                    // This allows logged-in business owners/staff to browse the search page.
                    // Redirection to dashboards is handled by the initial sign-in logic in sign-in.tsx.
                } catch (e) {
                    console.error('[Landing] Auth redirect error:', e);
                } finally {
                    setIsChecking(false);
                    setRedirecting(false);
                }
            } else if (!user && lastCheckedUserId) {
                // User logged out, reset check
                setLastCheckedUserId(null);
            }
        }

        if (!isLoading) {
            handleAuthRedirect();
        }
    }, [user, isLoading, params, lastCheckedUserId, isChecking, redirecting]);

    // Show loading screen while checking auth or redirecting
    if (isLoading || redirecting) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <Text className="text-lg">Loading...</Text>
            </View>
        );
    }

    // Always use database data for featured businesses
    const displayStylists = featuredBusinesses.map(b => ({
        id: b.id,
        name: b.name,
        location: b.city,
        rating: b.rating || 0,
        reviewCount: b.review_count || 0,
        imageUrl: b.cover_image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2574&auto=format&fit=crop',
    }));

    return (
        <View className="flex-1">
            <LinearGradient
                colors={['#ffffff', '#f3f4f6', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.5, 1]}
                className="flex-1"
            >
                <SafeAreaView className="flex-1">
                    <Header />

                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Hero Section */}
                        <View className="items-center justify-center px-6 py-16 md:py-24" style={{ zIndex: 20 }}>
                            <View style={{ maxWidth: 1000, width: '100%', overflow: 'visible' }}>
                                {/* Headline */}
                                <View className="items-center mb-12">
                                    <Text className={`font-bold text-center mb-4 ${isLargeScreen ? 'text-5xl' : 'text-4xl'} `}>
                                        Book your next hair appointment
                                    </Text>
                                    <Text className={`text-neutral-600 text-center ${isLargeScreen ? 'text-xl' : 'text-lg'} `}>
                                        Find and book top-rated hair stylists near you
                                    </Text>
                                </View>

                                {/* Search Card - Horizontal on large screens, vertical on mobile */}
                                <View
                                    ref={searchCardRef}
                                    className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6"
                                    style={{ overflow: 'visible', zIndex: 100 }}
                                >
                                    <View className={isLargeScreen ? 'flex-row gap-3' : 'space-y-3'} style={{ overflow: 'visible' }}>
                                        {/* Location Input */}
                                        <View
                                            className={isLargeScreen ? 'flex-1' : 'w-full'}
                                            style={{ zIndex: 30 }}
                                        >
                                            <AutocompleteInput
                                                placeholder="Location"
                                                value={location}
                                                onChangeText={setLocation}
                                                suggestions={locationSuggestions}
                                                onSuggestionSelect={(value) => {
                                                    locationSelectionMade.current = true;
                                                    setLocation(value);
                                                    setLocationSuggestions([]);
                                                }}
                                                icon="map-pin"
                                                loading={loadingLocationSuggestions}
                                            />
                                        </View>

                                        {/* Service Input */}
                                        <Animated.View 
                                            className={isLargeScreen ? 'flex-1' : 'w-full'} 
                                            style={{ 
                                                zIndex: 20,
                                                transform: [{
                                                    scale: serviceBlinkAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [1, 1.03]
                                                    })
                                                }]
                                            }}
                                        >
                                            <AutocompleteInput
                                                placeholder="Service"
                                                value={service}
                                                onChangeText={setService}
                                                suggestions={serviceSuggestions}
                                                onSuggestionSelect={(value) => {
                                                    serviceSelectionMade.current = true;
                                                    setService(value);
                                                    setServiceSuggestions([]);
                                                }}
                                                icon="scissors"
                                                loading={loadingServiceSuggestions}
                                            />
                                        </Animated.View>

                                        {/* Date Input */}
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'} style={{ zIndex: 10 }}>
                                            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200">
                                                <Feather name="calendar" size={20} color="#737373" />
                                                <DatePicker
                                                    placeholder="Date"
                                                    value={date}
                                                    onChange={setDate}
                                                    className="flex-1 h-14 px-3 text-base"
                                                />
                                            </View>
                                        </View>

                                        {/* Search Button */}
                                        <View className={isLargeScreen ? '' : 'w-full mt-1'}>
                                            <Button
                                                label="Search"
                                                variant="primary"
                                                size="md"
                                                onPress={() => {
                                                    router.push({
                                                        pathname: '/search',
                                                        params: { location, service, date }
                                                    });
                                                }}
                                                className={isLargeScreen ? '' : 'w-full'}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Popular Services */}
                                <View className="mt-12" style={{ zIndex: 0, position: 'relative' }}>
                                    <Text className="text-lg font-semibold mb-4 text-center">Popular Services</Text>
                                    <View className="flex-row flex-wrap justify-center gap-3">
                                        {['Haircut', 'Color', 'Balayage', 'Blowout', 'Extensions', 'Styling'].map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                className="bg-white/80 px-5 py-2.5 rounded-full border border-neutral-100"
                                                onPress={() => {
                                                    serviceSelectionMade.current = true;
                                                    setService(item);
                                                    triggerServiceBlink();
                                                    // Auto-scroll to Search Card ONLY if out of view
                                                    if (searchCardRef.current) {
                                                        if (Platform.OS === 'web') {
                                                            const rect = (searchCardRef.current as any).getBoundingClientRect();
                                                            // If top edge is effectively out of view (or very close to edge)
                                                            if (rect.top < 10) {
                                                                (searchCardRef.current as any).scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }
                                                        } else if (scrollViewRef.current) {
                                                            searchCardRef.current.measureInWindow((x, y, width, height) => {
                                                                // If top edge is scrolled off top (y < determined offset, e.g. 10)
                                                                if (y < 10) {
                                                                    const scrollNode = findNodeHandle(scrollViewRef.current);
                                                                    if (scrollNode) {
                                                                        searchCardRef.current?.measureLayout(
                                                                            scrollNode,
                                                                            (lx, ly) => {
                                                                                scrollViewRef.current?.scrollTo({ y: Math.max(0, ly - 10), animated: true });
                                                                            },
                                                                            () => { }
                                                                        );
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }
                                                }}
                                            >
                                                <Text className="text-neutral-700 font-medium">{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Featured Stylists Section */}
                        <View className="px-6 py-12 bg-white/50" style={{ zIndex: 0 }}>
                            <View style={{ maxWidth: 1200, width: '100%', marginHorizontal: 'auto' }}>
                                <View className="mb-8">
                                    <Text className={`font-bold text-center mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'} `}>
                                        Featured Stylists
                                    </Text>
                                    <Text className="text-neutral-600 text-center text-base">
                                        Discover top-rated professionals in your area
                                    </Text>
                                </View>

                                {/* Stylist Grid */}
                                <View className={`${isLargeScreen ? 'flex-row flex-wrap -mx-3' : 'space-y-4'} `}>
                                    {displayStylists.map((stylist) => (
                                        <View
                                            key={stylist.id}
                                            className={isLargeScreen ? 'w-1/2 lg:w-1/4 px-3 mb-6' : 'w-full'}
                                        >
                                            <StylistCard
                                                name={stylist.name}
                                                location={stylist.location}
                                                rating={stylist.rating}
                                                reviewCount={stylist.reviewCount}
                                                imageUrl={stylist.imageUrl}
                                                onPress={() => router.push(`/business/${stylist.id}`)}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}
