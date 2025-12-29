import { Feather } from '@expo/vector-icons';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface BusinessDetailsFormProps {
    data: {
        name: string;
        description: string;
        coverImageUrl?: string;
    };
    onChange: (field: string, value: string) => void;
    onCoverImagePick?: () => void;
    uploadingCover?: boolean;
}

export function BusinessDetailsForm({ data, onChange, onCoverImagePick, uploadingCover }: BusinessDetailsFormProps) {
    return (
        <View className="space-y-4">
            <View>
                <Text className="text-sm font-medium text-neutral-700 mb-2">
                    Business Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                    placeholder="e.g., Bella Hair Studio"
                    value={data.name}
                    onChangeText={(value) => onChange('name', value)}
                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                />
            </View>

            <View>
                <Text className="text-sm font-medium text-neutral-700 mb-2">
                    Description
                </Text>
                <TextInput
                    placeholder="Tell customers about your business..."
                    value={data.description}
                    onChangeText={(value) => onChange('description', value)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 text-base min-h-[100px]"
                />
                <Text className="text-xs text-neutral-500 mt-1">
                    This will be shown on your business profile
                </Text>
            </View>

            {/* Cover Image Upload */}
            {onCoverImagePick && (
                <View>
                    <Text className="text-sm font-medium text-neutral-700 mb-2">
                        Cover Image
                    </Text>
                    <Text className="text-xs text-neutral-500 mb-3">
                        Upload a cover image for your business profile (16:9 aspect ratio recommended)
                    </Text>

                    {data.coverImageUrl ? (
                        <View className="mb-3">
                            <Image
                                source={{ uri: data.coverImageUrl }}
                                style={{
                                    width: '100%',
                                    height: 150,
                                    borderRadius: 12
                                }}
                                resizeMode="cover"
                            />
                        </View>
                    ) : (
                        <View className="bg-neutral-50 rounded-xl p-8 mb-3 items-center border border-neutral-200" style={{ height: 150, justifyContent: 'center' }}>
                            <Feather name="image" size={48} color="#d4d4d4" />
                            <Text className="text-neutral-400 mt-2">No cover image</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={onCoverImagePick}
                        disabled={uploadingCover}
                        className={`py-3 rounded-xl ${uploadingCover ? 'bg-neutral-300' : 'bg-black'}`}
                    >
                        <Text className="text-white font-medium text-center">
                            {uploadingCover ? 'Uploading...' : data.coverImageUrl ? 'Update Cover Image' : 'Upload Cover Image'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
