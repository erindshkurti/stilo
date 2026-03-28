import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { addDoc, collection, deleteDoc, getDocs, query, where, doc, getDoc, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AlertModal } from '../../components/AlertModal';
import { DatePicker } from '../../components/DatePicker';
import { TimePicker } from '../../components/TimePicker';
import { getLocalTodayStr } from '@/lib/utils';

interface Block {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    reason: string;
}

export default function StaffBlocksScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [stylistId, setStylistId] = useState<string | null>(null);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

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

    // New Block Form
    const [showForm, setShowForm] = useState(false);
    const [newBlock, setNewBlock] = useState({
        date: getLocalTodayStr(),
        start_time: '12:00',
        end_time: '13:00',
        reason: 'Lunch Break'
    });

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user]);

    async function loadData() {
        try {
            const profileSnap = await getDoc(doc(db, 'profiles', user!.uid));
            if (!profileSnap.exists()) return;
            const profileData = profileSnap.data();
            setProfile(profileData);

            if (!profileData.business_id) return;

            const stylistsSnap = await getDocs(
                query(collection(db, 'businesses', profileData.business_id, 'stylists'), where('userId', '==', user!.uid))
            );
            if (stylistsSnap.empty) return;
            const sId = stylistsSnap.docs[0].id;
            setStylistId(sId);

            const blocksSnap = await getDocs(
                query(
                    collection(db, 'businesses', profileData.business_id, 'stylists', sId, 'blocks'),
                    orderBy('date', 'desc')
                )
            );

            setBlocks(blocksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Block)));

        } catch (error) {
            console.error('Error loading blocks:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveBlock = async () => {
        if (!profile?.business_id || !stylistId) return;
        setSaving(true);
        try {
            const blocksCol = collection(db, 'businesses', profile.business_id, 'stylists', stylistId, 'blocks');
            
            if (editingBlockId) {
                await updateDoc(doc(blocksCol, editingBlockId), {
                    ...newBlock,
                    updated_at: serverTimestamp()
                });
            } else {
                await addDoc(blocksCol, {
                    ...newBlock,
                    created_at: serverTimestamp()
                });
            }

            setShowForm(false);
            setEditingBlockId(null);
            setNewBlock({
                date: getLocalTodayStr(),
                start_time: '12:00',
                end_time: '13:00',
                reason: 'Lunch Break'
            });
            loadData();
        } catch (error) {
            console.error('Error saving block:', error);
            showAlert('Error', `Failed to ${editingBlockId ? 'update' : 'add'} time block. Please try again.`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (block: Block) => {
        setNewBlock({
            date: block.date,
            start_time: block.start_time,
            end_time: block.end_time,
            reason: block.reason
        });
        setEditingBlockId(block.id);
        setShowForm(true);
    };

    const handleDeleteBlock = async (id: string) => {
        if (!profile?.business_id || !stylistId) return;
        try {
            await deleteDoc(doc(db, 'businesses', profile.business_id, 'stylists', stylistId, 'blocks', id));
            loadData();
        } catch (error) {
            console.error('Error deleting block:', error);
        }
    };

    if (loading) {
        return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#000" /></View>;
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header showBack={true} backHref="/stylist/dashboard" />
            <View className="flex-1">
                <ScrollView className="flex-1">
                    <View className="px-6 py-4 items-center">
                        <View style={{ maxWidth, width: '100%' }}>
                        <View className="mb-8">
                            <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                                Time Blocks
                            </Text>
                            <Text className="text-neutral-600">
                                Mark specific times as unavailable
                            </Text>
                        </View>

                        {/* Add/Edit Block Modal */}
                        <Modal visible={showForm} transparent animationType="fade">
                            <View className="flex-1 bg-black/40 justify-center items-center px-6">
                                <View className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
                                    <View className="flex-row justify-between items-center mb-6">
                                        <Text className="text-2xl font-bold text-neutral-900">{editingBlockId ? 'Edit Block' : 'Add Block'}</Text>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setShowForm(false);
                                                setEditingBlockId(null);
                                                setNewBlock({
                                                    date: getLocalTodayStr(),
                                                    start_time: '12:00',
                                                    end_time: '13:00',
                                                    reason: 'Lunch Break'
                                                });
                                            }}
                                            className="p-2 bg-neutral-100 rounded-full"
                                        >
                                            <Feather name="x" size={20} color="#000" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View className="mb-4" style={{ zIndex: 20 }}>
                                        <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">Date</Text>
                                        <DatePicker 
                                            isInline
                                            value={newBlock.date}
                                            onChange={(date) => setNewBlock(prev => ({ ...prev, date }))}
                                            placeholder="Select Date"
                                        />
                                    </View>

                                    <View className="flex-row gap-4 mb-4" style={{ zIndex: 10 }}>
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">Start Time</Text>
                                            <TimePicker 
                                                isInline
                                                value={newBlock.start_time}
                                                onChange={(t) => setNewBlock(prev => ({ ...prev, start_time: t }))}
                                                placeholder="Start"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">End Time</Text>
                                            <TimePicker 
                                                isInline
                                                value={newBlock.end_time}
                                                onChange={(t) => setNewBlock(prev => ({ ...prev, end_time: t }))}
                                                placeholder="End"
                                            />
                                        </View>
                                    </View>

                                    <View className="mb-8">
                                        <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">Reason</Text>
                                        <TextInput 
                                            value={newBlock.reason}
                                            onChangeText={(t) => setNewBlock(prev => ({ ...prev, reason: t }))}
                                            className="h-12 bg-white rounded-xl px-4 border border-neutral-200"
                                            placeholder="Lunch Break, Off, etc."
                                        />
                                    </View>

                                    <TouchableOpacity 
                                        onPress={handleSaveBlock}
                                        disabled={saving}
                                        className="bg-black py-4 rounded-2xl items-center"
                                    >
                                        {saving ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-white font-bold text-lg">
                                                {editingBlockId ? 'Save Changes' : 'Add Block'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>

                        <View className="space-y-4">
                            {blocks.length > 0 ? (
                                blocks.map(block => (
                                    <View key={block.id} className="bg-white border border-neutral-100 p-5 rounded-2xl flex-row items-center">
                                        <View className="flex-1">
                                            <Text className="font-bold text-lg text-neutral-900">{block.reason}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <Feather name="calendar" size={14} color="#737373" />
                                                <Text className="text-neutral-500 ml-1.5 text-sm">{block.date}</Text>
                                                <View className="w-1 h-1 rounded-full bg-neutral-300 mx-2" />
                                                <Feather name="clock" size={14} color="#737373" />
                                                <Text className="text-neutral-500 ml-1.5 text-sm">{block.start_time} - {block.end_time}</Text>
                                            </View>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            <TouchableOpacity onPress={() => handleEditClick(block)} className="p-2">
                                                <Feather name="edit-2" size={18} color="#737373" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteBlock(block.id)} className="p-2">
                                                <Feather name="trash-2" size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View className="py-20 px-8 items-center justify-center">
                                    <View className="w-24 h-24 bg-neutral-50 rounded-full items-center justify-center mb-8">
                                        <Feather name="calendar" size={40} color="#d4d4d4" />
                                    </View>
                                    <Text className="text-2xl font-bold text-neutral-900 mb-3 text-center">No active time blocks</Text>
                                    <Text className="text-neutral-500 text-center text-lg leading-6">
                                        You haven't set any unavailable times yet.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View className="p-6 border-t border-neutral-100 bg-white">
                <TouchableOpacity 
                    onPress={() => setShowForm(true)}
                    className="bg-black py-4 rounded-2xl items-center shadow-lg"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-lg">Add Time Block</Text>
                </TouchableOpacity>
            </View>

            <AlertModal
                visible={showAlertModal}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={() => setShowAlertModal(false)}
            />
        </View>
    </SafeAreaView>
);
}
