import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { useAuth } from '../../../lib/auth';
import { db, storage } from '../../../lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

interface Stylist {
    id?: string;
    name: string;
    bio: string;
    image_url?: string;
    storage_path?: string;
    local_image_uri?: string; // used for preview before uploading
    has_new_image?: boolean; // track if they picked a new one
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
    const [isEditing, setIsEditing] = useState(false);
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
                setCurrentStylist({ ...currentStylist, local_image_uri: result.assets[0].uri, has_new_image: true });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            alert('Failed to pick image');
        }
    };

    const saveStylist = async () => {
        if (!business || !currentStylist.name.trim()) return;
        setActionLoading(true);
        try {
            let imageUrl = currentStylist.image_url || null;
            let storagePath = currentStylist.storage_path || null;

            // Upload image if selected a NEW one or removed it
            if (currentStylist.has_new_image) {
                if (currentStylist.local_image_uri) {
                    const response = await fetch(currentStylist.local_image_uri);
                    const blob = await response.blob();
                    const fileExt = currentStylist.local_image_uri.split('.').pop()?.toLowerCase() || 'jpg';
                    const newStoragePath = `businesses/${business.id}/stylists/${Date.now()}.${fileExt}`;
                    const storageRef = ref(storage, newStoragePath);
                    
                    await uploadBytes(storageRef, blob, { contentType: `image/${fileExt}` });
                    imageUrl = await getDownloadURL(storageRef);
                    
                    // Delete old image if it existed to save space
                    if (storagePath) {
                        try { await deleteObject(ref(storage, storagePath)); } catch (e) {}
                    }
                    storagePath = newStoragePath;
                } else {
                    // Removed photo completely
                    if (storagePath) {
                        try { await deleteObject(ref(storage, storagePath)); } catch (e) {}
                    }
                    imageUrl = null;
                    storagePath = null;
                }
            }

            const stylistData: any = {
                name: currentStylist.name,
                bio: currentStylist.bio,
                image_url: imageUrl,
                storage_path: storagePath,
                updated_at: new Date().toISOString(),
            };

            if (isEditing && currentStylist.id) {
                // Update
                const docRef = doc(db, 'businesses', business.id, 'stylists', currentStylist.id);
                await updateDoc(docRef, stylistData);
            } else {
                // Create
                stylistData.specialties = [];
                stylistData.is_active = true;
                stylistData.created_at = new Date().toISOString();
                await addDoc(collection(db, 'businesses', business.id, 'stylists'), stylistData);
            }

            setCurrentStylist({ name: '', bio: '', local_image_uri: undefined, has_new_image: false, image_url: undefined, storage_path: undefined });
            setIsEditing(false);
            setIsModalVisible(false);
            await loadStylists(business.id);
        } catch (error) {
            console.error('Error saving stylist:', error);
            alert('Failed to save team member. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddClick = () => {
        setCurrentStylist({ name: '', bio: '', local_image_uri: undefined, has_new_image: false, image_url: undefined, storage_path: undefined });
        setIsEditing(false);
        setIsModalVisible(true);
    };

    const editStylist = (stylist: Stylist) => {
        setCurrentStylist({
            ...stylist,
            local_image_uri: stylist.image_url,
            has_new_image: false
        });
        setIsEditing(true);
        setIsModalVisible(true);
    };

    const cancelEdit = () => {
        setCurrentStylist({ name: '', bio: '', local_image_uri: undefined, has_new_image: false, image_url: undefined, storage_path: undefined });
        setIsEditing(false);
        setIsModalVisible(false);
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
                                                <View className="flex-row">
                                                    <TouchableOpacity onPress={() => editStylist(stylist)} className="ml-1 p-2">
                                                        <Feather name="edit-2" size={18} color="#000" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => removeStylist(stylist)} className="ml-1 p-2">
                                                        <Feather name="trash-2" size={18} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                    {stylists.length === 0 && (
                                        <View className="items-center py-12 px-6">
                                            <Feather name="users" size={48} color="#d4d4d8" />
                                            <Text className="text-neutral-500 mt-4 text-center">No team members yet. Add stylists to let clients book them directly!</Text>
                                        </View>
                                    )}

                                    <TouchableOpacity 
                                        onPress={handleAddClick} 
                                        className="bg-black h-14 rounded-2xl flex-row items-center justify-center mt-4 w-full"
                                    >
                                        <Feather name="plus" size={20} color="white" />
                                        <Text className="text-white font-semibold ml-2 text-base">
                                            Add Team Member
                                        </Text>
                                    </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modal Form for Add/Edit using native PageSheet */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={cancelEdit}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 bg-white"
                >
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100">
                        <Text className="text-xl font-bold">
                            {isEditing ? 'Edit Stylist' : 'Add Stylist'}
                        </Text>
                        <TouchableOpacity onPress={cancelEdit} className="p-2 -mr-2">
                            <Feather name="x" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6 pt-8 pb-32">
                        <View className="items-center mb-8">
                            <TouchableOpacity 
                                onPress={pickImage}
                                className="items-center justify-center w-28 h-28 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200"
                            >
                                {currentStylist.local_image_uri ? (
                                    <Image 
                                        source={{ uri: currentStylist.local_image_uri }} 
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <>
                                        <Feather name="camera" size={28} color="#a3a3a3" />
                                        <Text className="text-[10px] text-neutral-400 font-medium mt-2 uppercase text-center">Add Photo</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            {currentStylist.local_image_uri && (
                                <TouchableOpacity 
                                    onPress={() => setCurrentStylist({ ...currentStylist, local_image_uri: undefined, has_new_image: true })}
                                    className="mt-4 bg-red-50 px-4 py-2 rounded-full"
                                >
                                    <Text className="text-sm text-red-600 font-medium">Remove Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="mb-5">
                            <Text className="text-sm font-medium text-neutral-700 mb-2">Stylist Name</Text>
                            <TextInput
                                placeholder="e.g., Sarah Johnson"
                                value={currentStylist.name}
                                onChangeText={(value) => setCurrentStylist({ ...currentStylist, name: value })}
                                className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base"
                            />
                        </View>

                        <View className="mb-8">
                            <Text className="text-sm font-medium text-neutral-700 mb-2">Short Bio (Optional)</Text>
                            <TextInput
                                placeholder="Brief description to help clients get to know them..."
                                value={currentStylist.bio}
                                onChangeText={(value) => setCurrentStylist({ ...currentStylist, bio: value })}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base min-h-[100px]"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={saveStylist}
                            disabled={!currentStylist.name.trim() || actionLoading}
                            className={`h-14 w-full rounded-2xl items-center justify-center flex-row shadow-sm ${
                                currentStylist.name.trim() && !actionLoading ? 'bg-black' : 'bg-neutral-200'
                            }`}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Feather name={isEditing ? "save" : "check"} size={20} color={currentStylist.name.trim() ? "white" : "#a3a3a3"} />
                            )}
                            <Text className={`${currentStylist.name.trim() && !actionLoading ? 'text-white' : 'text-neutral-500'} font-semibold ml-2 text-base`}>
                                {actionLoading ? 'Saving...' : isEditing ? 'Save Stylist' : 'Add Stylist'}
                            </Text>
                        </TouchableOpacity>
                        <View className="h-20" />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
