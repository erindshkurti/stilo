import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { DatePicker } from '../components/DatePicker';
import { Header } from '../components/Header';
import { StylistCard } from '../components/StylistCard';
import { fetchLocationSuggestions, fetchServiceSuggestions } from '../lib/search';
import { db } from '../lib/firebase';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';

interface BusinessResult {
    id: string;
    name: string;
    city: string;
    rating: number;
    review_count: number;
    cover_image_url: string | null;
}

export default function SearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;

    const [location, setLocation] = useState(params.location as string || '');
    const [service, setService] = useState(params.service as string || '');
    const [date, setDate] = useState(params.date as string || '');
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    // Suggestions State
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [serviceSuggestions, setServiceSuggestions] = useState<string[]>([]);
    const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
    const [loadingServiceSuggestions, setLoadingServiceSuggestions] = useState(false);

    // Refs to lock fetching when selection is made
    const locationSelectionMade = useRef(!!(params.location as string));
    const serviceSelectionMade = useRef(!!(params.service as string));

    const [results, setResults] = useState<BusinessResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Debounced autocomplete for location
    useEffect(() => {
        const timer = setTimeout(async () => {
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

    // Initial Fetch ONLY
    useEffect(() => {
        fetchResults();
    }, []);

    async function fetchResults(overrideLocation?: string, overrideService?: string) {
        setLoading(true);
        const searchLocation = overrideLocation ?? location;
        const searchService = overrideService ?? service;

        try {
            let businessIds: string[] | null = null;

            // If service filter is provided, find matching business IDs
            if (searchService) {
                const formattedService = searchService.charAt(0).toUpperCase() + searchService.slice(1).toLowerCase();
                const serviceSnap = await getDocs(
                    query(
                        collectionGroup(db, 'services'),
                        where('category', '>=', formattedService),
                        where('category', '<=', formattedService + '\uf8ff')
                    )
                );
                // Firestore subcollection path: businesses/{businessId}/services/{serviceId}
                businessIds = [...new Set(
                    serviceSnap.docs.map(d => d.ref.parent.parent!.id)
                )];

                if (businessIds.length === 0) {
                    setResults([]);
                    setLoading(false);
                    return;
                }
            }

            // Query businesses collection
            let constraints: any[] = [];
            if (searchLocation) {
                constraints.push(where('city', '>=', searchLocation));
                constraints.push(where('city', '<=', searchLocation + '\uf8ff'));
            }

            const businessesSnap = await getDocs(
                query(collection(db, 'businesses'), ...constraints)
            );

            let results: BusinessResult[] = businessesSnap.docs.map(d => ({
                id: d.id,
                ...(d.data() as Omit<BusinessResult, 'id'>)
            }));

            // Filter by businessIds if service was specified
            if (businessIds !== null) {
                results = results.filter(b => businessIds!.includes(b.id));
            }

            setResults(results);
        } catch (err: any) {
            console.error('Search error:', err);
            alert(`Search Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top']}>
                <Header />

                {/* Filter Bar */}
                <View className="bg-white pt-2 border-b border-neutral-100 pb-2 px-6 md:px-8" style={{ zIndex: 100 }}>
                    <View className="mx-auto w-full" style={{ maxWidth: 1200 }}>
                        {isLargeScreen ? (
                            /* Desktop: Horizontal inputs with Autocomplete */
                            <View className="flex-row items-center gap-4 py-3" style={{ zIndex: 100 }}>
                                <View className="flex-1 max-w-[280px]" style={{ zIndex: 30 }}>
                                    <AutocompleteInput
                                        placeholder="Location"
                                        value={location}
                                        onChangeText={setLocation}
                                        suggestions={locationSuggestions}
                                        onSuggestionSelect={(value) => {
                                            locationSelectionMade.current = true;
                                            setLocation(value);
                                            setLocationSuggestions([]);
                                            fetchResults(value, undefined);
                                        }}
                                        icon="map-pin"
                                        loading={loadingLocationSuggestions}
                                        onSubmitEditing={() => fetchResults()}
                                        returnKeyType="search"
                                    />
                                </View>
                                <View className="flex-1 max-w-[280px]" style={{ zIndex: 20 }}>
                                    <AutocompleteInput
                                        placeholder="Service"
                                        value={service}
                                        onChangeText={setService}
                                        suggestions={serviceSuggestions}
                                        onSuggestionSelect={(value) => {
                                            serviceSelectionMade.current = true;
                                            setService(value);
                                            setServiceSuggestions([]);
                                            fetchResults(undefined, value);
                                        }}
                                        icon="scissors"
                                        loading={loadingServiceSuggestions}
                                        onSubmitEditing={() => fetchResults()}
                                        returnKeyType="search"
                                    />
                                </View>
                                <View className="flex-1 max-w-[200px]" style={{ zIndex: 10 }}>
                                    <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200">
                                        <Feather name="calendar" size={20} color="#737373" />
                                        <DatePicker
                                            placeholder="Date"
                                            value={date}
                                            onChange={setDate}
                                            onSubmitEditing={() => fetchResults()}
                                            returnKeyType="search"
                                            className="flex-1 h-14 px-3 text-base"
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => fetchResults()}
                                    className="h-14 w-14 bg-black rounded-2xl items-center justify-center shadow-sm active:bg-neutral-800"
                                >
                                    <Feather name="search" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* Mobile: Search Bar Summary -> Opens Modal */
                            <TouchableOpacity
                                onPress={() => setIsFilterModalVisible(true)}
                                className="flex-row items-center bg-white border border-neutral-200 rounded-full shadow-sm px-4 py-3 my-2"
                            >
                                <Feather name="search" size={20} color="#000" />
                                <View className="ml-4 flex-1">
                                    <Text className="font-semibold text-neutral-900 text-sm" numberOfLines={1}>
                                        {location || 'Anywhere'}
                                    </Text>
                                    <Text className="text-neutral-500 text-xs" numberOfLines={1}>
                                        {service || 'Any service'} • {date || 'Any week'}
                                    </Text>
                                </View>
                                <View className="bg-neutral-100 p-2 rounded-full border border-neutral-200">
                                    <Feather name="sliders" size={16} color="#000" />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Results Grid */}
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} style={{ zIndex: 1 }}>
                    <View className="w-full px-6 md:px-8 py-8">
                        <View className="mx-auto w-full" style={{ maxWidth: 1200 }}>
                            {loading ? (
                                <View className="items-center justify-center py-20">
                                    <ActivityIndicator size="large" color="#000" />
                                </View>
                            ) : results.length > 0 ? (
                                <>
                                    <Text className="text-xl font-bold mb-6 text-neutral-900">
                                        {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
                                    </Text>
                                    <View className="flex-row flex-wrap -mx-3">
                                        {results.map((item) => (
                                            <View
                                                key={item.id}
                                                className={isLargeScreen ? 'w-1/3 px-3 mb-6' : 'w-full px-3 mb-6'}
                                            >
                                                <StylistCard
                                                    name={item.name}
                                                    location={item.city}
                                                    rating={item.rating || 0}
                                                    reviewCount={item.review_count || 0}
                                                    imageUrl={item.cover_image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80'}
                                                    onPress={() => router.push(`/business/${item.id}`)}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <View className="items-center justify-center py-32">
                                    <Feather name="search" size={48} color="#e5e5e5" className="mb-6" />
                                    <Text className="text-2xl font-bold text-neutral-900 mb-2">
                                        0 Results Found
                                    </Text>
                                    <Text className="text-neutral-500 text-lg text-center max-w-sm">
                                        No businesses found matching your criteria. Try adjusting your filters or searching a different area.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Mobile Filter Modal */}
                <Modal
                    visible={isFilterModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setIsFilterModalVisible(false)}
                >
                    <SafeAreaView className="flex-1 bg-white">
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100">
                            <Text className="text-xl font-bold">Filters</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                                <Feather name="x" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 p-6" keyboardShouldPersistTaps="handled">
                            <View className="space-y-6">
                                {/* Location */}
                                <View style={{ zIndex: 30 }}>
                                    <Text className="font-semibold text-lg mb-3">Where to?</Text>
                                    <AutocompleteInput
                                        placeholder="City, zip code, or neighborhood"
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
                                        returnKeyType="next"
                                    />
                                </View>

                                {/* Service */}
                                <View style={{ zIndex: 20 }}>
                                    <Text className="font-semibold text-lg mb-3">Service</Text>
                                    <AutocompleteInput
                                        placeholder="Haircut, Color, Styling..."
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
                                        returnKeyType="next"
                                    />
                                </View>

                                {/* Date */}
                                <View style={{ zIndex: 10 }}>
                                    <Text className="font-semibold text-lg mb-3">When?</Text>
                                    <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4">
                                        <Feather name="calendar" size={20} color="#737373" />
                                        <DatePicker
                                            placeholder="Add dates"
                                            value={date}
                                            onChange={setDate}
                                            returnKeyType="done"
                                            className="ml-3 flex-1 h-14 text-base text-neutral-900"
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View className="p-6 border-t border-neutral-100">
                            <TouchableOpacity
                                onPress={() => {
                                    setIsFilterModalVisible(false);
                                    fetchResults();
                                }}
                                className="bg-black py-4 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold text-lg">
                                    Show Results
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </View>
    );
}
