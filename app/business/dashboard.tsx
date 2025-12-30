import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function BusinessDashboard() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const router = useRouter();
    const params = useLocalSearchParams();

    // Banner State
    const [showWarning, setShowWarning] = useState(false);

    const [business, setBusiness] = useState<any>(null);
    const [hours, setHours] = useState<any[]>([]);
    const [stylists, setStylists] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [loading, setLoading] = useState(true);

    const isLargeScreen = width > 1024;
    const isMediumScreen = width > 768;

    // Check for warning param
    useEffect(() => {
        if (params.warning === 'duplicate_business') {
            setShowWarning(true);
        }
    }, [params.warning]);

    // Reload data when page comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                loadBusinessData();
            }
        }, [user])
    );

    async function loadBusinessData() {
        try {
            // Load business
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user?.id)
                .single();

            if (businessError && businessError.code !== 'PGRST116') {
                console.error('Error loading business:', businessError);
            } else if (businessData) {
                setBusiness(businessData);

                // Load business hours
                const { data: hoursData } = await supabase
                    .from('business_hours')
                    .select('*')
                    .eq('business_id', businessData.id)
                    .order('day_of_week');

                if (hoursData) setHours(hoursData);

                // Load stylists
                const { data: stylistsData } = await supabase
                    .from('stylists')
                    .select('*')
                    .eq('business_id', businessData.id);

                if (stylistsData) setStylists(stylistsData);

                // Load services
                const { data: servicesData } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', businessData.id);

                if (servicesData) setServices(servicesData);

                // Load portfolio images
                const { data: portfolioData } = await supabase
                    .from('business_portfolio_images')
                    .select('*')
                    .eq('business_id', businessData.id)
                    .order('display_order', { ascending: true });

                if (portfolioData) setPortfolioImages(portfolioData);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
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
        }
    }

    async function uploadPortfolioImage(uri: string) {
        try {
            setUploadingPortfolio(true);

            if (!user || !business?.id) return;

            const response = await fetch(uri);
            const blob = await response.blob();

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${business.id}/${Date.now()}.${fileExt}`;

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
                    business_id: business.id,
                    image_url: publicUrl,
                    display_order: portfolioImages.length,
                });

            if (insertError) throw insertError;

            await loadBusinessData();
        } catch (error) {
            console.error('Error uploading portfolio image:', error);
        } finally {
            setUploadingPortfolio(false);
        }
    }

    async function deletePortfolioImage(imageId: string, imageUrl: string) {
        try {
            const { error } = await supabase
                .from('business_portfolio_images')
                .delete()
                .eq('id', imageId);

            if (error) throw error;

            const urlParts = imageUrl.split('stilo.business.portfolio/');
            if (urlParts[1]) {
                await supabase.storage
                    .from('stilo.business.portfolio')
                    .remove([urlParts[1]]);
            }

            await loadBusinessData();
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    }

    async function setFeaturedImage(imageId: string) {
        try {
            if (!business?.id) return;

            await supabase
                .from('business_portfolio_images')
                .update({ is_featured: false })
                .eq('business_id', business.id);

            const { error } = await supabase
                .from('business_portfolio_images')
                .update({ is_featured: true })
                .eq('id', imageId);

            if (error) throw error;

            await loadBusinessData();
        } catch (error) {
            console.error('Error setting featured image:', error);
        }
    }

    async function pickCoverImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadCoverImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking cover image:', error);
        }
    }

    async function uploadCoverImage(uri: string) {
        try {
            setUploadingCover(true);

            if (!user || !business?.id) return;

            const response = await fetch(uri);
            const blob = await response.blob();

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${business.id}/cover.${fileExt}`;

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

            const { error: updateError } = await supabase
                .from('businesses')
                .update({ cover_image_url: publicUrl })
                .eq('id', business.id);

            if (updateError) throw updateError;

            await loadBusinessData();
        } catch (error) {
            console.error('Error uploading cover image:', error);
        } finally {
            setUploadingCover(false);
        }
    }

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            {/* Warning Banner */}
            {showWarning && (
                <View className="bg-yellow-50 border-b border-yellow-200 px-6 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-4 justify-center">
                        <Feather name="alert-triangle" size={20} color="#eab308" />
                        <Text className="ml-3 text-yellow-800 text-sm font-medium text-center">
                            An email address can be associated with only one business at this time. [Temp restriction via code]
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowWarning(false)}>
                        <Feather name="x" size={20} color="#ca8a04" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView className="flex-1">
                <View className="py-8 mx-auto w-full" style={{ maxWidth: 1200 }}>
                    {/* Welcome Section */}
                    <View className="mb-8">
                        <Text className="text-3xl font-bold mb-2">
                            {business ? `Welcome back, ${business.name}!` : 'Business Dashboard'}
                        </Text>
                        <Text className="text-neutral-600">
                            Manage your business and bookings
                        </Text>
                    </View>

                    {loading ? (
                        <View className="items-center py-12">
                            <Text className="text-neutral-500">Loading your business...</Text>
                        </View>
                    ) : business ? (
                        <>
                            {/* Desktop: 2-column layout, Mobile: single column */}
                            <View className={isLargeScreen ? 'flex-row gap-6' : undefined}>
                                {/* Left Column */}
                                <View className={isLargeScreen ? 'flex-1' : undefined}>
                                    {/* Business Overview */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-semibold">Business Overview</Text>
                                            <TouchableOpacity
                                                onPress={() => router.push('/business/edit/details')}
                                                className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                            >
                                                <Feather name="edit-2" size={14} color="#737373" />
                                            </TouchableOpacity>
                                        </View>
                                        <View>
                                            <View className="flex-row items-center mb-3">
                                                <Feather name="map-pin" size={18} color="#737373" />
                                                <Text className="ml-3 text-neutral-700">
                                                    {business.address}, {business.city}
                                                </Text>
                                            </View>
                                            {business.phone && (
                                                <View className="flex-row items-center mb-3">
                                                    <Feather name="phone" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-700">{business.phone}</Text>
                                                </View>
                                            )}
                                            {business.email && (
                                                <View className="flex-row items-center">
                                                    <Feather name="mail" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-700">{business.email}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Business Hours */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-semibold">Business Hours</Text>
                                            <TouchableOpacity
                                                onPress={() => router.push('/business/edit/hours')}
                                                className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                            >
                                                <Feather name="edit-2" size={14} color="#737373" />
                                            </TouchableOpacity>
                                        </View>
                                        {hours.length > 0 ? (
                                            <>
                                                {hours.map((hour) => (
                                                    <View key={hour.id} className="flex-row justify-between mb-2">
                                                        <Text className="text-neutral-700 font-medium">{DAYS[hour.day_of_week]}</Text>
                                                        <Text className="text-neutral-600">
                                                            {hour.is_closed ? 'Closed' : `${hour.open_time} - ${hour.close_time}`}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </>
                                        ) : (
                                            <View className="py-4 items-center">
                                                <Text className="text-neutral-500">No business hours set</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Team Members */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-semibold">Team Members ({stylists.length})</Text>
                                            <TouchableOpacity
                                                onPress={() => router.push('/business/edit/team')}
                                                className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                            >
                                                <Feather name="edit-2" size={14} color="#737373" />
                                            </TouchableOpacity>
                                        </View>
                                        {stylists.length > 0 ? (
                                            <View className="flex-row flex-wrap gap-2">
                                                {stylists.map((stylist) => (
                                                    <View key={stylist.id} className="bg-white border border-neutral-200 rounded-full px-4 py-2">
                                                        <Text className="font-medium text-neutral-900">{stylist.name}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <View className="py-4 items-center">
                                                <Text className="text-neutral-500">No team members added yet</Text>
                                            </View>
                                        )}
                                    </View>


                                    {/* Services */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-semibold">Services ({services.length})</Text>
                                            <TouchableOpacity
                                                onPress={() => router.push('/business/edit/services')}
                                                className="w-8 h-8 bg-white rounded-full items-center justify-center border border-neutral-200"
                                            >
                                                <Feather name="edit-2" size={14} color="#737373" />
                                            </TouchableOpacity>
                                        </View>
                                        {services.length > 0 ? (
                                            <>
                                                {services.map((service) => (
                                                    <View key={service.id} className="flex-row justify-between items-center mb-3">
                                                        <View className="flex-1">
                                                            <Text className="font-semibold text-neutral-900">{service.name}</Text>
                                                            <Text className="text-sm text-neutral-600">{service.duration_minutes} min</Text>
                                                        </View>
                                                        <Text className="font-semibold text-lg">${service.price}</Text>
                                                    </View>
                                                ))}
                                            </>
                                        ) : (
                                            <View className="py-4 items-center">
                                                <Text className="text-neutral-500">No services added yet</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Right Column */}
                                <View className={isLargeScreen ? 'flex-1' : undefined}>
                                    {/* Stats */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <Text className="text-lg font-semibold mb-4">This Week</Text>
                                        <View className="flex-row justify-between">
                                            <View>
                                                <Text className="text-2xl font-bold">0</Text>
                                                <Text className="text-neutral-600 text-sm">Bookings</Text>
                                            </View>
                                            <View>
                                                <Text className="text-2xl font-bold">0</Text>
                                                <Text className="text-neutral-600 text-sm">New Clients</Text>
                                            </View>
                                            <View>
                                                <Text className="text-2xl font-bold">$0</Text>
                                                <Text className="text-neutral-600 text-sm">Revenue</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Cover Image */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <Text className="text-lg font-semibold mb-4">Cover Image</Text>
                                        <Text className="text-sm text-neutral-600 mb-4">
                                            Upload a cover image for your business profile (16:9 aspect ratio recommended).
                                        </Text>

                                        {business?.cover_image_url ? (
                                            <View className="mb-4">
                                                <Image
                                                    source={{ uri: business.cover_image_url }}
                                                    style={{
                                                        width: '100%',
                                                        height: isLargeScreen ? 200 : 150,
                                                        borderRadius: 12
                                                    }}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        ) : (
                                            <View className="bg-white rounded-xl p-8 mb-4 items-center" style={{ height: isLargeScreen ? 200 : 150, justifyContent: 'center' }}>
                                                <Feather name="image" size={48} color="#d4d4d4" />
                                                <Text className="text-neutral-500 mt-2">No cover image</Text>
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            onPress={pickCoverImage}
                                            disabled={uploadingCover}
                                            className={`py-4 rounded-xl ${uploadingCover ? 'bg-neutral-300' : 'bg-black'}`}
                                        >
                                            <Text className="text-white font-medium text-center">
                                                {uploadingCover ? 'Uploading...' : business?.cover_image_url ? 'Update Cover Image' : 'Upload Cover Image'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Portfolio Gallery */}
                                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                                        <Text className="text-lg font-semibold mb-4">Portfolio Gallery</Text>
                                        <Text className="text-sm text-neutral-600 mb-4">
                                            Showcase your work. Select one image as featured to display on your business profile.
                                        </Text>

                                        {portfolioImages.length > 0 ? (
                                            <View className="mb-4">
                                                <View className="flex-row flex-wrap gap-3">
                                                    {portfolioImages.map((image) => (
                                                        <View
                                                            key={image.id}
                                                            className="relative"
                                                            style={{
                                                                width: isLargeScreen ? '30%' : '45%',
                                                                aspectRatio: 4 / 3
                                                            }}
                                                        >
                                                            <Image
                                                                source={{ uri: image.image_url }}
                                                                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                                            />

                                                            {/* Featured Badge */}
                                                            {image.is_featured && (
                                                                <View className="absolute top-2 left-2 bg-black px-2 py-1 rounded-lg flex-row items-center">
                                                                    <Feather name="star" size={12} color="#FFD700" />
                                                                    <Text className="text-white text-xs ml-1 font-medium">Featured</Text>
                                                                </View>
                                                            )}

                                                            {/* Action Buttons */}
                                                            <View className="absolute top-2 right-2 flex-row gap-1">
                                                                {!image.is_featured && (
                                                                    <TouchableOpacity
                                                                        onPress={() => setFeaturedImage(image.id)}
                                                                        className="bg-white p-2 rounded-lg"
                                                                        style={{ opacity: 0.9 }}
                                                                    >
                                                                        <Feather name="star" size={16} color="#000" />
                                                                    </TouchableOpacity>
                                                                )}
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        if (typeof window !== 'undefined' && window.confirm) {
                                                                            if (window.confirm('Are you sure you want to delete this image?')) {
                                                                                deletePortfolioImage(image.id, image.image_url);
                                                                            }
                                                                        } else {
                                                                            deletePortfolioImage(image.id, image.image_url);
                                                                        }
                                                                    }}
                                                                    className="bg-white p-2 rounded-lg"
                                                                    style={{ opacity: 0.9 }}
                                                                >
                                                                    <Feather name="trash-2" size={16} color="#ef4444" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="bg-white rounded-xl p-8 mb-4 items-center">
                                                <Feather name="image" size={48} color="#d4d4d4" />
                                                <Text className="text-neutral-500 mt-2">No portfolio images yet</Text>
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            onPress={pickPortfolioImage}
                                            disabled={uploadingPortfolio}
                                            className={`py-4 rounded-xl ${uploadingPortfolio ? 'bg-neutral-300' : 'bg-black'}`}
                                        >
                                            <Text className="text-white font-medium text-center">
                                                {uploadingPortfolio ? 'Uploading...' : 'Add Image'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View className="items-center py-12">
                            <Text className="text-neutral-500 text-center mb-4">
                                No business found
                            </Text>
                            <Text className="text-neutral-400 text-sm text-center">
                                Complete your business onboarding to get started
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
