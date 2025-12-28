import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { StylistCard } from '../components/StylistCard';

// Mock data for featured stylists
const FEATURED_STYLISTS = [
    {
        id: '1',
        name: 'Bella Hair Studio',
        location: 'New York, NY',
        rating: 4.9,
        reviewCount: 127,
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
    },
    {
        id: '2',
        name: 'The Cut Above',
        location: 'Los Angeles, CA',
        rating: 4.8,
        reviewCount: 203,
        imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=300&fit=crop',
    },
    {
        id: '3',
        name: 'Style & Grace',
        location: 'Chicago, IL',
        rating: 5.0,
        reviewCount: 89,
        imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=300&fit=crop',
    },
    {
        id: '4',
        name: 'Urban Cuts',
        location: 'Miami, FL',
        rating: 4.7,
        reviewCount: 156,
        imageUrl: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400&h=300&fit=crop',
    },
];

export default function LandingPage() {
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;
    const [location, setLocation] = useState('');
    const [service, setService] = useState('');
    const [date, setDate] = useState('');

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
                            <View style={{ maxWidth: 1000, width: '100%' }}>
                                {/* Headline */}
                                <View className="items-center mb-12">
                                    <Text className={`font-bold text-center mb-4 ${isLargeScreen ? 'text-5xl' : 'text-4xl'}`}>
                                        Book your next hair appointment
                                    </Text>
                                    <Text className={`text-neutral-600 text-center ${isLargeScreen ? 'text-xl' : 'text-lg'}`}>
                                        Find and book top-rated hair stylists near you
                                    </Text>
                                </View>

                                {/* Search Card - Horizontal on large screens, vertical on mobile */}
                                <View className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6">
                                    <View className={isLargeScreen ? 'flex-row gap-3' : 'space-y-3'}>
                                        {/* Location Input */}
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'}>
                                            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200">
                                                <Feather name="map-pin" size={20} color="#737373" />
                                                <TextInput
                                                    placeholder="Location"
                                                    value={location}
                                                    onChangeText={setLocation}
                                                    className="flex-1 h-14 px-3 text-base"
                                                />
                                            </View>
                                        </View>

                                        {/* Service Input */}
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'}>
                                            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200">
                                                <Feather name="scissors" size={20} color="#737373" />
                                                <TextInput
                                                    placeholder="Service"
                                                    value={service}
                                                    onChangeText={setService}
                                                    className="flex-1 h-14 px-3 text-base"
                                                />
                                            </View>
                                        </View>

                                        {/* Date Input */}
                                        <View className={isLargeScreen ? 'flex-1' : 'w-full'}>
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
                                                    // TODO: Implement search
                                                    console.log('Search:', { location, service, date });
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
                                        {['Haircut', 'Hair Color', 'Balayage', 'Blowout', 'Extensions', 'Styling'].map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                className="bg-white/80 px-5 py-2.5 rounded-full border border-neutral-100"
                                                onPress={() => setService(item)}
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
                                    <Text className={`font-bold text-center mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                                        Featured Stylists
                                    </Text>
                                    <Text className="text-neutral-600 text-center text-base">
                                        Discover top-rated professionals in your area
                                    </Text>
                                </View>

                                {/* Stylist Grid */}
                                <View className={`${isLargeScreen ? 'flex-row flex-wrap -mx-3' : 'space-y-4'}`}>
                                    {FEATURED_STYLISTS.map((stylist) => (
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
                                                onPress={() => console.log('Stylist pressed:', stylist.name)}
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
