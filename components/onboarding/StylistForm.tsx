import { Feather } from '@expo/vector-icons';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface StylistFormProps {
    data: Stylist[];
    onChange: (stylists: Stylist[]) => void;
    currentStylist: Stylist;
    onCurrentStylistChange: (stylist: Stylist) => void;
}

export interface Stylist {
    name: string;
    bio: string;
    specialties: string[];
}

export function StylistForm({ data, onChange, currentStylist, onCurrentStylistChange }: StylistFormProps) {
    // We only keep the list state here or let parent handle it too? 
    // The parent passed `data` (the list) and `onChange`.
    // The previous implementation had `useState` for `stylists` initialized from `data`.
    // Ideally, we should just use `data` directly to be a controlled component fully.
    // The previous implementation was a bit hybrid (props init state).
    // Let's rely on props.

    const addStylist = () => {
        if (currentStylist.name.trim()) {
            const newStylists = [...data, currentStylist];
            onChange(newStylists);
            onCurrentStylistChange({ name: '', bio: '', specialties: [] });
        }
    };

    const removeStylist = (index: number) => {
        const newStylists = data.filter((_, i) => i !== index);
        onChange(newStylists);
    };

    return (
        <View className="space-y-4">
            <Text className="text-sm text-neutral-600 mb-2">
                Add your team members or leave empty if you work alone
            </Text>

            {/* Added Stylists List */}
            {data.length > 0 && (
                <View className="space-y-2 mb-4">
                    {data.map((stylist, index) => (
                        <View key={index} className="bg-neutral-50 rounded-2xl p-4 flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="font-semibold text-base">{stylist.name}</Text>
                                {stylist.bio && (
                                    <Text className="text-sm text-neutral-600 mt-1" numberOfLines={1}>
                                        {stylist.bio}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => removeStylist(index)}
                                className="ml-3 p-2"
                            >
                                <Feather name="trash-2" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Add New Stylist Form */}
            <View className="bg-neutral-50 rounded-2xl p-4 space-y-3">
                <Text className="font-semibold text-base mb-2">
                    {data.length === 0 ? 'Add Your First Team Member' : 'Add Another Team Member'}
                </Text>

                <View>
                    <Text className="text-sm font-medium text-neutral-700 mb-2">Name</Text>
                    <TextInput
                        placeholder="e.g., Sarah Johnson"
                        value={currentStylist.name}
                        onChangeText={(value) => onCurrentStylistChange({ ...currentStylist, name: value })}
                        className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-neutral-700 mb-2">Bio (Optional)</Text>
                    <TextInput
                        placeholder="Brief description of their expertise..."
                        value={currentStylist.bio}
                        onChangeText={(value) => onCurrentStylistChange({ ...currentStylist, bio: value })}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        className="bg-white rounded-xl p-3 border border-neutral-200 text-base min-h-[80px]"
                    />
                </View>

                <TouchableOpacity
                    onPress={addStylist}
                    disabled={!currentStylist.name.trim()}
                    className={`h-12 rounded-xl items-center justify-center flex-row ${currentStylist.name.trim() ? 'bg-black' : 'bg-neutral-200'
                        }`}
                >
                    <Feather name="plus" size={20} color="white" />
                    <Text className="text-white font-medium ml-2">Add Team Member</Text>
                </TouchableOpacity>
            </View>

            {data.length === 0 && (
                <View className="bg-blue-50 rounded-xl p-4">
                    <View className="flex-row items-start">
                        <Feather name="info" size={16} color="#3b82f6" className="mt-0.5" />
                        <Text className="text-sm text-blue-900 ml-2 flex-1">
                            You can skip this step and add team members later from your dashboard
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
