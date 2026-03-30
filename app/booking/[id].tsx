import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, Platform, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { parseLocalBookingDate } from '@/lib/utils';
import { addDoc, updateDoc, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { AlertModal } from '../../components/AlertModal';

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
    image_url: string | null;
    specialties: string[] | null;
    userId?: string;
}

interface BusinessHour {
    id?: string;
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
}

export default function BookingScreen() {
    const { id: businessIdRaw } = useLocalSearchParams();
    const businessId = businessIdRaw as string;
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 1024;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

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

    // Initial Fetch
    useEffect(() => {
        if (!businessId) return;

        async function fetchData() {
            try {
                // Fetch Business Name directly by doc ID
                const bizDoc = await getDoc(doc(db, 'businesses', businessId as string));
                if (bizDoc.exists()) setBusinessName(bizDoc.data().name);

                // Fetch Services (subcollection)
                const servicesSnap = await getDocs(
                    collection(db, 'businesses', businessId as string, 'services')
                );
                setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));

                // Fetch Stylists (subcollection)
                const stylistsSnap = await getDocs(
                    collection(db, 'businesses', businessId as string, 'stylists')
                );
                const fetchedStylists = stylistsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Stylist));
                setStylists(fetchedStylists.filter(s => s.userId !== user?.uid));

                // Fetch Hours (subcollection)
                const hoursSnap = await getDocs(
                    collection(db, 'businesses', businessId as string, 'hours')
                );
                setHours(hoursSnap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessHour)));

            } catch (error: any) {
                console.error('fetchData error:', error);
                const msg = error?.message || 'Unknown error';
                showAlert('Error', `Failed to load booking data: ${msg}`, 'error');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [businessId, user]);

    // Restore state from URL params (e.g. after return from sign-in)
    // We decode params manually if needed, but expo-router does most of it
    const { restore, sId, stId, d, t, serviceId, rescheduleId } = useLocalSearchParams<{ restore: string; sId: string; stId: string; d: string; t: string; serviceId: string; rescheduleId: string }>();

    useEffect(() => {
        // 1. Full State Restore (e.g. from Auth Redirect)
        if (restore && !loading && services.length > 0 && stylists.length > 0) {
            console.log('Restoring booking state...', { sId, stId, d, t });

            if (sId) {
                const serviceToRestore = services.find(s => s.id === sId);
                if (serviceToRestore) setSelectedService(serviceToRestore);
            }
            if (stId) {
                if (stId === 'any') {
                    setSelectedStylist('any');
                } else {
                    const stylistToRestore = stylists.find(s => s.id === stId);
                    if (stylistToRestore) setSelectedStylist(stylistToRestore);
                }
            }
            if (d) {
                const dateToRestore = new Date(d);
                if (!isNaN(dateToRestore.getTime())) setSelectedDate(dateToRestore);
            }
            if (t) setSelectedTime(t);

            if (sId && stId && d && t) {
                setStep(4);
            }
        }
        // 2. Initial Pre-selection (e.g. "Book" from Business Page service list)
        else if (serviceId && !loading && services.length > 0 && !selectedService) {
            console.log('Pre-selecting service:', serviceId);
            const preSelected = services.find(s => s.id === serviceId);
            if (preSelected) {
                setSelectedService(preSelected);
                setStep(2); // Skip to Stylist Step
            }
        }
    }, [restore, serviceId, loading, services, stylists, sId, stId, d, t]);

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

            // 1. Determine base operating window (Business Hours or Staff Hours)
            let openTimeStr = businessHour?.open_time;
            let closeTimeStr = businessHour?.close_time;
            let isClosed = !businessHour || businessHour.is_closed;

            const stylistBlocks: any[] = [];

            if (selectedStylist !== 'any') {
                const sId = (selectedStylist as Stylist).id;
                
                // Fetch staff-specific hours
                const staffHoursSnap = await getDocs(
                    query(collection(db, 'businesses', businessId, 'stylists', sId, 'hours'), where('day_of_week', '==', dayOfWeek))
                );
                if (!staffHoursSnap.empty) {
                    const sh = staffHoursSnap.docs[0].data();
                    openTimeStr = sh.open_time;
                    closeTimeStr = sh.close_time;
                    isClosed = sh.is_closed;
                }

                // Fetch staff-specific blocks for this date
                const blocksSnap = await getDocs(
                    query(collection(db, 'businesses', businessId, 'stylists', sId, 'blocks'), where('date', '==', selectedDate.toISOString().split('T')[0]))
                );
                stylistBlocks.push(...blocksSnap.docs.map(d => d.data()));
            }

            if (isClosed || !openTimeStr || !closeTimeStr) {
                setAvailableSlots([]);
                setSlotsLoading(false);
                return;
            }

            // 2. Fetch existing bookings for that date
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);
            const startIso = startOfDay.toISOString();
            const endIso = endOfDay.toISOString();

            const bookingsSnap = await getDocs(
                query(collection(db, 'bookings'), where('business_id', '==', businessId))
            );

            let existingBookings = bookingsSnap.docs
                .map(d => d.data())
                .filter(b => b.status !== 'cancelled')
                .filter(b => b.start_time >= startIso && b.start_time <= endIso);

            if (selectedStylist && selectedStylist !== 'any') {
                const stylistId = (selectedStylist as Stylist).id;
                existingBookings = existingBookings.filter(b => b.stylist_id === stylistId);
            }

            // 3. Generate Time Slots
            const slots: string[] = [];
            const [openHour, openMinute] = openTimeStr.split(':').map(Number);
            const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);

            let current = new Date(selectedDate);
            current.setHours(openHour, openMinute, 0, 0);

            const closeTime = new Date(selectedDate);
            closeTime.setHours(closeHour, closeMinute, 0, 0);

            const durationMs = selectedService.duration_minutes * 60000;
            const totalStylistsCount = stylists.length;

            while (current.getTime() + durationMs <= closeTime.getTime()) {
                const slotStart = new Date(current);
                const slotEnd = new Date(current.getTime() + durationMs);

                let isBusy = false;

                if (selectedStylist !== 'any') {
                    // Check against Bookings
                    const hasBookingOverlap = existingBookings.some(booking => {
                        const bStart = new Date(booking.start_time);
                        const bEnd = new Date(booking.end_time);
                        return slotStart < bEnd && slotEnd > bStart;
                    });

                    // Check against Blocks
                    const hasBlockOverlap = stylistBlocks.some(block => {
                        const [bStartH, bStartM] = block.start_time.split(':').map(Number);
                        const [bEndH, bEndM] = block.end_time.split(':').map(Number);
                        const bStart = new Date(selectedDate);
                        bStart.setHours(bStartH, bStartM, 0, 0);
                        const bEnd = new Date(selectedDate);
                        bEnd.setHours(bEndH, bEndM, 0, 0);
                        return slotStart < bEnd && slotEnd > bStart;
                    });

                    isBusy = hasBookingOverlap || hasBlockOverlap;
                } else {
                    const concurrentBookings = existingBookings.filter(booking => {
                        const bStart = new Date(booking.start_time);
                        const bEnd = new Date(booking.end_time);
                        return slotStart < bEnd && slotEnd > bStart;
                    }).length;

                    isBusy = concurrentBookings >= totalStylistsCount;
                }

                const now = new Date();
                const isPast = slotStart < now;

                if (!isBusy && !isPast) {
                    slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
                }

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
            showAlert('Missing Info', 'Please complete all steps to book your appointment.', 'info');
            return;
        }
        setSubmitting(true);

        try {
            if (!user) return;

            const startTimeDate = parseLocalBookingDate(selectedDate, selectedTime);

            const endTimeDate = new Date(startTimeDate.getTime() + selectedService.duration_minutes * 60000);
            const finalStylistId = selectedStylist === 'any' ? null : (selectedStylist as Stylist)?.id;

            if (rescheduleId) {
                await updateDoc(doc(db, 'bookings', rescheduleId), {
                    service_id: selectedService.id,
                    stylist_id: finalStylistId,
                    start_time: startTimeDate.toISOString(),
                    end_time: endTimeDate.toISOString(),
                    status: 'confirmed'
                });
            } else {
                await addDoc(collection(db, 'bookings'), {
                    business_id: businessId,
                    customer_id: user.uid,
                    service_id: selectedService.id,
                    stylist_id: finalStylistId,
                    start_time: startTimeDate.toISOString(),
                    end_time: endTimeDate.toISOString(),
                    status: 'confirmed',
                    created_at: new Date().toISOString(),
                });
            }

            setStep(5);

        } catch (error: any) {
            showAlert('Booking Error', error.message || 'An unknown error occurred while saving your booking. Please try again.', 'error');
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
                        {stylist.image_url ? (
                            <Image source={{ uri: stylist.image_url }} className="w-full h-full" />
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

    const renderStep5_Success = () => {
        const content = (
            <View className={isLargeScreen ? "items-center justify-center py-4" : "flex-1 px-6 items-center justify-center"} style={!isLargeScreen ? { paddingTop: Platform.OS === 'ios' ? insets.top : 0, marginTop: -80 } : {}}>
                <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                    <Feather name="check" size={48} color="#16a34a" />
                </View>
                <Text className="text-2xl font-bold text-neutral-900 mb-2 text-center">{rescheduleId ? 'Successfully Rescheduled!' : 'Booking Confirmed!'}</Text>
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
                    onPress={() => router.push('/bookings')}
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

        if (isLargeScreen) {
            return (
                <Modal visible={step === 5} transparent animationType="fade">
                    <View style={s.webOverlay}>
                        <View style={s.webModalContent}>
                            {content}
                        </View>
                    </View>
                </Modal>
            );
        }

        return content;
    };

    if (loading) return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#000" /></View>;

    return (
        <View className="flex-1 bg-white items-center">
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ width: '100%', maxWidth: 1200 }} className="flex-1 w-full">
                {/* Custom Header - Hide on Success Step */}
                {step !== 5 && (
                    <View 
                        className="flex-row items-center justify-between px-6 pb-4 pt-1 border-b border-neutral-100 bg-white"
                        style={{ paddingTop: Platform.OS === 'ios' ? insets.top : 16 }}
                    >
                        <View className="w-10" />
                        <Text className="text-lg font-bold text-neutral-900">{rescheduleId ? 'Reschedule Appointment' : 'Book Appointment'}</Text>
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
                    <View className="px-6 pt-4 border-t border-neutral-100 bg-white" style={{ paddingBottom: Platform.OS === 'ios' ? insets.bottom + 12 : 24 }}>
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
                                            if (rescheduleId) innerParams.append('rescheduleId', rescheduleId);

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
                                            ? (!user ? 'Sign In to Book' : (rescheduleId ? 'Confirm Reschedule' : 'Confirm Booking'))
                                            : 'Next'
                                        }
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <AlertModal
                visible={showAlertModal}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={() => setShowAlertModal(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    webOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    webModalContent: {
        width: '90%',
        maxWidth: 500,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    }
});
