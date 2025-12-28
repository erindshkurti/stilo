import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold mb-4">Profile</Text>
                <Text className="text-neutral-600 mb-8">{user?.email}</Text>

                <TouchableOpacity
                    onPress={handleSignOut}
                    className="bg-black px-8 py-3 rounded-xl"
                >
                    <Text className="text-white font-medium">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
