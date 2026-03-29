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
import { collection, collectionGroup, getDocs, limit as fLimit, query, where } from 'firebase/firestore';

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
        const searchLocation = (overrideLocation ?? location).toLowerCase();
        const searchService = (overrideService ?? service).toLowerCase();

        try {
            let businessIdsFromService: string[] | null = null;

            // 1. If service string is provided, find matching business IDs via substring
            if (searchService) {
                // Fetch a large sample of services (in a real app, use Algolia for substring search)
                const serviceSnap = await getDocs(query(collectionGroup(db, 'services'), fLimit(500)));
                const matchingBizIds = new Set<string>();
                
                serviceSnap.docs.forEach(d => {
                    const sData = d.data();
                    const sName = (sData.name || '').toLowerCase();
                    const sCat = (sData.category || '').toLowerCase();
                    
                    if (sName.includes(searchService) || sCat.includes(searchService)) {
                        matchingBizIds.add(d.ref.parent.parent!.id);
                    }
                });
                
                businessIdsFromService = Array.from(matchingBizIds);
                if (businessIdsFromService.length === 0) {
                    setResults([]);
                    setLoading(false);
                    return;
                }
            }

            // 2. Fetch businesses and filter by Location (substring) and Business IDs (from service match)
            // Limit to a reasonable number for client-side filtering
            const businessesSnap = await getDocs(query(collection(db, 'businesses'), fLimit(200)));
            let filteredResults = businessesSnap.docs.map(d => ({
                id: d.id,
                ...(d.data() as Omit<BusinessResult, 'id'>)
            }));

            // Filter by Location Substring (City)
            if (searchLocation) {
                filteredResults = filteredResults.filter(b => 
                    (b.city || '').toLowerCase().includes(searchLocation)
                );
            }

            // Filter by Business IDs (those offering the selected/searched service)
            if (businessIdsFromService !== null) {
                filteredResults = filteredResults.filter(b => businessIdsFromService!.includes(b.id));
            }

            setResults(filteredResults);
        } catch (err: any) {
            console.error('Search error:', err);
            alert(`Search Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1">
                <Header showBack={true} />

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
                                        suggestionLabel="City in results"
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
                                        suggestionLabel="Found in services"
                                    />
                                </View>
                                <View className="flex-1 max-w-[200px]" style={{ zIndex: 10 }}>
                                    <DatePicker
                                        placeholder="Date"
                                        value={date}
                                        onChange={setDate}
                                        onSubmitEditing={() => fetchResults()}
                                        returnKeyType="search"
                                        icon="calendar"
                                    />
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
                                className="flex-row items-center bg-white border border-neutral-200 rounded-full shadow-sm px-4 py-4 my-2"
                            >
                                <Feather name="search" size={24} color="#000" />
                                <View className="ml-4 flex-1">
                                    <Text className="font-semibold text-neutral-900 text-lg" numberOfLines={1}>
                                        {location || 'Anywhere'}
                                    </Text>
                                    <Text className="text-neutral-500 text-base" numberOfLines={1}>
                                        {service || 'Any service'} • {date || 'Any week'}
                                    </Text>
                                </View>
                                <View className="bg-neutral-100 p-2.5 rounded-full border border-neutral-200">
                                    <Feather name="sliders" size={20} color="#000" />
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

                        <ScrollView 
                            className="flex-1 p-6" 
                            contentContainerStyle={{ paddingBottom: 350 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View className="gap-8 flex-col">
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
                                        suggestionLabel="City in results"
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
                                        suggestionLabel="Found in services"
                                    />
                                </View>

                                {/* Date */}
                                <View style={{ zIndex: 10 }}>
                                    <Text className="font-semibold text-lg mb-3">When?</Text>
                                    <DatePicker
                                        placeholder="Add dates"
                                        value={date}
                                        onChange={setDate}
                                        returnKeyType="done"
                                        icon="calendar"
                                    />
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
            </View>
        </SafeAreaView>
    );
}
