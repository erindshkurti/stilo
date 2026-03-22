import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

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
    serviceName?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    booking: Booking | null;
    onUpdate: () => void;
}

export function BookingDetailModal({ visible, onClose, booking, onUpdate }: Props) {
    const router = useRouter();

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
        onClose();
        router.push(`/booking/${booking.business_id}?rescheduleId=${booking.id}`);
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
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 items-center justify-center px-6">
                <View className="bg-white w-full max-w-md rounded-3xl overflow-hidden">
                    {/* Header */}
                    <View className="px-6 py-6 border-b border-neutral-100 flex-row items-center justify-between">
                        <Text className="text-xl font-bold text-neutral-900">Appointment Details</Text>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full active:bg-neutral-100">
                            <Feather name="x" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="p-6">
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
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 rounded-full bg-neutral-100 items-center justify-center mr-4">
                                    <Feather name="user" size={24} color="#737373" />
                                </View>
                                <Text className="text-xl font-bold text-neutral-900">{booking.customerName}</Text>
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
                            {booking.status === 'confirmed' && (
                                <TouchableOpacity
                                    onPress={() => updateStatus('in-progress')}
                                    className="w-full bg-neutral-900 py-4 rounded-xl items-center"
                                >
                                    <Text className="text-white font-bold text-base">Check In</Text>
                                </TouchableOpacity>
                            )}

                            {booking.status === 'in-progress' && (
                                <TouchableOpacity
                                    onPress={() => updateStatus('completed')}
                                    className="w-full bg-green-600 py-4 rounded-xl items-center"
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
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
