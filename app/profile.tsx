import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { db, storage } from '../lib/firebase';

export default function ProfileScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user, isLoading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Profile fields
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/sign-in?returnTo=/profile');
            return;
        }

        async function fetchProfile() {
            if (!user) return;
            try {
                const docSnap = await getDoc(doc(db, 'profiles', user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    // No more aggressive redirects here - just let the page load or be 
                    // handled by the sign-in/header logic.
                    // If a user is on this page, they probably meant to be.

                    setDisplayName(data.full_name || data.display_name || '');
                    setPhone(data.phone || '');
                    setEmail(data.email || user.email || '');
                    setAvatarUrl(data.avatar_url || user.photoURL || null);
                } else {
                    setEmail(user.email || '');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [user, authLoading]);

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
            if (typeof window !== 'undefined' && window.alert) window.alert('Failed to pick image');
            else Alert.alert('Error', 'Failed to pick image');
        }
    }

    async function uploadAvatar(uri: string) {
        try {
            setUploadingAvatar(true);
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
            if (typeof window !== 'undefined' && window.alert) window.alert('Failed to upload image');
            else Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'profiles', user.uid), {
                full_name: displayName,
                display_name: displayName,
                phone: phone,
            }, { merge: true });
            
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            if (typeof window !== 'undefined' && window.alert) {
                window.alert('Failed to update profile');
            } else {
                Alert.alert('Error', 'Failed to update profile');
            }
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || loading) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <Header />
                <View className="flex-1 items-center justify-center">
                    <Text className="text-neutral-500">Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-4xl' : 'text-3xl'}`}>
                            Profile
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Update your personal information
                        </Text>

                        {showSuccess && (
                            <View className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex-row items-center">
                                <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-3">
                                    <Feather name="check" size={16} color="white" />
                                </View>
                                <Text className="text-emerald-900 font-medium">Profile updated successfully!</Text>
                            </View>
                        )}

                        {/* Avatar Upload */}
                        <View className="items-center mb-8">
                            <TouchableOpacity 
                                onPress={pickImage} 
                                disabled={uploadingAvatar}
                                className="relative"
                            >
                                <View className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 mb-2 border-2 border-neutral-100 items-center justify-center">
                                    {uploadingAvatar ? (
                                        <ActivityIndicator color="#000" />
                                    ) : avatarUrl ? (
                                        <Image
                                            source={{ uri: avatarUrl }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Feather name="user" size={40} color="#9ca3af" />
                                    )}
                                </View>
                                <View className="absolute bottom-2 right-0 bg-black w-8 h-8 rounded-full items-center justify-center border-2 border-white pointer-events-none">
                                    <Feather name="camera" size={14} color="white" />
                                </View>
                            </TouchableOpacity>
                            <Text className="text-neutral-500 text-sm mt-2">Tap to change profile picture</Text>
                        </View>

                        <View className="space-y-6">
                            <View>
                                <Text className="font-semibold text-neutral-900 mb-2 px-1">Email</Text>
                                <TextInput
                                    value={email}
                                    editable={false}
                                    className="h-14 bg-neutral-100 rounded-2xl px-4 border border-neutral-200 text-neutral-500 text-base"
                                />
                                <Text className="text-neutral-500 text-xs mt-2 px-1">Email cannot be changed natively at this time.</Text>
                            </View>

                            <View>
                                <Text className="font-semibold text-neutral-900 mb-2 px-1">Full Name</Text>
                                <TextInput
                                    placeholder="Enter your full name"
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-black text-base"
                                />
                            </View>

                            <View>
                                <Text className="font-semibold text-neutral-900 mb-2 px-1">Phone Number</Text>
                                <TextInput
                                    placeholder="Enter your phone number"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-black text-base"
                                />
                            </View>

                            <View className="mt-4">
                                <Button
                                    label="Save Profile"
                                    loading={saving}
                                    onPress={handleSave}
                                    className="w-full"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
