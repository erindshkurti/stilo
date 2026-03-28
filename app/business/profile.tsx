import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { auth, db, storage } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AlertModal } from '../../components/AlertModal';

export default function BusinessSettings() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    
    // Alert Modal State
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type: 'error' | 'success' | 'info' }>({ 
        title: '', 
        message: '', 
        type: 'info' 
    });

    const showAlert = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info') => {
        setAlertConfig({ title, message, type });
        setShowAlertModal(true);
    };

    useEffect(() => {
        loadProfile();
        loadPortfolioImages();
    }, [user]);

    async function loadProfile() {
        try {
            if (!user) return;

            if (user.photoURL) setAvatarUrl(user.photoURL);

            const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
            if (profileSnap.exists()) {
                const data = profileSnap.data();
                setFullName(data.full_name || '');
                if (data.avatar_url) setAvatarUrl(data.avatar_url);
            }

            // Get business ID
            const bizSnap = await getDocs(
                query(collection(db, 'businesses'), where('owner_id', '==', user.uid))
            );
            if (!bizSnap.empty) setBusinessId(bizSnap.docs[0].id);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadPortfolioImages() {
        try {
            if (!user) return;
            const bizSnap = await getDocs(
                query(collection(db, 'businesses'), where('owner_id', '==', user.uid))
            );
            if (bizSnap.empty) return;
            const bizId = bizSnap.docs[0].id;
            const imgSnap = await getDocs(
                query(collection(db, 'businesses', bizId, 'portfolio'), orderBy('display_order'))
            );
            setPortfolioImages(imgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error loading portfolio images:', error);
        }
    }

    async function uploadPortfolioImage(uri: string) {
        try {
            setUploadingPortfolio(true);
            if (!user || !businessId) return;

            const response = await fetch(uri);
            const blob = await response.blob();
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const storageRef = ref(storage, `businesses/${businessId}/portfolio/${Date.now()}.${fileExt}`);
            await uploadBytes(storageRef, blob, { contentType: `image/${fileExt}` });
            const publicUrl = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'businesses', businessId, 'portfolio'), {
                image_url: publicUrl,
                storage_path: storageRef.fullPath,
                display_order: portfolioImages.length,
            });

            await loadPortfolioImages();
        } catch (error) {
            console.error('Error uploading portfolio image:', error);
            showAlert('Error', 'Failed to upload portfolio image. Please try again.', 'error');
        } finally {
            setUploadingPortfolio(false);
        }
    }

    async function pickPortfolioImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadPortfolioImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            showAlert('Error', 'Failed to pick portfolio image. Please try again.', 'error');
        }
    }

    async function deletePortfolioImage(imageId: string, storagePath?: string) {
        try {
            if (!businessId) return;
            await deleteDoc(doc(db, 'businesses', businessId, 'portfolio', imageId));
            if (storagePath) {
                try { await deleteObject(ref(storage, storagePath)); } catch (_) {}
            }
            await loadPortfolioImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            showAlert('Error', 'Failed to delete portfolio image. Please try again.', 'error');
        }
    }

    async function setFeaturedImage(imageId: string) {
        try {
            if (!businessId) return;
            // Unset all featured images first
            const snap = await getDocs(collection(db, 'businesses', businessId, 'portfolio'));
            for (const d of snap.docs) {
                await updateDoc(d.ref, { is_featured: false });
            }
            await updateDoc(doc(db, 'businesses', businessId, 'portfolio', imageId), { is_featured: true });
            await loadPortfolioImages();
        } catch (error) {
            console.error('Error setting featured image:', error);
            showAlert('Error', 'Failed to set featured image. Please try again.', 'error');
        }
    }

    async function pickImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            showAlert('Error', 'Failed to pick profile picture. Please try again.', 'error');
        }
    }

    async function uploadAvatar(uri: string) {
        try {
            setUploading(true);
            if (!user) return;

            const response = await fetch(uri);
            const blob = await response.blob();
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}.${fileExt}`);
            await uploadBytes(storageRef, blob, { contentType: `image/${fileExt}` });
            const publicUrl = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'profiles', user.uid), { avatar_url: publicUrl });
            setAvatarUrl(publicUrl);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showAlert('Error', 'Failed to upload profile picture. Please try again.', 'error');
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true);
            if (!user) return;
            await updateDoc(doc(db, 'profiles', user.uid), { full_name: fullName });
            setEditMode(false);
            showAlert('Success', 'Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error saving profile:', error);
            showAlert('Error', 'Failed to save profile changes. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    }

    const handleSignOut = async () => {
        await signOut(auth);
        router.replace('/');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header showBack={true} backHref="/business/dashboard" backLabel="Dashboard" />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth, width: '100%' }}>
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                            Profile
                        </Text>
                        <Text className="text-neutral-600 mb-8">Manage your profile details.</Text>

                        {loading ? (
                            <View className="items-center py-8">
                                <Text className="text-neutral-500">Loading...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Account Info */}
                                <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <Text className="text-lg font-semibold">Owner Information</Text>
                                        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                                            <Feather name={editMode ? "x" : "edit-2"} size={20} color="#000" />
                                        </TouchableOpacity>
                                    </View>

                                    {editMode ? (
                                        <View>
                                            <View className="mb-4">
                                                <Text className="text-sm font-medium text-neutral-700 mb-2">Email</Text>
                                                <TextInput
                                                    value={user?.email || ''}
                                                    editable={false}
                                                    className="h-14 bg-neutral-200 rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-neutral-500"
                                                />
                                                <Text className="text-xs text-neutral-500 mt-1">Email cannot be changed</Text>
                                            </View>

                                            <View className="mb-4">
                                                <Text className="text-sm font-medium text-neutral-700 mb-2">Full Name</Text>
                                                <TextInput
                                                    value={fullName}
                                                    onChangeText={setFullName}
                                                    placeholder="Enter your full name"
                                                    className="h-14 bg-white rounded-2xl px-4 border border-neutral-200 focus:border-neutral-900"
                                                />
                                            </View>

                                            <View className="mb-4">
                                                <Text className="text-sm text-neutral-600 mb-1">Account Type</Text>
                                                <Text className="text-base text-neutral-900">Business Owner</Text>
                                            </View>

                                            <View className="flex-row gap-3">
                                                <TouchableOpacity
                                                    onPress={() => setEditMode(false)}
                                                    className="flex-1 py-3 rounded-xl bg-neutral-200"
                                                >
                                                    <Text className="text-neutral-900 font-medium text-center">Cancel</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleSave}
                                                    disabled={saving}
                                                    className={`flex-1 py-3 rounded-xl ${saving ? 'bg-neutral-300' : 'bg-black'}`}
                                                >
                                                    <Text className="text-white font-medium text-center">
                                                        {saving ? 'Saving...' : 'Save'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <View>
                                            <Text className="text-sm text-neutral-600 mb-1">Email</Text>
                                            <Text className="text-base text-neutral-900 mb-4">{user?.email}</Text>

                                            <Text className="text-sm text-neutral-600 mb-1">Full Name</Text>
                                            <Text className="text-base text-neutral-900 mb-4">{fullName || 'Not set'}</Text>

                                            <Text className="text-sm text-neutral-600 mb-1">Account Type</Text>
                                            <Text className="text-base text-neutral-900">Business Owner</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Profile Picture Section */}
                                <View className="bg-neutral-50 rounded-2xl p-6 mb-6 items-center">
                                    <Text className="text-lg font-semibold mb-4 self-start">Profile Picture</Text>

                                    <View className="items-center mb-4">
                                        {avatarUrl ? (
                                            <Image
                                                source={{ uri: avatarUrl }}
                                                className="w-32 h-32 rounded-full bg-neutral-200"
                                            />
                                        ) : (
                                            <View className="w-32 h-32 rounded-full bg-neutral-200 items-center justify-center">
                                                <Feather name="user" size={48} color="#737373" />
                                            </View>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        onPress={pickImage}
                                        disabled={uploading}
                                        className={`px-6 py-3 rounded-xl ${uploading ? 'bg-neutral-300' : 'bg-black'}`}
                                    >
                                        <Text className="text-white font-medium">
                                            {uploading ? 'Uploading...' : 'Change Picture'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Sign Out */}
                                <TouchableOpacity
                                    onPress={handleSignOut}
                                    className="bg-black px-8 py-4 rounded-xl"
                                >
                                    <Text className="text-white font-medium text-center text-base">Sign Out</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            <AlertModal
                visible={showAlertModal}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={() => setShowAlertModal(false)}
            />
        </SafeAreaView>
    );
}
