import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth';

export function Header() {
    const { user } = useAuth();

    return (
        <View className="bg-white border-b border-neutral-100 px-6 py-4">
            <View className="flex-row items-center justify-between max-w-7xl mx-auto w-full">
                {/* Logo */}
                <Link href="/" asChild>
                    <TouchableOpacity>
                        <Text className="text-2xl font-bold">Stilo.</Text>
                    </TouchableOpacity>
                </Link>

                {/* Navigation */}
                <View className="flex-row items-center gap-6">
                    {user ? (
                        <>
                            <Link href="/(tabs)" asChild>
                                <TouchableOpacity>
                                    <Text className="text-neutral-700 font-medium">Dashboard</Text>
                                </TouchableOpacity>
                            </Link>
                            <Link href="/(tabs)/profile" asChild>
                                <TouchableOpacity>
                                    <Text className="text-neutral-700 font-medium">Profile</Text>
                                </TouchableOpacity>
                            </Link>
                        </>
                    ) : (
                        <Link href="/sign-in" asChild>
                            <TouchableOpacity className="bg-black px-6 py-2.5 rounded-xl">
                                <Text className="text-white font-medium">Sign In</Text>
                            </TouchableOpacity>
                        </Link>
                    )}
                </View>
            </View>
        </View>
    );
}
