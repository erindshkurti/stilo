import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { FormInput } from '../../../components/FormInput';
import { useAuth } from '../../../lib/auth';
import { db } from '../../../lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';

interface Service {
    id?: string;
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    category: string;
}

const CATEGORIES = ['Haircut', 'Color', 'Balayage', 'Blowout', 'Extensions', 'Styling', 'Treatment'];

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
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        loadData();
    }, [user]);

    async function loadData() {
        if (!user) return;
        try {
            const bizSnap = await getDocs(
                query(collection(db, 'businesses'), where('owner_id', '==', user.uid))
            );
            if (bizSnap.empty) return;
            const bizDoc = bizSnap.docs[0];
            setBusiness({ id: bizDoc.id, ...bizDoc.data() });
            await loadServices(bizDoc.id);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadServices(businessId: string) {
        const snap = await getDocs(collection(db, 'businesses', businessId, 'services'));
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
    }

    const saveService = async () => {
        if (!business || !currentService.name.trim() || currentService.price <= 0) return;
        setActionLoading(true);
        try {
            const serviceData: any = {
                name: currentService.name,
                description: currentService.description,
                duration_minutes: currentService.duration_minutes,
                price: currentService.price,
                category: currentService.category,
                is_active: true,
                updated_at: new Date().toISOString(),
            };

            if (isEditing && editingServiceId) {
                await updateDoc(doc(db, 'businesses', business.id, 'services', editingServiceId), serviceData);
            } else {
                serviceData.created_at = new Date().toISOString();
                await addDoc(collection(db, 'businesses', business.id, 'services'), serviceData);
            }

            setCurrentService({ name: '', description: '', duration_minutes: 60, price: 0, category: 'Haircut' });
            setIsEditing(false);
            setEditingServiceId(null);
            setIsModalVisible(false);
            await loadServices(business.id);
        } catch (error) {
            console.error('Error saving service:', error);
            alert('Failed to save service. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddClick = () => {
        setCurrentService({ name: '', description: '', duration_minutes: 60, price: 0, category: 'Haircut' });
        setIsEditing(false);
        setEditingServiceId(null);
        setIsModalVisible(true);
    };

    const handleEditClick = (service: Service) => {
        setCurrentService({ ...service });
        setIsEditing(true);
        setEditingServiceId(service.id || null);
        setIsModalVisible(true);
    };

    const removeService = async (id: string | undefined) => {
        if (!id || !business) return;
        const previousServices = [...services];
        setServices(services.filter(s => s.id !== id));
        try {
            await deleteDoc(doc(db, 'businesses', business.id, 'services', id));
        } catch (error) {
            console.error('Error removing service:', error);
            setServices(previousServices);
            alert('Failed to remove service. Please try again.');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header showBack={true} backHref="/business/dashboard" />

            <View className="flex-1">
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-6 py-8 items-center">
                        <View style={{ maxWidth, width: '100%' }}>

                            <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                                Services
                            </Text>
                            <Text className="text-neutral-600 mb-8">
                                Manage your services and pricing
                            </Text>

                            {loading ? (
                                <View className="items-center py-12">
                                    <ActivityIndicator color="#000" />
                                </View>
                            ) : (
                                <View className="space-y-4">
                                    {services.map((service) => (
                                        <View key={service.id} className="bg-neutral-50 rounded-2xl p-5 mb-3">
                                            <View className="flex-row items-start justify-between mb-4">
                                                <View className="flex-1">
                                                    <Text className="font-bold text-lg text-neutral-900">{service.name}</Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <View className="bg-neutral-200 px-2 py-0.5 rounded-md">
                                                            <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{service.category}</Text>
                                                        </View>
                                                        <View className="w-1 h-1 rounded-full bg-neutral-300 mx-2" />
                                                        <Text className="text-sm text-neutral-500">{service.duration_minutes} min</Text>
                                                    </View>
                                                </View>
                                                <View className="flex-row items-center gap-1">
                                                    <TouchableOpacity onPress={() => handleEditClick(service)} className="p-2">
                                                        <Feather name="edit-2" size={18} color="#737373" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => removeService(service.id)} className="p-2">
                                                        <Feather name="trash-2" size={18} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center justify-between border-t border-neutral-100 pt-4">
                                                <Text className="text-neutral-500 text-sm">Base Price</Text>
                                                <Text className="font-bold text-2xl text-neutral-900">${service.price}</Text>
                                            </View>
                                        </View>
                                    ))}

                                    {services.length === 0 && (
                                        <View className="items-center py-20 px-8">
                                            <View className="w-20 h-20 bg-neutral-50 rounded-full items-center justify-center mb-6">
                                                <Feather name="scissors" size={32} color="#d4d4d8" />
                                            </View>
                                            <Text className="text-neutral-500 text-center text-lg leading-6">No services yet. Add what you offer to get started!</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Fixed Add Button Footer */}
                {!loading && (
                    <View className="p-6 border-t border-neutral-100 bg-white items-center">
                        <View style={{ maxWidth, width: '100%' }}>
                            <TouchableOpacity 
                                onPress={handleAddClick} 
                                className="bg-black py-4 rounded-2xl items-center flex-row justify-center shadow-lg"
                                activeOpacity={0.8}
                            >
                                <Feather name="plus" size={20} color="white" />
                                <Text className="text-white font-bold ml-2 text-lg">
                                    Add Service
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Modal Form for Add/Edit using native PageSheet */}
            <Modal
                visible={isModalVisible}
                animationType={isLargeScreen ? "fade" : "slide"}
                presentationStyle={isLargeScreen ? "overFullScreen" : "pageSheet"}
                transparent={isLargeScreen}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={isLargeScreen ? { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' } : { flex: 1 }}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        className={isLargeScreen ? "bg-white" : "flex-1 bg-white"}
                        style={isLargeScreen ? { width: 600, maxHeight: '90%', borderRadius: 24, overflow: 'hidden' } : { width: '100%' }}
                    >
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100">
                            <Text className="text-2xl font-bold">
                                {isEditing ? 'Edit Service' : 'Add Service'}
                            </Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} className="p-2 -mr-2">
                                <Feather name="x" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-6 pt-8">
                            <View className="mb-6">
                                <Text className="text-base font-medium text-neutral-700 mb-2">Category</Text>
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
                                            <Text className={currentService.category === cat ? 'text-white font-medium' : 'text-neutral-600'}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-base font-medium text-neutral-700 mb-2">Service Name</Text>
                                <FormInput
                                    placeholder="e.g., Women's Haircut"
                                    value={currentService.name}
                                    onChangeText={(value) => setCurrentService({ ...currentService, name: value })}
                                />
                            </View>

                            <View className="flex-row gap-4 mb-6">
                                <View className="flex-1">
                                    <Text className="text-base font-medium text-neutral-700 mb-2">Duration (min)</Text>
                                    <FormInput
                                        placeholder="60"
                                        value={currentService.duration_minutes > 0 ? currentService.duration_minutes.toString() : ''}
                                        onChangeText={(value) => setCurrentService({ ...currentService, duration_minutes: parseInt(value) || 0 })}
                                        keyboardType="number-pad"
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text className="text-base font-medium text-neutral-700 mb-2">Price ($)</Text>
                                    <FormInput
                                        placeholder="50"
                                        value={currentService.price > 0 ? currentService.price.toString() : ''}
                                        onChangeText={(value) => setCurrentService({ ...currentService, price: parseFloat(value) || 0 })}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            <View className="mb-10">
                                <Text className="text-base font-medium text-neutral-700 mb-2">Description (optional)</Text>
                                <TextInput
                                    placeholder="Brief description of what's included..."
                                    value={currentService.description}
                                    onChangeText={(value) => setCurrentService({ ...currentService, description: value })}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base min-h-[100px]"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={saveService}
                                disabled={!currentService.name.trim() || currentService.price <= 0 || actionLoading}
                                className={`h-14 w-full rounded-2xl items-center justify-center flex-row shadow-sm mb-10 ${
                                    currentService.name.trim() && currentService.price > 0 && !actionLoading ? 'bg-black' : 'bg-neutral-200'
                                }`}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Feather name={isEditing ? "save" : "check"} size={20} color="white" />
                                )}
                                <Text className="text-white font-bold ml-2 text-xl">
                                    {actionLoading ? 'Saving...' : isEditing ? 'Save Service' : 'Add Service'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

