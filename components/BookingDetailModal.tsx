import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Alert, Image, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { db } from '@/lib/firebase';
import { parseLocalBookingDate } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

interface Booking {
    id: string;
    business_id: string;
    customer_id: string;
    service_id: string;
    stylist_id: string;
    start_time: string;
    end_time: string;
    status: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAvatar?: string;
    serviceName?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    booking: Booking | null;
    onUpdate: () => void;
    isStylistView?: boolean;
}

export function BookingDetailModal({ visible, onClose, booking, onUpdate, isStylistView }: Props) {
    const router = useRouter();
    const [isRescheduling, setIsRescheduling] = React.useState(false);
    const [resDate, setResDate] = React.useState('');
    const [resTime, setResTime] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (visible && booking) {
            setIsRescheduling(false);
            const start = new Date(booking.start_time);
            setResDate(start.toISOString().split('T')[0]);
            setResTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
        }
    }, [visible, booking]);

    if (!booking) return null;

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    const updateStatus = async (newStatus: string) => {
        try {
            await updateDoc(doc(db, 'bookings', booking.id), {
                status: newStatus
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleReschedule = () => {
        if (isStylistView) {
            setIsRescheduling(true);
        } else {
            onClose();
            router.push(`/booking/${booking.business_id}?rescheduleId=${booking.id}`);
        }
    };

    const handleSaveReschedule = async () => {
        if (!booking) return;
        setSaving(true);
        try {
            const start = parseLocalBookingDate(resDate, resTime);
            const durationMs = (booking.end_time ? new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime() : 30 * 60000);
            const end = new Date(start.getTime() + durationMs);

            await updateDoc(doc(db, 'bookings', booking.id), {
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'confirmed' // Reset to confirmed if it was in-progress
            });

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error rescheduling:', error);
            Alert.alert('Error', 'Failed to reschedule appointment');
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-100 text-blue-700';
            case 'in-progress': return 'bg-yellow-100 text-yellow-700';
            case 'completed': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-neutral-100 text-neutral-700';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isStylistView ? "slide" : "fade"}
            onRequestClose={onClose}
        >
            <View className={`flex-1 ${isStylistView ? 'bg-white' : 'bg-black/60 items-center justify-center px-6'}`}>
                <View className={`${isStylistView ? 'flex-1' : 'bg-white w-full max-w-md rounded-3xl'} overflow-hidden`}>
                    {isStylistView && <View className="w-12 h-1.5 bg-neutral-200 rounded-full self-center mt-3 mb-1" />}
                    
                    {/* Header */}
                    <View className="px-6 py-6 border-b border-neutral-100 flex-row items-center justify-between">
                        <Text className="text-xl font-bold text-neutral-900">Appointment Details</Text>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full active:bg-neutral-100">
                            <Feather name="x" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="p-6">
                        {isRescheduling ? (
                            <View>
                                <View className="mb-6" style={!isStylistView ? { zIndex: 100 } : undefined}>
                                    <Text className="text-neutral-500 text-xs font-bold uppercase mb-2 tracking-wider">New Date</Text>
                                    <View className={!isStylistView ? 'h-12 bg-neutral-50 rounded-xl px-4 border border-neutral-200 justify-center' : ''}>
                                        <DatePicker 
                                            value={resDate}
                                            onChange={setResDate}
                                            isInline={isStylistView}
                                        />
                                    </View>
                                </View>

                                <View className="mb-10" style={!isStylistView ? { zIndex: 90 } : undefined}>
                                    <Text className="text-neutral-500 text-xs font-bold uppercase mb-2 tracking-wider">New Time</Text>
                                    <View className={!isStylistView ? 'h-12 bg-neutral-50 rounded-xl px-4 border border-neutral-200 justify-center' : ''}>
                                        <TimePicker 
                                            value={resTime}
                                            onChange={setResTime}
                                            isInline={isStylistView}
                                        />
                                    </View>
                                </View>

                                <View className="space-y-3 pt-4">
                                    <TouchableOpacity
                                        onPress={handleSaveReschedule}
                                        disabled={saving}
                                        className="w-full bg-neutral-900 py-4 rounded-xl items-center"
                                    >
                                        <Text className="text-white font-bold text-base">
                                            {saving ? 'Updating...' : 'Update Appointment'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setIsRescheduling(false)}
                                        className="w-full py-2 items-center"
                                    >
                                        <Text className="text-neutral-500 font-bold">Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                        {/* Status Badge */}
                        <View className="mb-6 flex-row">
                            <View className={`px-3 py-1 rounded-full ${getStatusColor(booking.status).split(' ')[0]}`}>
                                <Text className={`text-xs font-bold uppercase ${getStatusColor(booking.status).split(' ')[1]}`}>
                                    {booking.status.replace('-', ' ')}
                                </Text>
                            </View>
                        </View>

                        {/* Customer Info */}
                        <View className="mb-6">
                            <Text className="text-neutral-500 text-xs font-bold uppercase mb-2 tracking-wider">Customer</Text>
                            <View className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-14 h-14 rounded-full overflow-hidden bg-neutral-200 mr-4 border-2 border-white shadow-sm">
                                        {booking.customerAvatar ? (
                                            <Image source={{ uri: booking.customerAvatar }} className="w-full h-full" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center">
                                                <Feather name="user" size={28} color="#737373" />
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-extrabold text-neutral-900 leading-tight">
                                            {booking.customerName || 'Client'}
                                        </Text>
                                        {booking.customerEmail && (
                                            <TouchableOpacity 
                                                onPress={() => Linking.openURL(`mailto:${booking.customerEmail}`)}
                                                className="flex-row items-center mt-1"
                                            >
                                                <Feather name="mail" size={12} color="#737373" />
                                                <Text className="text-neutral-500 ml-1.5 text-xs font-medium">{booking.customerEmail}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {booking.customerPhone && (
                                    <View className="flex-row gap-2 mt-2">
                                        <TouchableOpacity 
                                            onPress={() => Linking.openURL(`tel:${booking.customerPhone}`)}
                                            className="flex-1 flex-row items-center justify-center bg-white border border-neutral-200 py-3 rounded-xl active:bg-neutral-50"
                                        >
                                            <Feather name="phone" size={16} color="#000" />
                                            <Text className="ml-2 font-bold text-neutral-900">Call</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => Linking.openURL(`sms:${booking.customerPhone}`)}
                                            className="flex-1 flex-row items-center justify-center bg-white border border-neutral-200 py-3 rounded-xl active:bg-neutral-50"
                                        >
                                            <Feather name="message-square" size={16} color="#000" />
                                            <Text className="ml-2 font-bold text-neutral-900">Text</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {!booking.customerPhone && !booking.customerEmail && (
                                    <Text className="text-neutral-400 text-xs italic italic mt-2">No contact information available</Text>
                                )}
                            </View>
                        </View>

                        {/* Service Info */}
                        <View className="mb-6">
                            <Text className="text-neutral-500 text-xs font-bold uppercase mb-2 tracking-wider">Service</Text>
                            <View className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                                <Text className="text-lg font-bold text-neutral-900">{booking.serviceName}</Text>
                                <Text className="text-neutral-500 mt-1">
                                    {Math.round((endTime.getTime() - startTime.getTime()) / 60000)} minutes
                                </Text>
                            </View>
                        </View>

                        {/* Schedule Info */}
                        <View className="mb-8">
                            <Text className="text-neutral-500 text-xs font-bold uppercase mb-2 tracking-wider">Time</Text>
                            <View className="flex-row items-center">
                                <Feather name="calendar" size={18} color="#737373" />
                                <Text className="ml-3 text-neutral-900 font-medium text-base">
                                    {startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </Text>
                            </View>
                            <View className="flex-row items-center mt-3">
                                <Feather name="clock" size={18} color="#737373" />
                                <Text className="ml-3 text-neutral-900 font-medium text-base">
                                    {startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    {' - '}
                                    {endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View className="space-y-3 pb-4">
                            {['confirmed', 'in-progress'].includes(booking.status) && (
                                <TouchableOpacity
                                    onPress={() => updateStatus('completed')}
                                    className="w-full bg-neutral-900 py-4 rounded-xl items-center"
                                >
                                    <Text className="text-white font-bold text-base">Mark as Completed</Text>
                                </TouchableOpacity>
                            )}

                            {['confirmed', 'in-progress'].includes(booking.status) && (
                                <TouchableOpacity
                                    onPress={handleReschedule}
                                    className="w-full bg-neutral-100 py-4 rounded-xl items-center"
                                >
                                    <View className="flex-row items-center">
                                        <Feather name="edit-2" size={18} color="#000" />
                                        <Text className="text-neutral-900 font-bold text-base ml-2">Reschedule</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {booking.status !== 'cancelled' && (
                                <TouchableOpacity
                                    onPress={() => updateStatus('cancelled')}
                                    className="w-full py-4 items-center"
                                >
                                    <Text className="text-red-500 font-bold text-base">Cancel Appointment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
