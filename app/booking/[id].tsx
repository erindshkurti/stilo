import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

// Types
type Step = 1 | 2 | 3 | 4 | 5;

interface Service {
    id: string;
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
}

interface Stylist {
    id: string;
    name: string;
    avatar_url: string | null;
    specialties: string[] | null;
}

interface BusinessHour {
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
}

export default function BookingScreen() {
    const { id: businessId } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 1024;
    const { user } = useAuth();

    // State
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [businessName, setBusinessName] = useState('');
    const [services, setServices] = useState<Service[]>([]);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [hours, setHours] = useState<BusinessHour[]>([]);

    // Selection
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<Stylist | 'any' | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Initial Fetch
    useEffect(() => {
        if (!businessId) return;

        async function fetchData() {
            try {
                // Fetch Business Name
                const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
                if (biz) setBusinessName(biz.name);

                // Fetch Services
                const { data: servicesData } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', businessId)
                    .eq('is_active', true)
                    .order('price');
                if (servicesData) setServices(servicesData);

                // Fetch Stylists
                const { data: stylistsData } = await supabase
                    .from('stylists')
                    .select('*')
                    .eq('business_id', businessId)
                    .eq('is_active', true);
                if (stylistsData) setStylists(stylistsData);

                // Fetch Hours
                const { data: hoursData } = await supabase
                    .from('business_hours')
                    .select('*')
                    .eq('business_id', businessId);
                if (hoursData) setHours(hoursData);

            } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to load booking data');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [businessId]);

    // Restore state from URL params (e.g. after return from sign-in)
    // We decode params manually if needed, but expo-router does most of it
    const { restore, sId, stId, d, t } = useLocalSearchParams<{ restore: string; sId: string; stId: string; d: string; t: string }>();

    useEffect(() => {
        if (restore && !loading && services.length > 0 && stylists.length > 0) {
            console.log('Restoring booking state...', { sId, stId, d, t });

            // Restore Service
            if (sId) {
                const serviceToRestore = services.find(s => s.id === sId);
                if (serviceToRestore) setSelectedService(serviceToRestore);
            }

            // Restore Stylist
            if (stId) {
                if (stId === 'any') {
                    setSelectedStylist('any');
                } else {
                    const stylistToRestore = stylists.find(s => s.id === stId);
                    if (stylistToRestore) setSelectedStylist(stylistToRestore);
                }
            }

            // Restore Date & Time
            if (d) {
                const dateToRestore = new Date(d);
                if (!isNaN(dateToRestore.getTime())) setSelectedDate(dateToRestore);
            }
            if (t) setSelectedTime(t);

            // Jump to Review Step if we have everything
            if (sId && stId && d && t) {
                setStep(4);
            }
        }
    }, [restore, loading, services, stylists, sId, stId, d, t]);

    // Generate dates (Next 14 days)
    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    // Calculate Available Slots when Date/Stylist/Service changes
    useEffect(() => {
        if (selectedDate && selectedService && selectedStylist) {
            // Only calculate availability if we are on step 3 OR if we are restoring (step=4)
            // Actually, if we are restoring to step 4, we don't strictly *need* to re-fetch slots right away 
            // unless we want to validate the slot is still free. 
            // For now, let's allow it to calculate to populate data, but assume it's valid if restored.
            calculateAvailability();
        }
    }, [selectedDate, selectedService, selectedStylist]);

    async function calculateAvailability() {
        if (!selectedDate || !businessId || !selectedService) return;

        setSlotsLoading(true);
        setAvailableSlots([]);

        // Only clear time if we are NOT restoring/it matches existing
        // setSelectedTime(null); // Removed to prevent clearing restored time

        try {
            const dayOfWeek = selectedDate.getDay();
            const businessHour = hours.find(h => h.day_of_week === dayOfWeek);

            // 1. Check if closed
            if (!businessHour || businessHour.is_closed || !businessHour.open_time || !businessHour.close_time) {
                setAvailableSlots([]);
                setSlotsLoading(false);
                return;
            }

            // 2. Fetch existing bookings for that date
            // Start of day
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            let query = supabase
                .from('bookings')
                .select('start_time, end_time, stylist_id')
                .eq('business_id', businessId)
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .neq('status', 'cancelled'); // Don't count cancelled

            // If a specific stylist is selected, filter by them.
            // If "Any", we calculate capacity based on TOTAL stylists vs concurrent bookings.
            if (selectedStylist && selectedStylist !== 'any') {
                query = query.eq('stylist_id', selectedStylist.id);
            }

            const { data: bookings } = await query;
            const existingBookings = bookings || [];

            // 3. Generate Time Slots
            const slots: string[] = [];
            const [openHour, openMinute] = businessHour.open_time.split(':').map(Number);
            const [closeHour, closeMinute] = businessHour.close_time.split(':').map(Number);

            let current = new Date(selectedDate);
            current.setHours(openHour, openMinute, 0, 0);

            const closeTime = new Date(selectedDate);
            closeTime.setHours(closeHour, closeMinute, 0, 0);

            // Duration in ms
            const durationMs = selectedService.duration_minutes * 60000;

            const totalStylistsCount = stylists.length;

            while (current.getTime() + durationMs <= closeTime.getTime()) {
                const slotStart = new Date(current);
                const slotEnd = new Date(current.getTime() + durationMs);

                // Check collision
                let isBusy = false;

                if (selectedStylist !== 'any') {
                    // Specific stylist: Busy if ANY of their bookings overlap
                    isBusy = existingBookings.some(booking => {
                        const bStart = new Date(booking.start_time);
                        const bEnd = new Date(booking.end_time);
                        return slotStart < bEnd && slotEnd > bStart;
                    });
                } else {
                    // "Any" stylist: Busy only if CONCURRENT overlapping bookings >= TOTAL stylists
                    // We count how many bookings overlap this specific slot
                    const concurrentBookings = existingBookings.filter(booking => {
                        const bStart = new Date(booking.start_time);
                        const bEnd = new Date(booking.end_time);
                        return slotStart < bEnd && slotEnd > bStart;
                    }).length;

                    isBusy = concurrentBookings >= totalStylistsCount;
                }

                // Also check if slot is in the past (for today)
                const now = new Date();
                const isPast = slotStart < now;

                if (!isBusy && !isPast) {
                    slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
                }

                // Increment by 30 mins (could be service duration or fixed interval)
                current.setMinutes(current.getMinutes() + 30);
            }

            setAvailableSlots(slots);

        } catch (error) {
            console.error('Availability calc error', error);
        } finally {
            setSlotsLoading(false);
        }
    }

    async function handleBook() {
        console.log('Attempting to book...');
        if (!selectedService || !selectedDate || !selectedTime) {
            Alert.alert('Missing Info', 'Please complete all steps.');
            return;
        }
        setSubmitting(true);

        try {
            // Get user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.log('Auth check failed (unexpected in handleBook)');
                return;
            }

            console.log('User ID:', user.id);

            // Construct timestamps
            const startTimeDate = new Date(selectedDate);
            // Parse time string '10:30 AM' back to hours/minutes
            const [timePart, modifier] = selectedTime.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            startTimeDate.setHours(hours, minutes, 0, 0);

            const endTimeDate = new Date(startTimeDate.getTime() + selectedService.duration_minutes * 60000);

            let finalStylistId = selectedStylist === 'any' ? null : selectedStylist?.id;

            const payload = {
                business_id: businessId,
                customer_id: user.id,
                service_id: selectedService.id,
                stylist_id: finalStylistId,
                start_time: startTimeDate.toISOString(),
                end_time: endTimeDate.toISOString(),
                status: 'confirmed'
            };
            console.log('Booking Payload:', JSON.stringify(payload, null, 2));

            const { data, error } = await supabase.from('bookings').insert(payload).select();

            if (error) {
                console.error('Supabase Insert Error:', error);
                throw error;
            }

            console.log('Booking Success:', data);
            setStep(5);

        } catch (error: any) {
            Alert.alert('Booking Error', error.message || 'An unknown error occurred.');
            console.error('Full Error:', error);
        } finally {
            setSubmitting(false);
        }
    }

    // Step Renders

    const renderStep1_Services = () => (
        <ScrollView className="flex-1 px-6 pt-4">
            <Text className="text-xl font-bold mb-4">Select Service</Text>
            {services.map(service => (
                <TouchableOpacity
                    key={service.id}
                    onPress={() => setSelectedService(service)}
                    className={`flex-row justify-between items-center p-4 mb-3 rounded-xl border ${selectedService?.id === service.id
                        ? 'bg-neutral-900 border-neutral-900'
                        : 'bg-white border-neutral-200'
                        }`}
                >
                    <View className="flex-1">
                        <Text className={`font-semibold text-lg ${selectedService?.id === service.id ? 'text-white' : 'text-neutral-900'}`}>{service.name}</Text>
                        <Text className={`${selectedService?.id === service.id ? 'text-neutral-400' : 'text-neutral-500'} mt-1`}>{service.duration_minutes} min</Text>
                    </View>
                    <Text className={`font-bold text-lg ${selectedService?.id === service.id ? 'text-white' : 'text-neutral-900'}`}>${service.price}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderStep2_Stylists = () => (
        <ScrollView className="flex-1 px-6 pt-4">
            <Text className="text-xl font-bold mb-4">Select Professional</Text>

            {/* Any Professional Option */}
            <TouchableOpacity
                onPress={() => setSelectedStylist('any')}
                className={`flex-row items-center p-4 mb-3 rounded-xl border ${selectedStylist === 'any'
                    ? 'bg-neutral-900 border-neutral-900'
                    : 'bg-white border-neutral-200'
                    }`}
            >
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${selectedStylist === 'any' ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
                    <Feather name="users" size={20} color={selectedStylist === 'any' ? 'white' : 'black'} />
                </View>
                <Text className={`font-semibold text-lg ${selectedStylist === 'any' ? 'text-white' : 'text-neutral-900'}`}>Any Professional</Text>
            </TouchableOpacity>

            {/* Specific Stylists */}
            {stylists.map(stylist => (
                <TouchableOpacity
                    key={stylist.id}
                    onPress={() => setSelectedStylist(stylist)}
                    className={`flex-row items-center p-4 mb-3 rounded-xl border ${selectedStylist !== 'any' && selectedStylist?.id === stylist.id
                        ? 'bg-neutral-900 border-neutral-900'
                        : 'bg-white border-neutral-200'
                        }`}
                >
                    <View className="w-12 h-12 rounded-full bg-neutral-100 mr-4 overflow-hidden border border-neutral-100">
                        {stylist.avatar_url ? (
                            <Image source={{ uri: stylist.avatar_url }} className="w-full h-full" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-neutral-200">
                                <Feather name="user" size={20} color="#a3a3a3" />
                            </View>
                        )}
                    </View>
                    <Text className={`font-semibold text-lg ${selectedStylist !== 'any' && selectedStylist?.id === stylist.id ? 'text-white' : 'text-neutral-900'}`}>{stylist.name}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderStep3_DateTime = () => (
        <View className="flex-1 pt-4">
            <Text className="text-xl font-bold mb-4 px-6">Select Date & Time</Text>

            {/* Date Scroller */}
            <View className="h-24 mb-6">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
                    {dates.map((date, index) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = date.getDate();
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => { setSelectedDate(date); setSelectedTime(null); }}
                                className={`items-center justify-center w-16 h-20 rounded-2xl border ${isSelected ? 'bg-black border-black' : 'bg-white border-neutral-200'
                                    }`}
                            >
                                <Text className={`text-xs mb-1 ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>{dayName}</Text>
                                <Text className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-neutral-900'}`}>{dayNum}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Time Slots */}
            <ScrollView className="flex-1 px-6">
                {!selectedDate ? (
                    <Text className="text-neutral-500 text-center mt-10">Please select a date first.</Text>
                ) : slotsLoading ? (
                    <ActivityIndicator size="large" color="#000" className="mt-10" />
                ) : availableSlots.length === 0 ? (
                    <Text className="text-neutral-500 text-center mt-10">No available slots for this date.</Text>
                ) : (
                    <View className="flex-row flex-wrap gap-3 pb-8">
                        {availableSlots.map(slot => (
                            <TouchableOpacity
                                key={slot}
                                onPress={() => setSelectedTime(slot)}
                                className={`px-4 py-3 rounded-xl border ${selectedTime === slot ? 'bg-black border-black' : 'bg-white border-neutral-200'
                                    }`}
                                style={{ width: '30%' }}
                            >
                                <Text className={`text-center font-medium ${selectedTime === slot ? 'text-white' : 'text-neutral-900'}`}>{slot}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );

    const renderStep4_Confirm = () => (
        <ScrollView className="flex-1 px-6 pt-4">
            <Text className="text-xl font-bold mb-6">Review Booking</Text>

            <View className="bg-white p-6 rounded-2xl border border-neutral-200 mb-6">
                <View className="mb-4">
                    <Text className="text-neutral-500 text-sm mb-1">Service</Text>
                    <Text className="text-lg font-bold text-neutral-900">{selectedService?.name}</Text>
                    <Text className="text-neutral-600">${selectedService?.price} • {selectedService?.duration_minutes} min</Text>
                </View>

                <View className="h-[1px] bg-neutral-100 my-2" />

                <View className="mb-4 pt-2">
                    <Text className="text-neutral-500 text-sm mb-1">Professional</Text>
                    <Text className="text-lg font-bold text-neutral-900">
                        {selectedStylist === 'any' ? 'Any Professional' : selectedStylist?.name}
                    </Text>
                </View>

                <View className="h-[1px] bg-neutral-100 my-2" />

                <View className="pt-2">
                    <Text className="text-neutral-500 text-sm mb-1">Date & Time</Text>
                    <Text className="text-lg font-bold text-neutral-900">
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text className="text-lg text-neutral-900">{selectedTime}</Text>
                </View>
            </View>

            <View className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex-row items-center mb-8">
                <Feather name="info" size={20} color="#525252" />
                <Text className="ml-3 text-neutral-600 flex-1 leading-5">
                    No payment required now. You will pay at the salon after your appointment.
                </Text>
            </View>
        </ScrollView>
    );

    const renderStep5_Success = () => (
        <View className="flex-1 px-6 items-center justify-center -mt-20">
            <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                <Feather name="check" size={48} color="#16a34a" />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 mb-2 text-center">Booking Confirmed!</Text>
            <Text className="text-neutral-500 text-center mb-8 leading-6">
                Your appointment has been successfully scheduled.
            </Text>

            <View className="w-full bg-neutral-50 p-6 rounded-2xl border border-neutral-100 mb-8">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-neutral-500">Service</Text>
                    <Text className="font-semibold text-neutral-900">{selectedService?.name}</Text>
                </View>

                <View className="flex-row justify-between mb-2">
                    <Text className="text-neutral-500">Date</Text>
                    <Text className="font-semibold text-neutral-900">
                        {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {selectedTime}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={() => router.push('/profile')}
                className="w-full bg-black py-4 rounded-xl items-center mb-4"
            >
                <Text className="text-white font-bold text-lg">View My Appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.replace(`/business/${businessId}`)}
                className="py-4"
            >
                <Text className="text-neutral-900 font-semibold">Done</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#000" /></View>;

    return (
        <View className="flex-1 bg-white items-center">
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ width: '100%', maxWidth: 1200 }} className="flex-1 w-full">
                {/* Custom Header - Hide on Success Step */}
                {step !== 5 && (
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white">
                        <View className="w-10" />
                        <Text className="text-lg font-bold text-neutral-900">Book Appointment</Text>
                        <TouchableOpacity onPress={() => router.replace(`/business/${businessId}`)} className="w-10 h-10 items-center justify-center rounded-full active:bg-neutral-100">
                            <Feather name="x" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Progress Bar - Hide on Success Step */}
                {step !== 5 && (
                    <View className="flex-row h-1 bg-neutral-100 w-full">
                        <View className="h-full bg-black" style={{ width: `${(step / 4) * 100}%` }} />
                    </View>
                )}

                {step === 1 && renderStep1_Services()}
                {step === 2 && renderStep2_Stylists()}
                {step === 3 && renderStep3_DateTime()}
                {step === 4 && renderStep4_Confirm()}
                {step === 5 && renderStep5_Success()}

                {/* Footer Buttons - Hide on Success Step */}
                {step !== 5 && (
                    <View className="p-6 border-t border-neutral-100">
                        <View className="flex-row gap-4">
                            {step > 1 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setStep(prev => prev - 1 as Step);
                                        // Clear downstream selections
                                        if (step === 3) { setSelectedDate(null); setSelectedTime(null); }
                                    }}
                                    className="flex-1 py-4 rounded-xl bg-neutral-100 items-center justify-center"
                                >
                                    <Text className="font-bold text-neutral-900">Back</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => {
                                    if (step === 4) {
                                        if (!user) {
                                            // Serialize booking state
                                            const innerParams = new URLSearchParams({
                                                restore: 'true',
                                                sId: selectedService?.id || '',
                                                stId: selectedStylist === 'any' ? 'any' : selectedStylist?.id || '',
                                                d: selectedDate?.toISOString() || '',
                                                t: selectedTime || ''
                                            });

                                            const returnUrl = `/booking/${businessId}?${innerParams.toString()}`;
                                            console.log('Generated Return URL:', returnUrl);

                                            const params = new URLSearchParams({
                                                returnTo: returnUrl
                                            });

                                            const targetPath = `/sign-in?${params.toString()}`;
                                            console.log('Navigating to:', targetPath);

                                            router.push(targetPath as any);
                                        } else {
                                            handleBook();
                                        }
                                    }
                                    else setStep(prev => prev + 1 as Step);
                                }}
                                disabled={
                                    (step === 1 && !selectedService) ||
                                    (step === 2 && !selectedStylist) ||
                                    (step === 3 && (!selectedDate || !selectedTime)) ||
                                    submitting
                                }
                                className={`flex-1 py-4 rounded-xl items-center justify-center ${((step === 1 && !selectedService) || (step === 2 && !selectedStylist) || (step === 3 && (!selectedDate || !selectedTime)))
                                    ? 'bg-neutral-200'
                                    : 'bg-black'
                                    }`}
                                style={{ flex: 2 }}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className={`font-bold ${((step === 1 && !selectedService) || (step === 2 && !selectedStylist) || (step === 3 && (!selectedDate || !selectedTime))) ? 'text-neutral-400' : 'text-white'}`}>
                                        {step === 4
                                            ? (!user ? 'Sign In to Book' : 'Confirm Booking')
                                            : 'Next'
                                        }
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}
