import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

interface Stylist {
    id?: string;
    name: string;
    bio: string;
}

export default function EditTeamScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const [business, setBusiness] = useState<any>(null);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [currentStylist, setCurrentStylist] = useState<Stylist>({ name: '', bio: '' });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        loadData();
    }, [user]);

    async function loadData() {
        try {
            const { data: businessData } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user?.id)
                .single();

            if (businessData) {
                setBusiness(businessData);
                await loadStylists(businessData.id);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadStylists(businessId: string) {
        const { data: stylistsData } = await supabase
            .from('stylists')
            .select('*')
            .eq('business_id', businessId);

        if (stylistsData) {
            setStylists(stylistsData);
        }
    }

    const addStylist = async () => {
        if (!business || !currentStylist.name.trim()) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('stylists')
                .insert({
                    business_id: business.id,
                    name: currentStylist.name,
                    bio: currentStylist.bio,
                    specialties: [],
                });

            if (error) throw error;

            setCurrentStylist({ name: '', bio: '' });
            await loadStylists(business.id);
        } catch (error) {
            console.error('Error adding stylist:', error);
            alert('Failed to add team member. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const removeStylist = async (id: string | undefined) => {
        if (!id) return;

        // Optimistic update
        const previousStylists = [...stylists];
        setStylists(stylists.filter(s => s.id !== id));

        try {
            const { error } = await supabase
                .from('stylists')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error removing stylist:', error);
            // Revert on error
            setStylists(previousStylists);
            alert('Failed to remove team member. Please try again.');
        }
    };

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
                            Team Members
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Manage your team members
                        </Text>

                        {loading ? (
                            <Text className="text-neutral-500 text-center py-8">Loading...</Text>
                        ) : (
                            <>
                                {/* Current Team Members */}
                                {stylists.length > 0 && (
                                    <View className="mb-6">
                                        {stylists.map((stylist) => (
                                            <View key={stylist.id} className="bg-neutral-50 rounded-2xl p-4 flex-row items-center justify-between mb-3">
                                                <View className="flex-1">
                                                    <Text className="font-semibold text-base">{stylist.name}</Text>
                                                    {stylist.bio && (
                                                        <Text className="text-sm text-neutral-600 mt-1" numberOfLines={1}>
                                                            {stylist.bio}
                                                        </Text>
                                                    )}
                                                </View>
                                                <TouchableOpacity onPress={() => removeStylist(stylist.id)} className="ml-3 p-2">
                                                    <Feather name="trash-2" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Add New Team Member */}
                                <View className="bg-neutral-50 rounded-2xl p-4 mb-6">
                                    <Text className="font-semibold text-base mb-4">
                                        {stylists.length === 0 ? 'Add Your First Team Member' : 'Add Another Team Member'}
                                    </Text>

                                    <View className="mb-3">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Name</Text>
                                        <TextInput
                                            placeholder="e.g., Sarah Johnson"
                                            value={currentStylist.name}
                                            onChangeText={(value) => setCurrentStylist({ ...currentStylist, name: value })}
                                            className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                                        />
                                    </View>

                                    <View className="mb-3">
                                        <Text className="text-sm font-medium text-neutral-700 mb-2">Bio (Optional)</Text>
                                        <TextInput
                                            placeholder="Brief description..."
                                            value={currentStylist.bio}
                                            onChangeText={(value) => setCurrentStylist({ ...currentStylist, bio: value })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                            className="bg-white rounded-xl p-3 border border-neutral-200 text-base min-h-[80px]"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        onPress={addStylist}
                                        disabled={!currentStylist.name.trim() || actionLoading}
                                        className={`h-12 rounded-xl items-center justify-center flex-row ${currentStylist.name.trim() && !actionLoading ? 'bg-black' : 'bg-neutral-200'
                                            }`}
                                    >
                                        <Feather name="plus" size={20} color="white" />
                                        <Text className="text-white font-medium ml-2">
                                            {actionLoading ? 'Adding...' : 'Add Team Member'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
