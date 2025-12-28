import { Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-4xl' : 'text-3xl'}`}>
        Stilo
      </Text>
      <Text className={`text-neutral-500 text-center ${isLargeScreen ? 'text-lg' : 'text-base'}`}>
        Find your style.
      </Text>
    </SafeAreaView>
  );
}
