import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';

interface BusinessHoursFormProps {
    data: BusinessHours[];
    onChange: (hours: BusinessHours[]) => void;
}

export interface BusinessHours {
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

export function BusinessHoursForm({ data, onChange }: BusinessHoursFormProps) {
    const [hours, setHours] = useState<BusinessHours[]>(
        data.length > 0 ? data : DAYS.map(day => ({
            ...day,
            is_closed: day.day_of_week === 0, // Sunday closed by default
            ...DEFAULT_HOURS,
        }))
    );

    const toggleDay = (dayIndex: number) => {
        const newHours = [...hours];
        newHours[dayIndex].is_closed = !newHours[dayIndex].is_closed;
        setHours(newHours);
        onChange(newHours);
    };

    const updateTime = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
        const newHours = [...hours];
        newHours[dayIndex][field] = value;
        setHours(newHours);
        onChange(newHours);
    };

    return (
        <View className="space-y-3">
            <Text className="text-sm text-neutral-600 mb-2">
                Set your business hours for each day of the week
            </Text>

            {hours.map((day, index) => (
                <View key={day.day_of_week} className="bg-neutral-50 rounded-2xl p-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="font-semibold text-base">{day.day_name}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-sm text-neutral-600 mr-2">
                                {day.is_closed ? 'Closed' : 'Open'}
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
                                <Text className="text-xs text-neutral-600 mb-1">Open</Text>
                                <TouchableOpacity className="h-12 bg-white rounded-xl px-3 border border-neutral-200 justify-center">
                                    <Text className="text-base">{day.open_time}</Text>
                                </TouchableOpacity>
                            </View>

                            <Feather name="arrow-right" size={16} color="#737373" className="mt-5" />

                            <View className="flex-1">
                                <Text className="text-xs text-neutral-600 mb-1">Close</Text>
                                <TouchableOpacity className="h-12 bg-white rounded-xl px-3 border border-neutral-200 justify-center">
                                    <Text className="text-base">{day.close_time}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            ))}

            <View className="bg-blue-50 rounded-xl p-4 mt-2">
                <View className="flex-row items-start">
                    <Feather name="info" size={16} color="#3b82f6" className="mt-0.5" />
                    <Text className="text-sm text-blue-900 ml-2 flex-1">
                        You can update your hours anytime from your dashboard
                    </Text>
                </View>
            </View>
        </View>
    );
}
