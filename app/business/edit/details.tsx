import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { supabase } from '../../../lib/supabase';

export default function EditBusinessDetailsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Responsive sizing
    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    const [businessName, setBusinessName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        loadBusinessDetails();
    }, []);

    async function loadBusinessDetails() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: business, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            if (error) throw error;

            if (business) {
                setBusinessId(business.id);
                setBusinessName(business.name || '');
                setDescription(business.description || '');
                setAddress(business.address || '');
                setCity(business.city || '');
                setState(business.state || '');
                setZipCode(business.zip_code || '');
                setPhone(business.phone || '');
                setEmail(business.email || '');
            }
        } catch (error) {
            console.error('Error loading business details:', error);
            Alert.alert('Error', 'Failed to load business details');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!businessId) return;

        // Validation
        if (!businessName.trim()) {
            Alert.alert('Error', 'Business name is required');
            return;
        }

        if (!address.trim() || !city.trim()) {
            Alert.alert('Error', 'Address and city are required');
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    name: businessName,
                    description: description,
                    address: address,
                    city: city,
                    state: state,
                    zip_code: zipCode,
                    phone: phone,
                    email: email,
                })
                .eq('id', businessId);

            if (error) throw error;

            router.back();
        } catch (error) {
            console.error('Error saving business details:', error);
            Alert.alert('Error', 'Failed to save business details');
        } finally {
            setSaving(false);
        }
    }

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
                            Business Details
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Manage your business profile information
                        </Text>

                        {loading ? (
                            <View className="items-center py-8">
                                <Text className="text-neutral-500">Loading...</Text>
                            </View>
                        ) : (
                            <View className="space-y-4">
                                {/* Business Name */}
                                <View>
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Business Name *</Text>
                                    <TextInput
                                        value={businessName}
                                        onChangeText={setBusinessName}
                                        placeholder="Enter business name"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                    />
                                </View>

                                {/* Description */}
                                <View>
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Description</Text>
                                    <TextInput
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Brief description of your business"
                                        multiline
                                        numberOfLines={3}
                                        className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200"
                                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                                    />
                                </View>

                                {/* Address */}
                                <View>
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Street Address *</Text>
                                    <TextInput
                                        value={address}
                                        onChangeText={setAddress}
                                        placeholder="123 Main St"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                    />
                                </View>

                                {/* City, State, Zip */}
                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">City *</Text>
                                        <TextInput
                                            value={city}
                                            onChangeText={setCity}
                                            placeholder="City"
                                            className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                        />
                                    </View>
                                    <View style={{ width: 100 }}>
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">State</Text>
                                        <TextInput
                                            value={state}
                                            onChangeText={setState}
                                            placeholder="ST"
                                            maxLength={2}
                                            autoCapitalize="characters"
                                            className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                        />
                                    </View>
                                    <View style={{ width: 100 }}>
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Zip</Text>
                                        <TextInput
                                            value={zipCode}
                                            onChangeText={setZipCode}
                                            placeholder="12345"
                                            keyboardType="numeric"
                                            maxLength={5}
                                            className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                        />
                                    </View>
                                </View>

                                {/* Phone */}
                                <View>
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Phone</Text>
                                    <TextInput
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="(555) 123-4567"
                                        keyboardType="phone-pad"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                    />
                                </View>

                                {/* Email */}
                                <View>
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Email</Text>
                                    <TextInput
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="business@example.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200"
                                    />
                                </View>

                                {/* Save Button */}
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving}
                                    className={`mt-6 py-4 rounded-xl items-center justify-center ${saving ? 'bg-neutral-300' : 'bg-black'}`}
                                >
                                    <Text className="text-white font-semibold text-base">
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
