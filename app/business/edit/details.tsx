import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { useAuth } from '../../../lib/auth';
import { db } from '../../../lib/firebase';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';

export default function EditBusinessDetailsScreen() {
    const { user } = useAuth();
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
        if (!user) return;
        try {
            const bizSnap = await getDocs(
                query(collection(db, 'businesses'), where('owner_id', '==', user.uid))
            );
            if (bizSnap.empty) throw new Error('Business not found');
            const bizDoc = bizSnap.docs[0];
            const business = { id: bizDoc.id, ...bizDoc.data() } as any;

            setBusinessId(business.id);
            setBusinessName(business.name || '');
            setDescription(business.description || '');
            setAddress(business.address || '');
            setCity(business.city || '');
            setState(business.state || '');
            setZipCode(business.zip_code || '');
            setPhone(business.phone || '');
            setEmail(business.email || '');
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
            await updateDoc(doc(db, 'businesses', businessId), {
                name: businessName,
                description: description,
                address: address,
                city: city,
                state: state,
                zip_code: zipCode,
                phone: phone,
                email: email,
            });
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
            <Header showBack={true} backHref="/business/dashboard" backLabel="Dashboard" />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth, width: '100%' }}>

                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                            Business Details
                        </Text>
                        <Text className="text-neutral-600 mb-10">
                            Manage your business profile information
                        </Text>

                        {loading ? (
                            <View className="items-center py-8">
                                <Text className="text-neutral-500">Loading...</Text>
                            </View>
                        ) : (
                            <View>
                                {/* Business Name */}
                                <View className="mb-6">
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Business Name *</Text>
                                    <TextInput
                                        value={businessName}
                                        onChangeText={setBusinessName}
                                        placeholder="Enter business name"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
                                    />
                                </View>
                                
                                {/* Description */}
                                <View className="mb-6">
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Description</Text>
                                    <TextInput
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Brief description of your business"
                                        multiline
                                        numberOfLines={3}
                                        className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
                                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                                    />
                                </View>

                                {/* Address */}
                                <View className="mb-6">
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Street Address *</Text>
                                    <TextInput
                                        value={address}
                                        onChangeText={setAddress}
                                        placeholder="123 Main St"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
                                    />
                                </View>

                                {/* City, State, Zip */}
                                <View className="flex-row gap-3 mb-6">
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">City *</Text>
                                        <TextInput
                                            value={city}
                                            onChangeText={setCity}
                                            placeholder="City"
                                            className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
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
                                            className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
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
                                            className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
                                        />
                                    </View>
                                </View>

                                {/* Phone */}
                                <View className="mb-6">
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Phone</Text>
                                    <TextInput
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="(555) 123-4567"
                                        keyboardType="phone-pad"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
                                    />
                                </View>

                                {/* Email */}
                                <View className="mb-6">
                                    <Text className="text-sm font-medium text-neutral-700 mb-2">Email</Text>
                                    <TextInput
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="business@example.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white"
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
