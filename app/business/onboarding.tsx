import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { BusinessDetailsForm } from '../../components/onboarding/BusinessDetailsForm';
import { BusinessHoursForm, type BusinessHours } from '../../components/onboarding/BusinessHoursForm';
import { LocationForm } from '../../components/onboarding/LocationForm';
import { ServicesForm, type Service } from '../../components/onboarding/ServicesForm';
import { StylistForm, type Stylist } from '../../components/onboarding/StylistForm';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const STEPS = ['Details', 'Location', 'Hours', 'Team', 'Services'];

export default function BusinessOnboardingScreen() {
    const router = useRouter();
    const { step: stepParam } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 600 : width - 48;

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [businessData, setBusinessData] = useState({
        name: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        email: '',
        coverImageUrl: '',
    });

    const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    // Auto-fill business name from user metadata or local storage
    // AND enforce user_type = 'business'
    useEffect(() => {
        async function initializeBusinessUser() {
            let currentName = '';

            // 1. Check/Enforce Business User Type if not already set
            if (user && user.user_metadata?.user_type !== 'business') {
                console.log('[Onboarding] Enforcing business user type...');

                // A. Update Auth Metadata
                const { error } = await supabase.auth.updateUser({
                    data: { user_type: 'business' }
                });

                // B. Update Public Profile (Fixes persistence issues)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ user_type: 'business' })
                    .eq('id', user.id);

                if (error || profileError) console.error('[Onboarding] Failed to update user type:', error || profileError);
                else console.log('[Onboarding] User type enforced to business');
            }

            // 2. Get Business Name from Metadata
            if (user?.user_metadata?.business_name) {
                currentName = user.user_metadata.business_name;
            }

            // 3. Get Business Name from Storage (overrides metadata if present/newer)
            try {
                const savedName = await AsyncStorage.getItem('pending_business_name');
                if (savedName) {
                    currentName = savedName;
                    // Clear it now that we've consumed it
                    await AsyncStorage.removeItem('pending_business_name');
                }
            } catch (e) {
                console.error('[Onboarding] Error reading storage:', e);
            }

            // 4. Update State
            if (currentName) {
                setBusinessData(prev => ({
                    ...prev,
                    name: currentName
                }));
            }
        }

        initializeBusinessUser();
    }, [user]);

    // Set initial step from URL parameter
    useEffect(() => {
        if (stepParam && typeof stepParam === 'string') {
            const step = parseInt(stepParam);
            if (step >= 1 && step <= 5) {
                setCurrentStep(step);
            }
        }
    }, [stepParam]);

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return businessData.name.trim() !== '';
            case 2:
                return businessData.address.trim() !== '' && businessData.city.trim() !== '';
            default:
                return true;
        }
    };

    const handleNext = () => {
        setError(null); // Clear any previous errors

        if (!canProceed()) {
            setError('Please fill in all required fields before continuing.');
            return;
        }

        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setBusinessData(prev => ({ ...prev, [field]: value }));
    };

    async function pickCoverImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                // Store the URI locally, will upload after business creation
                setBusinessData(prev => ({ ...prev, coverImageUrl: result.assets[0].uri }));
            }
        } catch (error) {
            console.error('Error picking cover image:', error);
        }
    }

    async function uploadCoverImageToBusiness(businessId: string, imageUri: string) {
        try {
            const response = await fetch(imageUri);
            const blob = await response.blob();

            const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${businessId}/cover.${fileExt}`;

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

            // Update business with cover image URL
            const { error: updateError } = await supabase
                .from('businesses')
                .update({ cover_image_url: publicUrl })
                .eq('id', businessId);

            if (updateError) throw updateError;

            return publicUrl;
        } catch (error) {
            console.error('Error uploading cover image:', error);
            throw error;
        }
    }

    const handleComplete = async () => {
        setLoading(true);

        try {
            setError(null); // Clear any previous errors

            // Check if user is authenticated
            if (!user) {
                throw new Error('You must be signed in to create a business');
            }

            // Get current session to ensure we're authenticated
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error('Session expired. Please sign in again.');
            }

            console.log('Creating business for user:', user.id);

            // Step 1: Create business
            const { data: business, error: businessError } = await supabase
                .from('businesses')
                .insert([
                    {
                        owner_id: user.id,
                        name: businessData.name,
                        description: businessData.description,
                        address: businessData.address,
                        city: businessData.city,
                        state: businessData.state,
                        zip_code: businessData.zip_code,
                        phone: businessData.phone,
                        email: businessData.email,
                    }
                ])
                .select()
                .single();

            if (businessError) throw businessError;

            console.log('Business created:', business.id);

            // Upload cover image if one was selected
            if (businessData.coverImageUrl && businessData.coverImageUrl.startsWith('file://')) {
                try {
                    await uploadCoverImageToBusiness(business.id, businessData.coverImageUrl);
                    console.log('Cover image uploaded successfully');
                } catch (error) {
                    console.error('Error uploading cover image:', error);
                    // Don't fail the entire onboarding if cover image upload fails
                }
            }

            // Step 2: Create business hours (if any)
            if (businessHours.length > 0) {
                const hoursToInsert = businessHours.map(hour => ({
                    business_id: business.id,
                    day_of_week: hour.day_of_week,
                    open_time: hour.open_time,
                    close_time: hour.close_time,
                    is_closed: hour.is_closed,
                }));

                const { error: hoursError } = await supabase
                    .from('business_hours')
                    .insert(hoursToInsert);

                if (hoursError) console.error('Error creating hours:', hoursError);
            }

            // Step 3: Create stylists (if any)
            if (stylists.length > 0) {
                const stylistsToInsert = stylists.map(stylist => ({
                    business_id: business.id,
                    name: stylist.name,
                    bio: stylist.bio,
                    specialties: stylist.specialties,
                }));

                const { error: stylistsError } = await supabase
                    .from('stylists')
                    .insert(stylistsToInsert);

                if (stylistsError) console.error('Error creating stylists:', stylistsError);
            }

            // Step 4: Create services (if any)
            if (services.length > 0) {
                const servicesToInsert = services.map(service => ({
                    business_id: business.id,
                    name: service.name,
                    description: service.description,
                    duration_minutes: service.duration_minutes,
                    price: service.price,
                    category: service.category,
                }));

                const { error: servicesError } = await supabase
                    .from('services')
                    .insert(servicesToInsert);

                if (servicesError) console.error('Error creating services:', servicesError);
            }

            console.log('Business setup complete!');

            // Redirect to dashboard
            router.replace('/business/dashboard');
        } catch (error: any) {
            console.error('Error creating business:', error);
            setError(error.message || 'Failed to create business. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <BusinessDetailsForm
                        data={{
                            name: businessData.name,
                            description: businessData.description,
                            coverImageUrl: businessData.coverImageUrl,
                        }}
                        onChange={handleFieldChange}
                        onCoverImagePick={pickCoverImage}
                    />
                );
            case 2:
                return (
                    <LocationForm
                        data={{
                            address: businessData.address,
                            city: businessData.city,
                            state: businessData.state,
                            zip_code: businessData.zip_code,
                            phone: businessData.phone,
                            email: businessData.email,
                        }}
                        onChange={handleFieldChange}
                    />
                );
            case 3:
                return (
                    <BusinessHoursForm
                        data={businessHours}
                        onChange={setBusinessHours}
                    />
                );
            case 4:
                return (
                    <StylistForm
                        data={stylists}
                        onChange={setStylists}
                    />
                );
            case 5:
                return (
                    <ServicesForm
                        data={services}
                        onChange={setServices}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ maxWidth: containerMaxWidth, width: '100%', marginHorizontal: 'auto' }}>
                    {/* Header */}
                    <View className="items-center mb-8">
                        <Text className={`font - bold mb - 2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'} `}>
                            Set Up Your Business
                        </Text>
                        <Text className="text-neutral-500 text-center">
                            Step {currentStep} of {STEPS.length}
                        </Text>
                    </View>

                    {/* Progress Indicator */}
                    <ProgressIndicator
                        currentStep={currentStep}
                        totalSteps={STEPS.length}
                        steps={STEPS}
                    />

                    {/* Error Display */}
                    {error && (
                        <View className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                            <View className="flex-row items-center">
                                <Feather name="alert-circle" size={20} color="#dc2626" />
                                <Text className="text-red-600 ml-3 flex-1">{error}</Text>
                            </View>
                        </View>
                    )}

                    {/* Step Content */}
                    <View className="mb-8">
                        {renderStep()}
                    </View>

                    {/* Navigation Buttons */}
                    <View className="flex-row gap-3">
                        {currentStep > 1 && (
                            <Button
                                label="Back"
                                variant="outline"
                                onPress={handleBack}
                                className="flex-1"
                            />
                        )}
                        <Button
                            label={currentStep === STEPS.length ? 'Complete' : 'Next'}
                            onPress={handleNext}
                            loading={loading}
                            className="flex-1"
                        />
                    </View>

                    {/* Skip Option for Optional Steps */}
                    {currentStep >= 4 && (
                        <TouchableOpacity
                            onPress={() => router.replace('/business/dashboard')}
                            className="items-center mt-6"
                        >
                            <Text className="text-neutral-500">
                                Skip for now, I'll add this later
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
