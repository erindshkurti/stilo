import { Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 480 : width - 48;

    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
            <View style={{ maxWidth: containerMaxWidth, width: '100%' }} className="items-center">
                <Text className={`font-bold mb-6 ${isLargeScreen ? 'text-2xl' : 'text-xl'}`}>
                    Your Profile
                </Text>
                <Button
                    label="Sign Out"
                    variant="outline"
                    onPress={() => supabase.auth.signOut()}
                    className="w-full"
                />
            </View>
        </SafeAreaView>
    );
}
