import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Header } from '../components/Header';

export default function LandingPage() {
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;
    const [location, setLocation] = useState('');
    const [service, setService] = useState('');
    const [date, setDate] = useState('');

    return (
        <SafeAreaView className="flex-1 bg-white">
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
                                        className="bg-neutral-100 px-5 py-2.5 rounded-full"
                                        onPress={() => setService(item)}
                                    >
                                        <Text className="text-neutral-700 font-medium">{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
