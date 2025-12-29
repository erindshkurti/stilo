import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

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
    avatar_url: string | null;
    specialties: string[] | null;
}

export default function BusinessPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [business, setBusiness] = useState<BusinessDetails | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [team, setTeam] = useState<Stylist[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        async function fetchData() {
            try {
                // 1. Fetch Business Details
                const { data: businessData, error: businessError } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (businessError) throw businessError;
                setBusiness(businessData);

                // 2. Fetch Portfolio
                const { data: portfolioData } = await supabase
                    .from('business_portfolio_images')
                    .select('*')
                    .eq('business_id', id)
                    .order('display_order', { ascending: true }); // Assuming display_order exists, else created_at

                if (portfolioData) setPortfolio(portfolioData);

                // 3. Fetch Services
                const { data: servicesData } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', id)
                    .eq('is_active', true)
                    .order('price', { ascending: true }); // Simple default order

                if (servicesData) setServices(servicesData);

                // 4. Fetch Team (Stylists)
                const { data: teamData } = await supabase
                    .from('stylists')
                    .select('*')
                    .eq('business_id', id)
                    .eq('is_active', true);

                if (teamData) setTeam(teamData);

            } catch (error) {
                console.error('Error fetching business details:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

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
        <View className="flex-1 bg-white">
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Cover Image Section */}
                <View className="relative w-full h-72 bg-neutral-200">
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

                    {/* Overlay Gradient/Shadow could go here */}
                    <View className="absolute inset-0 bg-black/20" />

                    {/* Back Button */}
                    <SafeAreaView className="absolute top-0 left-0 right-0 z-10" edges={['top']}>
                        <View className="px-4 py-2 flex-row justify-between items-center">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                            >
                                <Feather name="arrow-left" size={24} color="#000" />
                            </TouchableOpacity>

                            <View className="flex-row gap-3">
                                <TouchableOpacity className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md">
                                    <Feather name="share" size={20} color="#000" />
                                </TouchableOpacity>
                                <TouchableOpacity className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md">
                                    <Feather name="heart" size={20} color="#000" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Main Info Card - Slightly overlapping cover */}
                <View className="px-6 -mt-8">
                    <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1 mr-4">
                                <Text className="text-2xl font-bold text-neutral-900 mb-2">{business.name}</Text>
                                <View className="flex-row items-center mb-1">
                                    <Feather name="map-pin" size={14} color="#737373" />
                                    <Text className="text-neutral-600 ml-1 text-sm">
                                        {business.address}, {business.city}
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Feather name="star" size={16} color="#F59E0B" fill="#F59E0B" />
                                    <Text className="font-bold ml-1 text-neutral-900">{business.rating?.toFixed(1) || 'New'}</Text>
                                    <Text className="text-neutral-500 ml-1">({business.review_count || 0} reviews)</Text>
                                </View>
                            </View>

                            {/* Logo Avatar */}
                            {business.logo_url && (
                                <Image
                                    source={{ uri: business.logo_url }}
                                    className="w-16 h-16 rounded-full border-2 border-white shadow-sm"
                                />
                            )}
                        </View>

                        {/* Description */}
                        {business.description && (
                            <Text className="mt-4 text-neutral-600 leading-6" numberOfLines={3}>
                                {business.description}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Portfolio Carousel */}
                {portfolio.length > 0 && (
                    <View className="mt-8">
                        <View className="px-6 flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-bold text-neutral-900">Portfolio</Text>
                            <TouchableOpacity>
                                <Text className="text-neutral-500 font-medium">See all</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
                            {portfolio.map((item) => (
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
                    <Text className="text-lg font-bold text-neutral-900 mb-4">Services</Text>
                    <View className="space-y-3">
                        {services.map((service) => (
                            <View key={service.id} className="flex-row justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                <View className="flex-1 mr-4">
                                    <Text className="font-semibold text-neutral-900 text-base">{service.name}</Text>
                                    <Text className="text-neutral-500 text-sm mt-0.5">{service.duration_minutes} min</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="font-bold text-neutral-900 text-base">${service.price}</Text>
                                    <TouchableOpacity className="mt-2 bg-black px-3 py-1.5 rounded-lg">
                                        <Text className="text-white text-xs font-bold">Book</Text>
                                    </TouchableOpacity>
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
                    <Text className="text-lg font-bold text-neutral-900 mb-4">Meet the Team</Text>
                    <View className="flex-row flex-wrap -mx-2">
                        {team.map((member) => (
                            <TouchableOpacity key={member.id} className="w-1/3 px-2 mb-4 items-center">
                                <View className="w-20 h-20 rounded-full bg-neutral-100 mb-2 overflow-hidden shadow-sm border border-neutral-100">
                                    {member.avatar_url ? (
                                        <Image source={{ uri: member.avatar_url }} className="w-full h-full" />
                                    ) : (
                                        <View className="w-full h-full items-center justify-center bg-neutral-200">
                                            <Feather name="user" size={24} color="#a3a3a3" />
                                        </View>
                                    )}
                                </View>
                                <Text className="font-medium text-center text-sm" numberOfLines={1}>{member.name}</Text>
                                <Text className="text-xs text-neutral-500 text-center" numberOfLines={1}>Stylist</Text>
                            </TouchableOpacity>
                        ))}
                        {team.length === 0 && (
                            <Text className="text-neutral-500 italic">No team members listed yet.</Text>
                        )}
                    </View>
                </View>

            </ScrollView>

            {/* Sticky Bottom Action Bar */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 pt-4 pb-8 shadow-lg">
                <TouchableOpacity className="w-full bg-black py-4 rounded-xl items-center shadow-md active:opacity-90">
                    <Text className="text-white font-bold text-lg">Book an Appointment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
