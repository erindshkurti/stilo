import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

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

    useEffect(() => {
        loadProfile();
        loadPortfolioImages();
    }, [user]);

    async function loadProfile() {
        try {
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setFullName(data.full_name || '');
                setAvatarUrl(data.avatar_url);
            }

            // Get business ID
            const { data: business } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (business) {
                setBusinessId(business.id);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadPortfolioImages() {
        try {
            if (!user) return;

            const { data: business } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!business) return;

            const { data: images, error } = await supabase
                .from('business_portfolio_images')
                .select('*')
                .eq('business_id', business.id)
                .order('display_order', { ascending: true });

            if (error) throw error;

            setPortfolioImages(images || []);
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
            const fileName = `${businessId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('stilo.business.portfolio')
                .upload(fileName, blob, {
                    contentType: `image/${fileExt}`,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('stilo.business.portfolio')
                .getPublicUrl(fileName);

            const { error: insertError } = await supabase
                .from('business_portfolio_images')
                .insert({
                    business_id: businessId,
                    image_url: publicUrl,
                    display_order: portfolioImages.length,
                });

            if (insertError) throw insertError;

            await loadPortfolioImages();
        } catch (error) {
            console.error('Error uploading portfolio image:', error);
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploadingPortfolio(false);
        }
    }

    async function pickPortfolioImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadPortfolioImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    }

    async function deletePortfolioImage(imageId: string, imageUrl: string) {
        try {
            const { error } = await supabase
                .from('business_portfolio_images')
                .delete()
                .eq('id', imageId);

            if (error) throw error;

            // Extract file path from URL and delete from storage
            const urlParts = imageUrl.split('stilo.business.portfolio/');
            if (urlParts[1]) {
                await supabase.storage
                    .from('stilo.business.portfolio')
                    .remove([urlParts[1]]);
            }

            await loadPortfolioImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            Alert.alert('Error', 'Failed to delete image');
        }
    }

    async function setFeaturedImage(imageId: string) {
        try {
            if (!businessId) return;

            // Unset all featured images first
            await supabase
                .from('business_portfolio_images')
                .update({ is_featured: false })
                .eq('business_id', businessId);

            // Set the selected image as featured
            const { error } = await supabase
                .from('business_portfolio_images')
                .update({ is_featured: true })
                .eq('id', imageId);

            if (error) throw error;

            await loadPortfolioImages();
        } catch (error) {
            console.error('Error setting featured image:', error);
            Alert.alert('Error', 'Failed to set featured image');
        }
    }

    async function pickImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    }

    async function uploadAvatar(uri: string) {
        try {
            setUploading(true);

            if (!user) return;

            // Convert URI to blob for web, or use file for native
            const response = await fetch(uri);
            const blob = await response.blob();

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('stilo.profile.avatars')
                .upload(fileName, blob, {
                    contentType: `image/${fileExt}`,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('stilo.profile.avatars')
                .getPublicUrl(fileName);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true);

            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id);

            if (error) throw error;

            setEditMode(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth, width: '100%' }}>
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                            Settings
                        </Text>
                        <Text className="text-neutral-600 mb-8">Manage your account and profile</Text>

                        {loading ? (
                            <View className="items-center py-8">
                                <Text className="text-neutral-500">Loading...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Account Info */}
                                <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <Text className="text-lg font-semibold">Account Information</Text>
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
                                                    className="h-14 bg-neutral-200 rounded-2xl px-4 border border-neutral-200 text-neutral-500"
                                                />
                                                <Text className="text-xs text-neutral-500 mt-1">Email cannot be changed</Text>
                                            </View>

                                            <View className="mb-4">
                                                <Text className="text-sm font-medium text-neutral-700 mb-2">Full Name</Text>
                                                <TextInput
                                                    value={fullName}
                                                    onChangeText={setFullName}
                                                    placeholder="Enter your full name"
                                                    className="h-14 bg-white rounded-2xl px-4 border border-neutral-200"
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
        </SafeAreaView>
    );
}
