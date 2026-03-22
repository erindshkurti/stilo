import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { useAuth } from '../../../lib/auth';
import { db, storage } from '../../../lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

interface Stylist {
    id?: string;
    name: string;
    bio: string;
    image_url?: string;
    storage_path?: string;
    local_image_uri?: string; // used for preview before uploading
}

export default function EditTeamScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const [business, setBusiness] = useState<any>(null);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [currentStylist, setCurrentStylist] = useState<Stylist>({ name: '', bio: '' });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

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
            const biz = { id: bizDoc.id, ...bizDoc.data() };
            setBusiness(biz);
            await loadStylists(bizDoc.id);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadStylists(businessId: string) {
        const snap = await getDocs(collection(db, 'businesses', businessId, 'stylists'));
        setStylists(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stylist)));
    }

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setCurrentStylist({ ...currentStylist, local_image_uri: result.assets[0].uri });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            alert('Failed to pick image');
        }
    };

    const addStylist = async () => {
        if (!business || !currentStylist.name.trim()) return;
        setActionLoading(true);
        try {
            let imageUrl = null;
            let storagePath = null;

            // Upload image if selected
            if (currentStylist.local_image_uri) {
                const response = await fetch(currentStylist.local_image_uri);
                const blob = await response.blob();
                const fileExt = currentStylist.local_image_uri.split('.').pop()?.toLowerCase() || 'jpg';
                // Note: Stylists belong to the business, we store images under businesses/{bizId}/stylists
                storagePath = `businesses/${business.id}/stylists/${Date.now()}.${fileExt}`;
                const storageRef = ref(storage, storagePath);
                
                await uploadBytes(storageRef, blob, { contentType: `image/${fileExt}` });
                imageUrl = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, 'businesses', business.id, 'stylists'), {
                name: currentStylist.name,
                bio: currentStylist.bio,
                image_url: imageUrl,
                storage_path: storagePath,
                specialties: [],
                is_active: true,
                created_at: new Date().toISOString(),
            });
            setCurrentStylist({ name: '', bio: '', local_image_uri: undefined });
            await loadStylists(business.id);
        } catch (error) {
            console.error('Error adding stylist:', error);
            alert('Failed to add team member. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const removeStylist = async (stylist: Stylist) => {
        if (!stylist.id || !business) return;
        const previousStylists = [...stylists];
        setStylists(stylists.filter(s => s.id !== stylist.id));
        try {
            // Delete the document
            await deleteDoc(doc(db, 'businesses', business.id, 'stylists', stylist.id));
            
            // Delete the image from Storage if it exists
            if (stylist.storage_path) {
                try {
                    await deleteObject(ref(storage, stylist.storage_path));
                } catch (e) {
                    console.error('Error deleting image from storage:', e);
                    // Non-fatal, let it proceed
                }
            }
        } catch (error) {
            console.error('Error removing stylist:', error);
            setStylists(previousStylists);
            alert('Failed to remove team member. Please try again.');
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
                            Team Members
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Manage your team members
                        </Text>

                        {loading ? (
                            <Text className="text-neutral-500 text-center py-8">Loading...</Text>
                        ) : (
                            <>
                                {/* Current Team Members */}
                                {stylists.length > 0 && (
                                    <View className="mb-6">
                                        {stylists.map((stylist) => (
                                            <View key={stylist.id} className="bg-neutral-50 rounded-2xl p-4 flex-row items-center justify-between mb-3">
                                                <View className="flex-row items-center flex-1">
                                                    {stylist.image_url ? (
                                                        <Image 
                                                            source={{ uri: stylist.image_url }} 
                                                            className="w-12 h-12 rounded-full bg-neutral-200 mr-4"
                                                        />
                                                    ) : (
                                                        <View className="w-12 h-12 rounded-full bg-neutral-200 items-center justify-center mr-4">
                                                            <Feather name="user" size={20} color="#737373" />
                                                        </View>
                                                    )}
                                                    <View className="flex-1">
                                                        <Text className="font-semibold text-base">{stylist.name}</Text>
                                                        {stylist.bio && (
                                                            <Text className="text-sm text-neutral-600 mt-1" numberOfLines={1}>
                                                                {stylist.bio}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <TouchableOpacity onPress={() => removeStylist(stylist)} className="ml-3 p-2">
                                                    <Feather name="trash-2" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Add New Team Member */}
                                <View className="bg-neutral-50 rounded-2xl p-4 mb-6">
                                    <Text className="font-semibold text-base mb-4">
                                        {stylists.length === 0 ? 'Add Your First Team Member' : 'Add Another Team Member'}
                                    </Text>

                                    <View className="items-center mb-6">
                                        <TouchableOpacity 
                                            onPress={pickImage}
                                            className="items-center justify-center w-24 h-24 rounded-full bg-neutral-200 overflow-hidden"
                                        >
                                            {currentStylist.local_image_uri ? (
                                                <Image 
                                                    source={{ uri: currentStylist.local_image_uri }} 
                                                    className="w-full h-full"
                                                />
                                            ) : (
                                                <>
                                                    <Feather name="camera" size={24} color="#737373" />
                                                    <Text className="text-[10px] text-neutral-500 font-medium mt-1 uppercase text-center">Add Photo</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                        {currentStylist.local_image_uri && (
                                            <TouchableOpacity 
                                                onPress={() => setCurrentStylist({ ...currentStylist, local_image_uri: undefined })}
                                                className="mt-2"
                                            >
                                                <Text className="text-sm text-red-500 font-medium">Remove Photo</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View className="mb-3">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Name</Text>
                                        <TextInput
                                            placeholder="e.g., Sarah Johnson"
                                            value={currentStylist.name}
                                            onChangeText={(value) => setCurrentStylist({ ...currentStylist, name: value })}
                                            className="h-12 bg-white rounded-xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base"
                                        />
                                    </View>

                                    <View className="mb-3">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Bio (Optional)</Text>
                                        <TextInput
                                            placeholder="Brief description..."
                                            value={currentStylist.bio}
                                            onChangeText={(value) => setCurrentStylist({ ...currentStylist, bio: value })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                            className="bg-white rounded-xl p-3 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base min-h-[80px]"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        onPress={addStylist}
                                        disabled={!currentStylist.name.trim() || actionLoading}
                                        className={`h-12 rounded-xl items-center justify-center flex-row ${
                                            currentStylist.name.trim() && !actionLoading ? 'bg-black' : 'bg-neutral-200'
                                        }`}
                                    >
                                        {actionLoading ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <Feather name="plus" size={20} color={currentStylist.name.trim() ? "white" : "#a3a3a3"} />
                                        )}
                                        <Text className={`${currentStylist.name.trim() && !actionLoading ? 'text-white' : 'text-neutral-500'} font-medium ml-2`}>
                                            {actionLoading ? 'Adding...' : 'Add Team Member'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
