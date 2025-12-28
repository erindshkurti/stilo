import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function BusinessSettings() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const isLargeScreen = width > 768;
    const maxWidth = isLargeScreen ? 600 : width - 48;

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <View className="flex-1 px-6 py-8 items-center">
                <View style={{ maxWidth, width: '100%' }}>
                    <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-3xl' : 'text-2xl'}`}>
                        Settings
                    </Text>
                    <Text className="text-neutral-600 mb-8">Manage your account</Text>

                    {/* Account Info */}
                    <View className="bg-neutral-50 rounded-2xl p-6 mb-6">
                        <Text className="text-lg font-semibold mb-4">Account Information</Text>
                        <View>
                            <Text className="text-sm text-neutral-600 mb-1">Email</Text>
                            <Text className="text-base text-neutral-900 mb-4">{user?.email}</Text>

                            <Text className="text-sm text-neutral-600 mb-1">Account Type</Text>
                            <Text className="text-base text-neutral-900">Business Owner</Text>
                        </View>
                    </View>

                    {/* Sign Out */}
                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="bg-black px-8 py-4 rounded-xl"
                    >
                        <Text className="text-white font-medium text-center text-base">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
