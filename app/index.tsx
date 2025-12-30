import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { StylistCard } from '../components/StylistCard';

import { useAuth } from '../lib/auth';
import { fetchLocationSuggestions, fetchServiceSuggestions } from '../lib/search';
import { supabase } from '../lib/supabase';


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

    // Featured Businesses State
    const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

    const [lastCheckedUserId, setLastCheckedUserId] = useState<string | null>(null);

    // Fetch Featured Businesses
    useEffect(() => {
        async function fetchFeatured() {
            try {
                const { data, error } = await supabase
                    .from('businesses')
                    .select('id, name, city, rating, review_count, cover_image_url, is_featured')
                    .eq('is_featured', true)
                    .limit(4);

                if (error) {
                    console.error('Error fetching featured businesses:', error);
                } else if (data) {
                    setFeaturedBusinesses(data);
                }
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
            // Check for explicit no-redirect flag (from URL)
            // If they clicked "Stilo" (Home) or explicitly went to /?noredirect=true, stay here.
            if (params.noredirect === 'true') {
                console.log('[Landing] No-redirect flag present. Skipping auth redirect.');
                return;
            }

            // Prevent redundant checks if we are already processing or redirecting
            if (user && !isChecking && !redirecting && user.id !== lastCheckedUserId) {
                console.log('[Landing] User detected:', user.id);
                setIsChecking(true);
                setRedirecting(true); // Optimistically show loading immediately
                setLastCheckedUserId(user.id);

                try {
                    // Check for pending auth redirect (from Sign In flow)
                    const savedReturnTo = await AsyncStorage.getItem('auth_return_url');
                    if (savedReturnTo) {
                        console.log('[Landing] Found saved return URL, redirecting:', savedReturnTo);
                        await AsyncStorage.removeItem('auth_return_url');
                        router.replace(savedReturnTo as any);
                        return;
                    }

                    let userType = user.user_metadata?.user_type;
                    const pendingBusinessSignup = await AsyncStorage.getItem('pending_business_signup');

                    // 1. Check if this is a pending business signup (User clicked "Continue" on Business Page)
                    if (pendingBusinessSignup === 'true') {
                        console.log('[Landing] Found pending business signup flag. Checking restrictions...');

                        // Preliminary Check: Does this user ALREADY have a business?
                        // If so, we PREVENT them from trying to create another one or overwriting.
                        const { count: existingCount } = await supabase
                            .from('businesses')
                            .select('*', { count: 'exact', head: true })
                            .eq('owner_id', user.id);

                        if (existingCount && existingCount > 0) {
                            console.log('[Landing] User already has a business. Preventing duplicate creation.');

                            // Clear flag so we don't loop
                            await AsyncStorage.removeItem('pending_business_signup');

                            // Show Message via banner on dashboard
                            // Redirect to Dashboard (Treat as Sign In) with warning param
                            router.replace('/business/dashboard?warning=duplicate_business');
                            return;
                        }

                        console.log('[Landing] No existing business. Converting user...');

                        // A. Update Auth Metadata
                        const { error: authError } = await supabase.auth.updateUser({
                            data: { user_type: 'business' }
                        });

                        // B. Update Public Profile (Fixes "Client" persistence issue)
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .update({ user_type: 'business' })
                            .eq('id', user.id);

                        if (!authError && !profileError) {
                            console.log('[Landing] Conversion success. Redirecting to Onboarding.');
                            userType = 'business';

                            // Clear the signup flag but keep the name for Onboarding to read
                            await AsyncStorage.removeItem('pending_business_signup');

                            router.replace('/business/onboarding');
                            return;
                        } else {
                            console.error('[Landing] Conversion failed:', authError || profileError);
                            // If failed, we might want to let them fall through or retry?
                            // For now, let's proceed to standard checks.
                        }
                    }

                    // 2. Default User Type Logic if not set (Regular Sign In)
                    if (!userType) {
                        console.log('[Landing] User type not set. Defaulting to customer.');
                        await supabase.auth.updateUser({
                            data: { user_type: 'customer' }
                        });
                        userType = 'customer';
                    }

                    // 3. Routing Logic
                    if (userType === 'business') {
                        // Critical Check: Does the business actually exist?
                        console.log('[Landing] Checking for existing business profile...');
                        const { count } = await supabase
                            .from('businesses')
                            .select('*', { count: 'exact', head: true })
                            .eq('owner_id', user.id);

                        if (count && count > 0) {
                            console.log('[Landing] Business found. Going to Dashboard.');
                            router.replace('/business/dashboard');
                        } else {
                            console.log('[Landing] No business found. Going to Onboarding.');
                            router.replace('/business/onboarding');
                        }
                    } else {
                        // Customer - Stay on Landing Page (do nothing)
                        console.log('[Landing] Customer detected. Staying on landing page.');
                        setIsChecking(false);
                        setRedirecting(false);
                    }
                } catch (error) {
                    console.error('[Landing] Error in auth redirect:', error);
                    setIsChecking(false);
                    setRedirecting(false);
                    // allow retry on error
                    setLastCheckedUserId(null);
                }
            } else if (!user && lastCheckedUserId) {
                // User logged out, reset check
                setLastCheckedUserId(null);
            }
        }

        if (!isLoading) {
            handleAuthRedirect();
        }
    }, [user, isLoading, router, lastCheckedUserId, isChecking, redirecting, params]);

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
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Hero Section */}
                        <View className="items-center justify-center px-6 py-16 md:py-24">
                            <View style={{ maxWidth: 1000, width: '100%', overflow: 'visible' }}>
                                {/* Headline */}
                                <View className="items-center mb-12">
                                    <Text className={`font - bold text - center mb - 4 ${isLargeScreen ? 'text-5xl' : 'text-4xl'} `}>
                                        Book your next hair appointment
                                    </Text>
                                    <Text className={`text - neutral - 600 text - center ${isLargeScreen ? 'text-xl' : 'text-lg'} `}>
                                        Find and book top-rated hair stylists near you
                                    </Text>
                                </View>

                                {/* Search Card - Horizontal on large screens, vertical on mobile */}
                                <View className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6" style={{ overflow: 'visible', zIndex: 100 }}>
                                    <View className={isLargeScreen ? 'flex-row gap-3' : 'space-y-3'} style={{ overflow: 'visible' }}>
                                        {/* Location Input */}
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'} style={{ zIndex: 30 }}>
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
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'} style={{ zIndex: 20 }}>
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
                                        </View>

                                        {/* Date Input */}
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'} style={{ zIndex: 10 }}>
                                            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200">
                                                <Feather name="calendar" size={20} color="#737373" />
                                                <TextInput
                                                    placeholder="Date & Time"
                                                    value={date}
                                                    onChangeText={setDate}
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
                                <View className="mt-12">
                                    <Text className="text-lg font-semibold mb-4 text-center">Popular Services</Text>
                                    <View className="flex-row flex-wrap justify-center gap-3">
                                        {['Haircut', 'Color', 'Balayage', 'Blowout', 'Extensions', 'Styling'].map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                className="bg-white/80 px-5 py-2.5 rounded-full border border-neutral-100"
                                                onPress={() => {
                                                    serviceSelectionMade.current = true;
                                                    setService(item);
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
                        <View className="px-6 py-12 bg-white/50">
                            <View style={{ maxWidth: 1200, width: '100%', marginHorizontal: 'auto' }}>
                                <View className="mb-8">
                                    <Text className={`font - bold text - center mb - 2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'} `}>
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
