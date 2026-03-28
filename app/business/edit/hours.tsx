import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { Toast } from '../../../components/Toast';
import { useAuth } from '../../../lib/auth';
import { db } from '../../../lib/firebase';
import { addDoc, collection, deleteDoc, getDocs, orderBy, query, where } from 'firebase/firestore';

interface BusinessHours {
    id?: string;
    day_of_week: number;
    day_name: string;
    is_closed: boolean;
    open_time: string;
    close_time: string;
}

const DAYS = [
    { day_of_week: 0, day_name: 'Sunday' },
    { day_of_week: 1, day_name: 'Monday' },
    { day_of_week: 2, day_name: 'Tuesday' },
    { day_of_week: 3, day_name: 'Wednesday' },
    { day_of_week: 4, day_name: 'Thursday' },
    { day_of_week: 5, day_name: 'Friday' },
    { day_of_week: 6, day_name: 'Saturday' },
];

const DEFAULT_HOURS = {
    open_time: '09:00',
    close_time: '17:00',
};

export default function EditHoursScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const [business, setBusiness] = useState<any>(null);
    const [hours, setHours] = useState<BusinessHours[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        loadData();
    }, [user]);

    async function loadData() {
        if (!user) return;
        try {
            // Load business by owner_id
            const bizSnap = await getDocs(
                query(collection(db, 'businesses'), where('owner_id', '==', user.uid))
            );
            if (bizSnap.empty) return;
            const bizDoc = bizSnap.docs[0];
            const biz = { id: bizDoc.id, ...bizDoc.data() };
            setBusiness(biz);

            // Load hours subcollection
            const hoursSnap = await getDocs(
                query(collection(db, 'businesses', bizDoc.id, 'hours'), orderBy('day_of_week'))
            );

            if (!hoursSnap.empty) {
                setHours(hoursSnap.docs.map(d => ({
                    id: d.id,
                    day_name: DAYS[d.data().day_of_week]?.day_name ?? '',
                    ...d.data(),
                } as BusinessHours)));
            } else {
                setHours(DAYS.map(day => ({
                    ...day,
                    is_closed: day.day_of_week === 0,
                    ...DEFAULT_HOURS,
                })));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    const toggleDay = (dayIndex: number) => {
        const newHours = [...hours];
        newHours[dayIndex].is_closed = !newHours[dayIndex].is_closed;
        setHours(newHours);
    };

    const handleSave = async () => {
        if (!business) return;
        setSaving(true);
        try {
            // Delete existing hours docs
            const existingSnap = await getDocs(
                collection(db, 'businesses', business.id, 'hours')
            );
            for (const d of existingSnap.docs) {
                await deleteDoc(d.ref);
            }

            // Insert new hours
            const hoursCol = collection(db, 'businesses', business.id, 'hours');
            for (const hour of hours) {
                await addDoc(hoursCol, {
                    day_of_week: hour.day_of_week,
                    open_time: hour.open_time,
                    close_time: hour.close_time,
                    is_closed: hour.is_closed,
                });
            }

            setToast({ visible: true, message: 'Business hours saved successfully!', type: 'success' });
        } catch (error) {
            console.error('Error saving business hours:', error);
            setToast({ visible: true, message: 'Failed to save hours. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header showBack={true} backHref="/business/dashboard" />

            <View className="flex-1">
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-6 py-8 items-center">
                        <View style={{ maxWidth, width: '100%' }}>

                            <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                                Business Hours
                            </Text>
                            <Text className="text-neutral-600 mb-8">
                                Set the default operating hours for your business
                            </Text>

                            {loading ? (
                                <View className="items-center py-12">
                                    <ActivityIndicator color="#000" />
                                </View>
                            ) : (
                                <View className="space-y-3">
                                    {hours.map((day, index) => (
                                        <View 
                                            key={index} 
                                            className="bg-neutral-50 rounded-2xl p-5 mb-3 border border-neutral-100"
                                        >
                                            <View className="flex-row items-center justify-between mb-4">
                                                <Text className="font-bold text-lg text-neutral-900">{day.day_name}</Text>
                                                <View className="flex-row items-center">
                                                    <Text className={`text-sm font-medium mr-3 ${day.is_closed ? 'text-neutral-400' : 'text-emerald-600'}`}>
                                                        {day.is_closed ? 'CLOSED' : 'OPEN'}
                                                    </Text>
                                                    <Switch
                                                        value={!day.is_closed}
                                                        onValueChange={() => toggleDay(index)}
                                                        trackColor={{ false: '#e5e5e5', true: '#10b981' }}
                                                        thumbColor="#ffffff"
                                                        ios_backgroundColor="#e5e5e5"
                                                    />
                                                </View>
                                            </View>

                                            {!day.is_closed && (
                                                <View className="flex-row items-center gap-4 bg-white p-4 rounded-xl border border-neutral-100">
                                                    <View className="flex-1">
                                                        <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Open</Text>
                                                        <Text className="text-lg font-semibold text-neutral-900">{day.open_time}</Text>
                                                    </View>

                                                    <View className="w-8 h-8 rounded-full bg-neutral-50 items-center justify-center">
                                                        <Feather name="arrow-right" size={14} color="#a3a3a3" />
                                                    </View>

                                                    <View className="flex-1 items-end">
                                                        <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Close</Text>
                                                        <Text className="text-lg font-semibold text-neutral-900">{day.close_time}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                <View className="p-6 border-t border-neutral-100 bg-white items-center">
                    <View style={{ maxWidth, width: '100%' }}>
                        <TouchableOpacity 
                            onPress={handleSave} 
                            disabled={saving}
                            className={`py-4 rounded-2xl items-center justify-center shadow-lg ${saving ? 'bg-neutral-300' : 'bg-black'}`}
                            activeOpacity={0.8}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Save Hours</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>


            <Toast 
                visible={toast.visible} 
                message={toast.message} 
                type={toast.type} 
                onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
            />
        </SafeAreaView>
    );
}
