import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
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
import { db, storage } from '../../lib/firebase';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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

    // Validated Team Member Logic
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [currentStylistInput, setCurrentStylistInput] = useState<Stylist>({
        name: '',
        bio: '',
        specialties: [],
    });

    // Validated Services Logic (Step 5)
    const [services, setServices] = useState<Service[]>([]);
    const [currentServiceInput, setCurrentServiceInput] = useState<Service>({
        name: '',
        description: '',
        duration_minutes: 60,
        price: 0,
        category: 'Haircut',
    });

    // Auto-fill business name from local storage
    useEffect(() => {
        async function initializeBusinessUser() {
            // Update Firestore profile to mark as business type
            if (user) {
                try {
                    const { getDoc, setDoc } = await import('firebase/firestore');
                    const profileRef = doc(db, 'profiles', user.uid);
                    const profileSnap = await getDoc(profileRef);
                    if (!profileSnap.exists() || profileSnap.data()?.user_type !== 'business') {
                        await setDoc(profileRef, { user_type: 'business' }, { merge: true });
                        console.log('[Onboarding] Set profile user_type to business');
                    }
                } catch (e) {
                    console.error('[Onboarding] Failed to update profile:', e);
                }
            }

            // Get Business Name from Storage
            try {
                const savedName = await AsyncStorage.getItem('pending_business_name');
                if (savedName) {
                    setBusinessData(prev => ({ ...prev, name: savedName }));
                    await AsyncStorage.removeItem('pending_business_name');
                }
            } catch (e) {
                console.error('[Onboarding] Error reading storage:', e);
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
            case 4: // Team Step
                // Prevent proceeding if they have typed a name but not added it
                if (currentStylistInput.name.trim() !== '') {
                    return false;
                }
                return true;
            case 5: // Services Step
                // Prevent proceeding if they have typed a service name but not added it
                if (currentServiceInput.name.trim() !== '') {
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        setError(null); // Clear any previous errors

        if (!canProceed()) {
            if (currentStep === 4 && currentStylistInput.name.trim() !== '') {
                setError('Please click "Add Team Member" to save the details or clear the name field before continuing.');
            } else if (currentStep === 5 && currentServiceInput.name.trim() !== '') {
                setError('Please click "Add Service" to save the details or clear the service name field before continuing.');
            } else {
                setError('Please fill in all required fields before continuing.');
            }
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
                mediaTypes: ['images'],
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

    async function uploadCoverImageToBusiness(businessId: string, imageUri: string): Promise<string> {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const storageRef = ref(storage, `businesses/${businessId}/cover.${fileExt}`);
        await uploadBytes(storageRef, blob, { contentType: `image/${fileExt}` });
        const publicUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, 'businesses', businessId), { cover_image_url: publicUrl });
        return publicUrl;
    }

    const handleComplete = async () => {
        setLoading(true);

        try {
            setError(null);

            if (!user) {
                throw new Error('You must be signed in to create a business');
            }

            console.log('Creating business for user:', user.uid);

            // Step 1: Create business document in Firestore
            const businessRef = await addDoc(collection(db, 'businesses'), {
                owner_id: user.uid,
                name: businessData.name,
                description: businessData.description,
                address: businessData.address,
                city: businessData.city,
                state: businessData.state,
                zip_code: businessData.zip_code,
                phone: businessData.phone,
                email: businessData.email,
                is_featured: false,
                rating: 0,
                review_count: 0,
                created_at: new Date().toISOString(),
            });

            const businessId = businessRef.id;
            console.log('Business created:', businessId);

            // Upload cover image if selected
            if (businessData.coverImageUrl) {
                try {
                    await uploadCoverImageToBusiness(businessId, businessData.coverImageUrl);
                    console.log('Cover image uploaded successfully');
                } catch (err) {
                    console.error('Cover image upload failed:', err);
                    alert('Business created, but cover image upload failed. You can update it later.');
                }
            }

            // Step 2: Create business hours subcollection
            if (businessHours.length > 0) {
                const hoursCol = collection(db, 'businesses', businessId, 'hours');
                for (const hour of businessHours) {
                    await addDoc(hoursCol, {
                        day_of_week: hour.day_of_week,
                        open_time: hour.open_time,
                        close_time: hour.close_time,
                        is_closed: hour.is_closed,
                    });
                }
            }

            // Step 3: Create stylists subcollection
            if (stylists.length > 0) {
                const stylistsCol = collection(db, 'businesses', businessId, 'stylists');
                for (const stylist of stylists) {
                    await addDoc(stylistsCol, {
                        name: stylist.name,
                        bio: stylist.bio,
                        specialties: stylist.specialties,
                    });
                }
            }

            // Step 4: Create services subcollection
            if (services.length > 0) {
                const servicesCol = collection(db, 'businesses', businessId, 'services');
                for (const service of services) {
                    await addDoc(servicesCol, {
                        name: service.name,
                        description: service.description,
                        duration_minutes: service.duration_minutes,
                        price: service.price,
                        category: service.category,
                    });
                }
            }

            console.log('Business setup complete!');
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
                        currentStylist={currentStylistInput}
                        onCurrentStylistChange={setCurrentStylistInput}
                    />
                );
            case 5:
                return (
                    <ServicesForm
                        data={services}
                        onChange={setServices}
                        currentService={currentServiceInput}
                        onCurrentServiceChange={setCurrentServiceInput}
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
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
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
                            disabled={!canProceed()} // Visually disable the button as well
                        />
                    </View>


                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
