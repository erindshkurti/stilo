import { Text, TextInput, View } from 'react-native';

interface BusinessDetailsFormProps {
    data: {
        name: string;
        description: string;
    };
    onChange: (field: string, value: string) => void;
}

export function BusinessDetailsForm({ data, onChange }: BusinessDetailsFormProps) {
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
        </View>
    );
}
