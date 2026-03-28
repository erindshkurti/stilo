import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Alert, Image, Linking, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { db } from '@/lib/firebase';
import { parseLocalBookingDate } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
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
                status: 'confirmed'
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed': return { bg: '#dbeafe', text: '#1d4ed8' };
            case 'in-progress': return { bg: '#fef9c3', text: '#a16207' };
            case 'completed': return { bg: '#dcfce7', text: '#15803d' };
            case 'cancelled': return { bg: '#fee2e2', text: '#b91c1c' };
            default: return { bg: '#f5f5f5', text: '#404040' };
        }
    };

    const statusStyle = getStatusStyle(booking.status);

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isStylistView ? "slide" : "fade"}
            onRequestClose={onClose}
        >
            <View style={[s.overlay, isStylistView ? s.overlayStyleStylist : s.overlayStyleModal]}>
                <View style={[isStylistView ? s.containerStylist : s.containerModal]}>
                    {isStylistView ? <View style={s.handle} /> : null}

                    <View style={s.header}>
                        <Text style={s.headerTitle}>Appointment Details</Text>
                        <TouchableOpacity onPress={onClose} style={s.closeButton}>
                            <Feather name="x" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={s.scrollContent}>
                        {isRescheduling ? (
                            <View>
                                <View style={[s.fieldGroup, !isStylistView ? { zIndex: 100 } : undefined]}>
                                    <Text style={s.label}>New Date</Text>
                                    <View style={!isStylistView ? s.inputWrapper : undefined}>
                                        <DatePicker
                                            value={resDate}
                                            onChange={setResDate}
                                            isInline={isStylistView}
                                        />
                                    </View>
                                </View>
                                <View style={[s.fieldGroupLarge, !isStylistView ? { zIndex: 90 } : undefined]}>
                                    <Text style={s.label}>New Time</Text>
                                    <View style={!isStylistView ? s.inputWrapper : undefined}>
                                        <TimePicker
                                            value={resTime}
                                            onChange={setResTime}
                                            isInline={isStylistView}
                                        />
                                    </View>
                                </View>
                                <View style={s.actionsGroup}>
                                    <TouchableOpacity
                                        onPress={handleSaveReschedule}
                                        disabled={saving}
                                        style={s.primaryButton}
                                    >
                                        <Text style={s.primaryButtonText}>
                                            {saving ? 'Updating...' : 'Update Appointment'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setIsRescheduling(false)}
                                        style={s.cancelTextButton}
                                    >
                                        <Text style={s.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={s.statusRow}>
                                    <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                        <Text style={[s.statusText, { color: statusStyle.text }]}>
                                            {booking.status.replace('-', ' ')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.section}>
                                    <Text style={s.label}>Customer</Text>
                                    <View style={s.card}>
                                        <View style={s.customerRow}>
                                            <View style={s.avatarLarge}>
                                                {booking.customerAvatar ? (
                                                    <Image source={{ uri: booking.customerAvatar }} style={s.avatarImage} />
                                                ) : (
                                                    <View style={s.avatarPlaceholder}>
                                                        <Feather name="user" size={28} color="#737373" />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.customerName}>
                                                    {booking.customerName || 'Client'}
                                                </Text>
                                                {booking.customerEmail ? (
                                                    <TouchableOpacity
                                                        onPress={() => Linking.openURL(`mailto:${booking.customerEmail}`)}
                                                        style={s.emailRow}
                                                    >
                                                        <Feather name="mail" size={12} color="#737373" />
                                                        <Text style={s.emailText}>{booking.customerEmail}</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        </View>
                                        {booking.customerPhone ? (
                                            <View style={s.contactButtons}>
                                                <TouchableOpacity
                                                    onPress={() => Linking.openURL(`tel:${booking.customerPhone}`)}
                                                    style={s.contactButton}
                                                >
                                                    <Feather name="phone" size={16} color="#000" />
                                                    <Text style={s.contactButtonText}>Call</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => Linking.openURL(`sms:${booking.customerPhone}`)}
                                                    style={s.contactButton}
                                                >
                                                    <Feather name="message-square" size={16} color="#000" />
                                                    <Text style={s.contactButtonText}>Text</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                        {!booking.customerPhone && !booking.customerEmail ? (
                                            <Text style={s.noContactText}>No contact information available</Text>
                                        ) : null}
                                    </View>
                                </View>

                                <View style={s.section}>
                                    <Text style={s.label}>Service</Text>
                                    <View style={s.card}>
                                        <Text style={s.serviceName}>{booking.serviceName}</Text>
                                        <Text style={s.serviceDuration}>
                                            {Math.round((endTime.getTime() - startTime.getTime()) / 60000)} minutes
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.sectionLarge}>
                                    <Text style={s.label}>Time</Text>
                                    <View style={s.timeInfoRow}>
                                        <Feather name="calendar" size={18} color="#737373" />
                                        <Text style={s.timeInfoText}>
                                            {startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                    <View style={[s.timeInfoRow, { marginTop: 12 }]}>
                                        <Feather name="clock" size={18} color="#737373" />
                                        <Text style={s.timeInfoText}>
                                            {startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            {' - '}
                                            {endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.actionsGroup}>
                                    {['confirmed', 'in-progress'].includes(booking.status) ? (
                                        <TouchableOpacity
                                            onPress={() => updateStatus('completed')}
                                            style={s.primaryButton}
                                        >
                                            <Text style={s.primaryButtonText}>Mark as Completed</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    {['confirmed', 'in-progress'].includes(booking.status) ? (
                                        <TouchableOpacity
                                            onPress={handleReschedule}
                                            style={s.secondaryButton}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Feather name="edit-2" size={18} color="#000" />
                                                <Text style={s.secondaryButtonText}>Reschedule</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ) : null}
                                    {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
                                        <TouchableOpacity
                                            onPress={() => updateStatus('cancelled')}
                                            style={s.dangerButton}
                                        >
                                            <Text style={s.dangerButtonText}>Cancel Appointment</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    overlayStyleStylist: {
        backgroundColor: 'white',
    },
    overlayStyleModal: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    containerStylist: {
        flex: 1,
        overflow: 'hidden',
    },
    containerModal: {
        backgroundColor: 'white',
        width: '100%',
        maxWidth: 448,
        borderRadius: 24,
        overflow: 'hidden',
    },
    handle: {
        width: 48,
        height: 6,
        backgroundColor: '#e5e5e5',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#171717',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    scrollContent: {
        padding: 24,
    },
    label: {
        color: '#737373',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    fieldGroup: {
        marginBottom: 24,
    },
    fieldGroupLarge: {
        marginBottom: 40,
    },
    inputWrapper: {
        height: 48,
        backgroundColor: '#fafafa',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        justifyContent: 'center',
    },
    statusRow: {
        marginBottom: 24,
        flexDirection: 'row',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: 24,
    },
    sectionLarge: {
        marginBottom: 32,
    },
    card: {
        backgroundColor: '#fafafa',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarLarge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: '#e5e5e5',
        marginRight: 16,
        borderWidth: 2,
        borderColor: 'white',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customerName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#171717',
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    emailText: {
        color: '#737373',
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '500',
    },
    contactButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        paddingVertical: 12,
        borderRadius: 12,
    },
    contactButtonText: {
        marginLeft: 8,
        fontWeight: 'bold',
        color: '#171717',
    },
    noContactText: {
        color: '#a3a3a3',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 8,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#171717',
    },
    serviceDuration: {
        color: '#737373',
        marginTop: 4,
    },
    timeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeInfoText: {
        marginLeft: 12,
        color: '#171717',
        fontWeight: '500',
        fontSize: 16,
    },
    actionsGroup: {
        gap: 12,
        paddingBottom: 16,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#171717',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        width: '100%',
        backgroundColor: '#f5f5f5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#171717',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    cancelTextButton: {
        width: '100%',
        paddingVertical: 8,
        alignItems: 'center',
    },
    cancelText: {
        color: '#737373',
        fontWeight: 'bold',
    },
    dangerButton: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
    },
    dangerButtonText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
