import { Text, TextInput, View } from 'react-native';

interface LocationFormProps {
    data: {
        address: string;
        city: string;
        state: string;
        zip_code: string;
        phone: string;
        email: string;
    };
    onChange: (field: string, value: string) => void;
}

export function LocationForm({ data, onChange }: LocationFormProps) {
    return (
        <View className="space-y-4">
            <View>
                <Text className="text-sm font-medium text-neutral-700 mb-2">
                    Street Address <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                    placeholder="123 Main Street"
                    value={data.address}
                    onChangeText={(value) => onChange('address', value)}
                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                />
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-sm font-medium text-neutral-700 mb-2">
                        City <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                        placeholder="New York"
                        value={data.city}
                        onChangeText={(value) => onChange('city', value)}
                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                    />
                </View>

                <View className="w-24">
                    <Text className="text-sm font-medium text-neutral-700 mb-2">
                        State
                    </Text>
                    <TextInput
                        placeholder="NY"
                        value={data.state}
                        onChangeText={(value) => onChange('state', value)}
                        maxLength={2}
                        autoCapitalize="characters"
                        className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                    />
                </View>
            </View>

            <View>
                <Text className="text-sm font-medium text-neutral-700 mb-2">
                    ZIP Code
                </Text>
                <TextInput
                    placeholder="10001"
                    value={data.zip_code}
                    onChangeText={(value) => onChange('zip_code', value)}
                    keyboardType="number-pad"
                    maxLength={5}
                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                />
            </View>

            <View>
                <Text className="text-sm font-medium text-neutral-700 mb-2">
                    Phone Number
                </Text>
                <TextInput
                    placeholder="(555) 123-4567"
                    value={data.phone}
                    onChangeText={(value) => onChange('phone', value)}
                    keyboardType="phone-pad"
                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                />
            </View>

            <View>
                <Text className="text-sm font-medium text-neutral-700 mb-2">
                    Business Email
                </Text>
                <TextInput
                    placeholder="contact@yourbusiness.com"
                    value={data.email}
                    onChangeText={(value) => onChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 text-base"
                />
            </View>
        </View>
    );
}
