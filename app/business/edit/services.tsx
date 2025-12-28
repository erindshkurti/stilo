import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

interface Service {
    id?: string;
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    category: string;
}

const CATEGORIES = ['Haircut', 'Color', 'Styling', 'Treatment', 'Other'];

export default function EditServicesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const [business, setBusiness] = useState<any>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [currentService, setCurrentService] = useState<Service>({
        name: '',
        description: '',
        duration_minutes: 60,
        price: 0,
        category: 'Haircut',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        loadData();
    }, [user]);

    async function loadData() {
        try {
            const { data: businessData } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user?.id)
                .single();

            if (businessData) {
                setBusiness(businessData);

                const { data: servicesData } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', businessData.id);

                if (servicesData) {
                    setServices(servicesData);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    const addService = () => {
        if (currentService.name.trim() && currentService.price > 0) {
            setServices([...services, currentService]);
            setCurrentService({
                name: '',
                description: '',
                duration_minutes: 60,
                price: 0,
                category: 'Haircut',
            });
            setHasChanges(true);
        }
    };

    const removeService = (index: number) => {
        setServices(services.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!business) return;

        setSaving(true);
        try {
            // Delete existing services
            await supabase
                .from('services')
                .delete()
                .eq('business_id', business.id);

            // Insert new services
            if (services.length > 0) {
                const servicesToInsert = services.map(s => ({
                    business_id: business.id,
                    name: s.name,
                    description: s.description,
                    duration_minutes: s.duration_minutes,
                    price: s.price,
                    category: s.category,
                }));

                const { error } = await supabase
                    .from('services')
                    .insert(servicesToInsert);

                if (error) throw error;
            }

            router.back();
        } catch (error) {
            console.error('Error saving services:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth, width: '100%' }}>
                        <TouchableOpacity onPress={() => router.back()} className="mb-4">
                            <View className="flex-row items-center">
                                <Feather name="arrow-left" size={20} color="#000" />
                                <Text className="ml-2 font-medium">Back to Dashboard</Text>
                            </View>
                        </TouchableOpacity>

                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                            Services
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Manage your services and pricing
                        </Text>

                        {loading ? (
                            <Text className="text-neutral-500 text-center py-8">Loading...</Text>
                        ) : (
                            <>
                                {/* Current Services */}
                                {services.length > 0 && (
                                    <View className="mb-6">
                                        {services.map((service, index) => (
                                            <View key={index} className="bg-neutral-50 rounded-2xl p-4 mb-3">
                                                <View className="flex-row items-start justify-between mb-2">
                                                    <View className="flex-1">
                                                        <Text className="font-semibold text-base">{service.name}</Text>
                                                        <Text className="text-xs text-neutral-500 mt-1">{service.category}</Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => removeService(index)} className="ml-3 p-2">
                                                        <Feather name="trash-2" size={18} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View className="flex-row items-center justify-between">
                                                    <Text className="text-sm text-neutral-600">{service.duration_minutes} min</Text>
                                                    <Text className="font-semibold text-lg">${service.price}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Add New Service */}
                                <View className="bg-neutral-50 rounded-2xl p-4 mb-6">
                                    <Text className="font-semibold text-base mb-4">
                                        {services.length === 0 ? 'Add Your First Service' : 'Add Another Service'}
                                    </Text>

                                    <View className="mb-3">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Service Name</Text>
                                        <TextInput
                                            placeholder="e.g., Women's Haircut"
                                            value={currentService.name}
                                            onChangeText={(value) => setCurrentService({ ...currentService, name: value })}
                                            className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                                        />
                                    </View>

                                    <View className="mb-3">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Category</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {CATEGORIES.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat}
                                                    onPress={() => setCurrentService({ ...currentService, category: cat })}
                                                    className={`px-4 py-2 rounded-xl border ${currentService.category === cat
                                                        ? 'bg-black border-black'
                                                        : 'bg-white border-neutral-200'
                                                        }`}
                                                >
                                                    <Text className={currentService.category === cat ? 'text-white' : 'text-neutral-700'}>
                                                        {cat}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View className="flex-row gap-3 mb-3">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-neutral-700 mb-2">Duration (min)</Text>
                                            <TextInput
                                                placeholder="60"
                                                value={currentService.duration_minutes > 0 ? currentService.duration_minutes.toString() : ''}
                                                onChangeText={(value) => setCurrentService({ ...currentService, duration_minutes: parseInt(value) || 0 })}
                                                keyboardType="number-pad"
                                                className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                                            />
                                        </View>

                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-neutral-700 mb-2">Price ($)</Text>
                                            <TextInput
                                                placeholder="50"
                                                value={currentService.price > 0 ? currentService.price.toString() : ''}
                                                onChangeText={(value) => setCurrentService({ ...currentService, price: parseFloat(value) || 0 })}
                                                keyboardType="decimal-pad"
                                                className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                                            />
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={addService}
                                        disabled={!currentService.name.trim() || currentService.price <= 0}
                                        className={`h-12 rounded-xl items-center justify-center flex-row ${currentService.name.trim() && currentService.price > 0 ? 'bg-black' : 'bg-neutral-200'
                                            }`}
                                    >
                                        <Feather name="plus" size={20} color="white" />
                                        <Text className="text-white font-medium ml-2">Add Service</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving || !hasChanges}
                                    className={`py-4 rounded-xl ${saving || !hasChanges ? 'bg-neutral-300' : 'bg-black'}`}
                                >
                                    <Text className="text-white font-medium text-center text-base">
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
