import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function BusinessDashboard() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const router = useRouter();
    const [business, setBusiness] = useState<any>(null);
    const [hours, setHours] = useState<any[]>([]);
    const [stylists, setStylists] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isLargeScreen = width > 1024;
    const isMediumScreen = width > 768;

    // Reload data when page comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                loadBusinessData();
            }
        }, [user])
    );

    async function loadBusinessData() {
        try {
            // Load business
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user?.id)
                .single();

            if (businessError && businessError.code !== 'PGRST116') {
                console.error('Error loading business:', businessError);
            } else if (businessData) {
                setBusiness(businessData);

                // Load business hours
                const { data: hoursData } = await supabase
                    .from('business_hours')
                    .select('*')
                    .eq('business_id', businessData.id)
                    .order('day_of_week');

                if (hoursData) setHours(hoursData);

                // Load stylists
                const { data: stylistsData } = await supabase
                    .from('stylists')
                    .select('*')
                    .eq('business_id', businessData.id);

                if (stylistsData) setStylists(stylistsData);

                // Load services
                const { data: servicesData } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', businessData.id);

                if (servicesData) setServices(servicesData);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 max-w-7xl mx-auto w-full">
                    {/* Welcome Section */}
                    <View className="mb-8">
                        <Text className="text-3xl font-bold mb-2">
                            {business ? `Welcome back, ${business.name}!` : 'Business Dashboard'}
                        </Text>
                        <Text className="text-neutral-600">
                            Manage your business and bookings
                        </Text>
                    </View>

                    {loading ? (
                        <View className="items-center py-12">
                            <Text className="text-neutral-500">Loading your business...</Text>
                        </View>
                    ) : business ? (
                        <>
                            {/* Desktop: 2-column layout, Mobile: single column */}
                            <View className={isLargeScreen ? 'flex-row gap-6' : undefined}>
                                {/* Left Column */}
                                <View className={isLargeScreen ? 'flex-1' : undefined}>
                                    {/* Business Overview */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-semibold">Business Overview</Text>
                                            <TouchableOpacity
                                                onPress={() => router.push('/business/edit/details')}
                                                className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                            >
                                                <Feather name="edit-2" size={14} color="#737373" />
                                            </TouchableOpacity>
                                        </View>
                                        <View>
                                            <View className="flex-row items-center mb-3">
                                                <Feather name="map-pin" size={18} color="#737373" />
                                                <Text className="ml-3 text-neutral-700">
                                                    {business.address}, {business.city}
                                                </Text>
                                            </View>
                                            {business.phone && (
                                                <View className="flex-row items-center mb-3">
                                                    <Feather name="phone" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-700">{business.phone}</Text>
                                                </View>
                                            )}
                                            {business.email && (
                                                <View className="flex-row items-center">
                                                    <Feather name="mail" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-700">{business.email}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Business Hours */}
                                    {hours.length > 0 ? (
                                        <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                            <View className="flex-row items-center justify-between mb-4">
                                                <Text className="text-lg font-semibold">Business Hours</Text>
                                                <TouchableOpacity
                                                    onPress={() => router.push('/business/edit/hours')}
                                                    className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                                >
                                                    <Feather name="edit-2" size={14} color="#737373" />
                                                </TouchableOpacity>
                                            </View>
                                            <>
                                                {hours.map((hour) => (
                                                    <View key={hour.id} className="flex-row justify-between mb-2">
                                                        <Text className="text-neutral-700 font-medium">{DAYS[hour.day_of_week]}</Text>
                                                        <Text className="text-neutral-600">
                                                            {hour.is_closed ? 'Closed' : `${hour.open_time} - ${hour.close_time}`}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </>
                                        </View>
                                    ) : null}

                                    {/* Team Members */}
                                    {stylists.length > 0 ? (
                                        <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                            <View className="flex-row items-center justify-between mb-4">
                                                <Text className="text-lg font-semibold">Team Members ({stylists.length})</Text>
                                                <TouchableOpacity
                                                    onPress={() => router.push('/business/edit/team')}
                                                    className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                                >
                                                    <Feather name="edit-2" size={14} color="#737373" />
                                                </TouchableOpacity>
                                            </View>
                                            <View className="flex-row flex-wrap gap-2">
                                                {stylists.map((stylist) => (
                                                    <View key={stylist.id} className="bg-white border border-neutral-200 rounded-full px-4 py-2">
                                                        <Text className="font-medium text-neutral-900">{stylist.name}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : null}

                                    {/* Services */}
                                    {services.length > 0 ? (
                                        <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                            <View className="flex-row items-center justify-between mb-4">
                                                <Text className="text-lg font-semibold">Services ({services.length})</Text>
                                                <TouchableOpacity
                                                    onPress={() => router.push('/business/edit/services')}
                                                    className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                                >
                                                    <Feather name="edit-2" size={14} color="#737373" />
                                                </TouchableOpacity>
                                            </View>
                                            <>
                                                {services.map((service) => (
                                                    <View key={service.id} className="flex-row justify-between items-center mb-3">
                                                        <View className="flex-1">
                                                            <Text className="font-semibold text-neutral-900">{service.name}</Text>
                                                            <Text className="text-sm text-neutral-600">{service.duration_minutes} min</Text>
                                                        </View>
                                                        <Text className="font-semibold text-lg">${service.price}</Text>
                                                    </View>
                                                ))}
                                            </>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Right Column */}
                                <View className={isLargeScreen ? 'flex-1' : undefined}>
                                    {/* Stats */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <Text className="text-lg font-semibold mb-4">This Week</Text>
                                        <View className="flex-row justify-between">
                                            <View>
                                                <Text className="text-2xl font-bold">0</Text>
                                                <Text className="text-neutral-600 text-sm">Bookings</Text>
                                            </View>
                                            <View>
                                                <Text className="text-2xl font-bold">0</Text>
                                                <Text className="text-neutral-600 text-sm">New Clients</Text>
                                            </View>
                                            <View>
                                                <Text className="text-2xl font-bold">$0</Text>
                                                <Text className="text-neutral-600 text-sm">Revenue</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View className="items-center py-12">
                            <Text className="text-neutral-500 text-center mb-4">
                                No business found
                            </Text>
                            <Text className="text-neutral-400 text-sm text-center">
                                Complete your business onboarding to get started
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
