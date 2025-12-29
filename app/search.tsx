import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { StylistCard } from '../components/StylistCard';
import { supabase } from '../lib/supabase';

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

    const [results, setResults] = useState<BusinessResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Results from DB
    useEffect(() => {
        async function fetchResults() {
            setLoading(true);
            try {
                // Base query
                let query = supabase
                    .from('businesses')
                    .select('id, name, city, rating, review_count, cover_image_url');

                // Filter by Location (City)
                if (location) {
                    // ILIKE is case-insensitive pattern matching
                    query = query.ilike('city', `%${location}%`);
                }

                // Filter by Service (Currently checking Name/Description as proxy, 
                // typically needs a join on services table, but keeping simple for MVP)
                if (service) {
                    query = query.or(`name.ilike.%${service}%,description.ilike.%${service}%`);
                }

                // Date filtering is usually availability-based, which requires a complex availability system.
                // We'll skip DB filtering for date in this step.

                const { data, error } = await query;

                if (error) {
                    console.error('Error fetching search results:', error);
                } else if (data) {
                    setResults(data);
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        }

        // Debounce could be added here, but for now fetch on change or mount
        // Actually, let's fetch on mount or when modal closes/Apply is clicked to avoid spamming
        // For this demo, we'll fetch when the component mounts or params change (from landing page)
        // To make it responsive to the inputs, we might want a "Search" button or debounce. 
        // Let's stick to valid params for initial load.
        fetchResults();

    }, [location, service]); // Re-fetch when filters change (simple live search)

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top']}>
                <Header />

                {/* Filter Bar */}
                <View className="bg-white pt-2 border-b border-neutral-100 pb-2">
                    <View className="max-w-7xl mx-auto w-full px-4 md:px-0">
                        {isLargeScreen ? (
                            /* Desktop: Horizontal Row */
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{
                                    flexGrow: 1,
                                    justifyContent: 'center',
                                    paddingHorizontal: 24,
                                    paddingVertical: 12,
                                    gap: 12
                                }}
                            >
                                <View className="flex-row items-center bg-neutral-50 rounded-full border border-neutral-200 px-4 py-2">
                                    <Feather name="map-pin" size={16} className="text-neutral-500" color="#737373" />
                                    <TextInput
                                        placeholder="Location"
                                        value={location}
                                        onChangeText={setLocation}
                                        className="ml-2 h-6 text-neutral-900 min-w-[100px] text-base"
                                        placeholderTextColor="#a3a3a3"
                                    />
                                </View>
                                <View className="flex-row items-center bg-neutral-50 rounded-full border border-neutral-200 px-4 py-2">
                                    <Feather name="scissors" size={16} className="text-neutral-500" color="#737373" />
                                    <TextInput
                                        placeholder="Service"
                                        value={service}
                                        onChangeText={setService}
                                        className="ml-2 h-6 text-neutral-900 min-w-[100px] text-base"
                                        placeholderTextColor="#a3a3a3"
                                    />
                                </View>
                                <View className="flex-row items-center bg-neutral-50 rounded-full border border-neutral-200 px-4 py-2">
                                    <Feather name="calendar" size={16} className="text-neutral-500" color="#737373" />
                                    <TextInput
                                        placeholder="Date"
                                        value={date}
                                        onChangeText={setDate}
                                        className="ml-2 h-6 text-neutral-900 min-w-[100px] text-base"
                                        placeholderTextColor="#a3a3a3"
                                    />
                                </View>
                            </ScrollView>
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
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    <View className="max-w-7xl mx-auto w-full px-6 py-8">
                        <Text className="text-xl font-bold mb-6 text-neutral-900">
                            {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
                        </Text>

                        {loading ? (
                            <View className="items-center justify-center py-20">
                                <ActivityIndicator size="large" color="#000" />
                            </View>
                        ) : results.length > 0 ? (
                            <View className="flex-row flex-wrap -mx-3">
                                {results.map((item) => (
                                    <View
                                        key={item.id}
                                        className="w-full md:w-1/2 lg:w-1/4 px-3 mb-6"
                                    >
                                        <StylistCard
                                            name={item.name}
                                            location={item.city || 'Unknown'} // DB uses city, fallback
                                            rating={item.rating || 0}
                                            reviewCount={item.review_count || 0}
                                            imageUrl={item.cover_image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2574&auto=format&fit=crop'}
                                            onPress={() => router.push(`/business/${item.id}`)}
                                        />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View className="items-center justify-center py-20">
                                <Feather name="search" size={48} color="#e5e5e5" />
                                <Text className="text-neutral-500 mt-4 text-center text-lg">
                                    No businesses found matching your search.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => { setLocation(''); setService(''); setDate(''); }}
                                    className="mt-4"
                                >
                                    <Text className="text-black font-medium border-b border-black">Clear Filters</Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
                        <View className="px-6 py-4 flex-row items-center justify-between border-b border-neutral-100">
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                                <Feather name="x" size={24} color="#000" />
                            </TouchableOpacity>
                            <Text className="font-bold text-lg">Filters</Text>
                            <TouchableOpacity onPress={() => { setLocation(''); setService(''); setDate(''); }}>
                                <Text className="text-neutral-500 font-medium underline">Clear</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 p-6">
                            <View className="space-y-6">
                                {/* Location */}
                                <View>
                                    <Text className="font-semibold text-lg mb-3">Where to?</Text>
                                    <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-4">
                                        <Feather name="map-pin" size={20} color="#737373" />
                                        <TextInput
                                            placeholder="City, zip code, or neighborhood"
                                            placeholderTextColor="#a3a3a3"
                                            value={location}
                                            onChangeText={setLocation}
                                            className="ml-3 flex-1 text-lg text-neutral-900"
                                            autoFocus
                                        />
                                    </View>
                                </View>

                                {/* Service */}
                                <View>
                                    <Text className="font-semibold text-lg mb-3">Service</Text>
                                    <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-4">
                                        <Feather name="scissors" size={20} color="#737373" />
                                        <TextInput
                                            placeholder="Haircut, Color, Styling..."
                                            placeholderTextColor="#a3a3a3"
                                            value={service}
                                            onChangeText={setService}
                                            className="ml-3 flex-1 text-lg text-neutral-900"
                                        />
                                    </View>
                                </View>

                                {/* Date */}
                                <View>
                                    <Text className="font-semibold text-lg mb-3">When?</Text>
                                    <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-4">
                                        <Feather name="calendar" size={20} color="#737373" />
                                        <TextInput
                                            placeholder="Add dates"
                                            placeholderTextColor="#a3a3a3"
                                            value={date}
                                            onChangeText={setDate}
                                            className="ml-3 flex-1 text-lg text-neutral-900"
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View className="p-6 border-t border-neutral-100">
                            <TouchableOpacity
                                onPress={() => setIsFilterModalVisible(false)}
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
