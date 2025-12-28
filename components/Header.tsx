import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../lib/auth';

export function Header() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const [menuOpen, setMenuOpen] = useState(false);
    const isMobile = width < 768;

    // Animation values
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (menuOpen) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [menuOpen]);

    const slideTransform = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 0],
    });

    return (
        <View className="bg-white border-b border-neutral-100">
            <View className="px-6 py-4">
                <View className="flex-row items-center justify-between max-w-7xl mx-auto w-full">
                    {/* Logo */}
                    <Link href="/" asChild>
                        <TouchableOpacity onPress={() => setMenuOpen(false)}>
                            <Text className="text-2xl font-bold">Stilo.</Text>
                        </TouchableOpacity>
                    </Link>

                    {/* Desktop Navigation */}
                    {!isMobile && (
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
                                <>
                                    <Link href="/business-signup" asChild>
                                        <TouchableOpacity>
                                            <Text className="text-neutral-700 font-medium">For Businesses</Text>
                                        </TouchableOpacity>
                                    </Link>
                                    <Link href="/sign-in" asChild>
                                        <TouchableOpacity className="bg-black px-6 py-2.5 rounded-xl">
                                            <Text className="text-white font-medium">Sign In</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </>
                            )}
                        </View>
                    )}

                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <TouchableOpacity
                            onPress={() => setMenuOpen(!menuOpen)}
                            className="p-2"
                            activeOpacity={0.7}
                        >
                            <Feather name={menuOpen ? "x" : "menu"} size={24} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Mobile Menu Dropdown */}
            {isMobile && menuOpen && (
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideTransform }],
                    }}
                    className="border-t border-neutral-100 bg-white"
                >
                    <View className="px-6 py-6">
                        {user ? (
                            <View className="space-y-3">
                                <Link href="/(tabs)" asChild>
                                    <TouchableOpacity
                                        onPress={() => setMenuOpen(false)}
                                        className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                    >
                                        <Text className="text-neutral-900 font-medium text-base">Dashboard</Text>
                                    </TouchableOpacity>
                                </Link>
                                <Link href="/(tabs)/profile" asChild>
                                    <TouchableOpacity
                                        onPress={() => setMenuOpen(false)}
                                        className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                    >
                                        <Text className="text-neutral-900 font-medium text-base">Profile</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        ) : (
                            <View className="space-y-6">
                                {/* For Customers Section */}
                                <View>
                                    <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3 px-4">
                                        For Customers
                                    </Text>
                                    <Link href="/sign-in" asChild>
                                        <TouchableOpacity
                                            onPress={() => setMenuOpen(false)}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                        >
                                            <Text className="text-neutral-900 font-medium text-base">Sign In</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>

                                {/* For Businesses Section */}
                                <View>
                                    <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3 px-4">
                                        For Businesses
                                    </Text>
                                    <Link href="/business-signup" asChild>
                                        <TouchableOpacity
                                            onPress={() => setMenuOpen(false)}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                        >
                                            <Text className="text-neutral-900 font-medium text-base">List Your Business</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>
            )}
        </View>
    );
}
