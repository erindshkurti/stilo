import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ServicesFormProps {
    data: Service[];
    onChange: (services: Service[]) => void;
}

export interface Service {
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    category: string;
}

const CATEGORIES = ['Haircut', 'Color', 'Styling', 'Treatment', 'Other'];

export function ServicesForm({ data, onChange }: ServicesFormProps) {
    const [services, setServices] = useState<Service[]>(data.length > 0 ? data : []);
    const [currentService, setCurrentService] = useState<Service>({
        name: '',
        description: '',
        duration_minutes: 60,
        price: 0,
        category: 'Haircut',
    });

    const addService = () => {
        if (currentService.name.trim() && currentService.price > 0) {
            const newServices = [...services, currentService];
            setServices(newServices);
            onChange(newServices);
            setCurrentService({
                name: '',
                description: '',
                duration_minutes: 60,
                price: 0,
                category: 'Haircut',
            });
        }
    };

    const removeService = (index: number) => {
        const newServices = services.filter((_, i) => i !== index);
        setServices(newServices);
        onChange(newServices);
    };

    return (
        <View className="space-y-4">
            <Text className="text-sm text-neutral-600 mb-2">
                Add the services you offer with pricing
            </Text>

            {/* Added Services List */}
            {services.length > 0 && (
                <View className="space-y-2 mb-4">
                    {services.map((service, index) => (
                        <View key={index} className="bg-neutral-50 rounded-2xl p-4">
                            <View className="flex-row items-start justify-between mb-2">
                                <View className="flex-1">
                                    <Text className="font-semibold text-base">{service.name}</Text>
                                    <Text className="text-xs text-neutral-500 mt-1">{service.category}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeService(index)}
                                    className="ml-3 p-2"
                                >
                                    <Feather name="trash-2" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm text-neutral-600">
                                    {service.duration_minutes} min
                                </Text>
                                <Text className="font-semibold text-lg">${service.price}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Add New Service Form */}
            <View className="bg-neutral-50 rounded-2xl p-4 space-y-3">
                <Text className="font-semibold text-base mb-2">
                    {services.length === 0 ? 'Add Your First Service' : 'Add Another Service'}
                </Text>

                <View>
                    <Text className="text-sm font-medium text-neutral-700 mb-2">Service Name</Text>
                    <TextInput
                        placeholder="e.g., Women's Haircut"
                        value={currentService.name}
                        onChangeText={(value) => setCurrentService({ ...currentService, name: value })}
                        className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-neutral-700 mb-2">Category</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setCurrentService({ ...currentService, category: cat })}
                                className={`px-4 py-2 rounded-xl border ${currentService.category === cat
                                        ? 'bg-black border-black'
                                        : 'bg-white border-neutral-200'
                                    }`}
                            >
                                <Text className={currentService.category === cat ? 'text-white' : 'text-neutral-700'}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="flex-row gap-3">
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-neutral-700 mb-2">Duration (min)</Text>
                        <TextInput
                            placeholder="60"
                            value={currentService.duration_minutes > 0 ? currentService.duration_minutes.toString() : ''}
                            onChangeText={(value) => setCurrentService({ ...currentService, duration_minutes: parseInt(value) || 0 })}
                            keyboardType="number-pad"
                            className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                        />
                    </View>

                    <View className="flex-1">
                        <Text className="text-sm font-medium text-neutral-700 mb-2">Price ($)</Text>
                        <TextInput
                            placeholder="50"
                            value={currentService.price > 0 ? currentService.price.toString() : ''}
                            onChangeText={(value) => setCurrentService({ ...currentService, price: parseFloat(value) || 0 })}
                            keyboardType="decimal-pad"
                            className="h-12 bg-white rounded-xl px-4 border border-neutral-200 text-base"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={addService}
                    disabled={!currentService.name.trim() || currentService.price <= 0}
                    className={`h-12 rounded-xl items-center justify-center flex-row ${currentService.name.trim() && currentService.price > 0 ? 'bg-black' : 'bg-neutral-200'
                        }`}
                >
                    <Feather name="plus" size={20} color="white" />
                    <Text className="text-white font-medium ml-2">Add Service</Text>
                </TouchableOpacity>
            </View>

            {services.length === 0 && (
                <View className="bg-blue-50 rounded-xl p-4">
                    <View className="flex-row items-start">
                        <Feather name="info" size={16} color="#3b82f6" className="mt-0.5" />
                        <Text className="text-sm text-blue-900 ml-2 flex-1">
                            You can skip this step and add services later from your dashboard
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
