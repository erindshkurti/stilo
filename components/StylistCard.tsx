import { Feather } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface StylistCardProps {
    name: string;
    location: string;
    rating: number;
    reviewCount: number;
    imageUrl: string;
    onPress?: () => void;
}

export function StylistCard({ name, location, rating, reviewCount, imageUrl, onPress }: StylistCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm"
            activeOpacity={0.7}
        >
            {/* Image */}
            <View className="w-full h-48 bg-neutral-100">
                <Image
                    source={{ uri: imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
            </View>

            {/* Content */}
            <View className="p-4">
                <Text className="text-xl font-bold text-neutral-900 mb-1.5">{name}</Text>

                {/* Location */}
                <View className="flex-row items-center mb-2">
                    <Feather name="map-pin" size={16} color="#737373" />
                    <Text className="text-base text-neutral-600 ml-1.5">{location}</Text>
                </View>

                {/* Rating */}
                <View className="flex-row items-center">
                    <Feather name="star" size={18} color="#F59E0B" fill="#F59E0B" />
                    <Text className="text-base font-semibold text-neutral-900 ml-1.5">{rating.toFixed(1)}</Text>
                    <Text className="text-base text-neutral-500 ml-1">({reviewCount})</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}
