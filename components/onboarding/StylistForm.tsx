import { Feather } from '@expo/vector-icons';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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
    local_image_uri?: string;
    image_url?: string;
}

export function StylistForm({ data, onChange, currentStylist, onCurrentStylistChange }: StylistFormProps) {
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                onCurrentStylistChange({ ...currentStylist, local_image_uri: result.assets[0].uri });
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const removeImage = () => {
        onCurrentStylistChange({ ...currentStylist, local_image_uri: undefined });
    };

    const addStylist = () => {
        if (currentStylist.name.trim()) {
            const newStylists = [...data, currentStylist];
            onChange(newStylists);
            onCurrentStylistChange({ name: '', bio: '', specialties: [], local_image_uri: undefined });
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
                            <View className="flex-row items-center flex-1">
                                {stylist.local_image_uri ? (
                                    <Image 
                                        source={{ uri: stylist.local_image_uri }} 
                                        className="w-12 h-12 rounded-full bg-neutral-200 mr-3"
                                    />
                                ) : (
                                    <View className="w-12 h-12 rounded-full bg-neutral-200 items-center justify-center mr-3">
                                        <Feather name="user" size={18} color="#737373" />
                                    </View>
                                )}
                                <View className="flex-1">
                                    <Text className="font-semibold text-base">{stylist.name}</Text>
                                    {stylist.bio && (
                                        <Text className="text-sm text-neutral-600 mt-1" numberOfLines={1}>
                                            {stylist.bio}
                                        </Text>
                                    )}
                                </View>
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

                {/* Image Picker */}
                <View className="items-center mb-4">
                    <TouchableOpacity 
                        onPress={pickImage}
                        className="items-center justify-center w-24 h-24 rounded-full bg-white overflow-hidden border border-neutral-200"
                    >
                        {currentStylist.local_image_uri ? (
                            <Image 
                                source={{ uri: currentStylist.local_image_uri }} 
                                className="w-full h-full"
                            />
                        ) : (
                            <>
                                <Feather name="camera" size={24} color="#a3a3a3" />
                                <Text className="text-[10px] text-neutral-400 font-medium mt-1 uppercase text-center px-2">Add Photo</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    {!!currentStylist.local_image_uri && (
                        <TouchableOpacity 
                            onPress={removeImage}
                            className="mt-2"
                        >
                            <Text className="text-xs text-red-600 font-medium">Remove Photo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View>
                    <Text className="text-sm font-medium text-neutral-700 mb-2">Name</Text>
                    <TextInput
                        placeholder="e.g., Sarah Johnson"
                        value={currentStylist.name}
                        onChangeText={(value) => onCurrentStylistChange({ ...currentStylist, name: value })}
                        className="h-12 bg-white rounded-xl px-4 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base"
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
                        className="bg-white rounded-xl p-3 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-base min-h-[80px]"
                    />
                </View>

                <TouchableOpacity
                    onPress={addStylist}
                    disabled={!currentStylist.name.trim()}
                    className={`h-12 rounded-xl items-center justify-center flex-row shadow-sm ${currentStylist.name.trim() ? 'bg-black' : 'bg-neutral-200'
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
