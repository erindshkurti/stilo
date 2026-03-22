import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { addDoc, collection, deleteDoc, getDocs, orderBy, query, where, doc, getDoc } from 'firebase/firestore';

interface StaffHours {
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

export default function StaffHoursScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [stylistId, setStylistId] = useState<string | null>(null);
    const [hours, setHours] = useState<StaffHours[]>([]);

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user]);

    async function loadData() {
        try {
            // 1. Get User Profile to find business_id
            const profileSnap = await getDoc(doc(db, 'profiles', user!.uid));
            if (!profileSnap.exists()) return;
            const profileData = profileSnap.data();
            setProfile(profileData);

            if (!profileData.business_id) return;

            // 2. Find Stylist Record ID
            const stylistsSnap = await getDocs(
                query(collection(db, 'businesses', profileData.business_id, 'stylists'), where('userId', '==', user!.uid))
            );
            if (stylistsSnap.empty) return;
            const sId = stylistsSnap.docs[0].id;
            setStylistId(sId);

            // 3. Load Hours
            const hoursSnap = await getDocs(
                query(collection(db, 'businesses', profileData.business_id, 'stylists', sId, 'hours'), orderBy('day_of_week'))
            );

            if (!hoursSnap.empty) {
                setHours(hoursSnap.docs.map(d => ({
                    id: d.id,
                    day_name: DAYS[d.data().day_of_week]?.day_name ?? '',
                    ...d.data(),
                } as StaffHours)));
            } else {
                setHours(DAYS.map(day => ({
                    ...day,
                    is_closed: day.day_of_week === 0,
                    ...DEFAULT_HOURS,
                })));
            }
        } catch (error) {
            console.error('Error loading staff hours:', error);
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
        if (!profile?.business_id || !stylistId) return;
        setSaving(true);
        try {
            const hoursCol = collection(db, 'businesses', profile.business_id, 'stylists', stylistId, 'hours');
            
            // Delete existing
            const existingSnap = await getDocs(hoursCol);
            for (const d of existingSnap.docs) {
                await deleteDoc(d.ref);
            }

            // Insert new
            for (const hour of hours) {
                await addDoc(hoursCol, {
                    day_of_week: hour.day_of_week,
                    open_time: hour.open_time,
                    close_time: hour.close_time,
                    is_closed: hour.is_closed,
                });
            }

            router.back();
        } catch (error) {
            console.error('Error saving staff hours:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#000" /></View>;
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />
            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth, width: '100%' }}>
                        <TouchableOpacity onPress={() => router.back()} className="mb-4">
                            <View className="flex-row items-center">
                                <Feather name="arrow-left" size={20} color="#000" />
                                <Text className="ml-2 font-medium">Back to Dashboard</Text>
                            </View>
                        </TouchableOpacity>

                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                            My Working Hours
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Set your personal availability. These hours override the business defaults.
                        </Text>

                        {hours.map((day, index) => (
                            <View key={day.day_of_week} className="bg-neutral-50 rounded-2xl p-4 mb-3">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="font-semibold text-base">{day.day_name}</Text>
                                    <View className="flex-row items-center">
                                        <Text className="text-sm text-neutral-600 mr-2">
                                            {day.is_closed ? 'Away' : 'Available'}
                                        </Text>
                                        <Switch
                                            value={!day.is_closed}
                                            onValueChange={() => toggleDay(index)}
                                            trackColor={{ false: '#d4d4d4', true: '#000000' }}
                                            thumbColor="#ffffff"
                                        />
                                    </View>
                                </View>

                                {!day.is_closed && (
                                    <View className="flex-row items-center gap-3">
                                        <View className="flex-1">
                                            <Text className="text-xs text-neutral-600 mb-1">Start</Text>
                                            <View className="h-12 bg-white rounded-xl px-3 border border-neutral-200 justify-center">
                                                <Text className="text-base">{day.open_time}</Text>
                                            </View>
                                        </View>

                                        <Feather name="arrow-right" size={16} color="#737373" className="mt-5" />

                                        <View className="flex-1">
                                            <Text className="text-xs text-neutral-600 mb-1">End</Text>
                                            <View className="h-12 bg-white rounded-xl px-3 border border-neutral-200 justify-center">
                                                <Text className="text-base">{day.close_time}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className={`mt-6 py-4 rounded-xl ${saving ? 'bg-neutral-300' : 'bg-black'}`}
                        >
                            <Text className="text-white font-medium text-center text-base">
                                {saving ? 'Saving...' : 'Save My Hours'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
