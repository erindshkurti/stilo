import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function Header() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const isMobile = width < 768;

    // Check if user is a business owner
    const isBusinessOwner = user?.user_metadata?.user_type === 'business';

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

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setProfileDropdownOpen(false);
        router.replace('/');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        if (typeof window !== 'undefined' && profileDropdownOpen) {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                // Check if click is outside the dropdown or on a button inside it
                const dropdownContainer = target.closest('[data-dropdown="profile"]');
                const isButton = target.closest('[role="button"]');

                if (!dropdownContainer && !isButton) {
                    setProfileDropdownOpen(false);
                }
            };

            // Add a small delay to prevent immediate closing
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 100);

            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [profileDropdownOpen]);

    return (
        <View className="bg-white border-b border-neutral-100" style={{ overflow: 'visible' }}>
            <View className="px-6 py-4" style={{ overflow: 'visible' }}>
                <View className="flex-row items-center justify-between max-w-7xl mx-auto w-full" style={{ overflow: 'visible' }}>
                    {/* Logo */}
                    <TouchableOpacity onPress={() => {
                        setMenuOpen(false);
                        router.push('/');
                    }}>
                        <Text className="text-2xl font-bold">Stilo.</Text>
                    </TouchableOpacity>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <View className="flex-row items-center gap-6">
                            {user ? (
                                <>
                                    {isBusinessOwner ? (
                                        <>
                                            <TouchableOpacity onPress={() => router.push('/business/dashboard')}>
                                                <Text className="text-neutral-700 font-medium">Dashboard</Text>
                                            </TouchableOpacity>

                                            {/* Profile Dropdown */}
                                            <View style={{ position: 'relative', zIndex: 9999 }} data-dropdown="profile">
                                                <TouchableOpacity
                                                    onPress={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                                    className="w-10 h-10 bg-neutral-100 rounded-full items-center justify-center"
                                                >
                                                    <Feather name="user" size={20} color="#000" />
                                                </TouchableOpacity>

                                                {profileDropdownOpen ? (
                                                    <View
                                                        style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: 48,
                                                            width: 192,
                                                            zIndex: 10000,
                                                            pointerEvents: 'auto',
                                                        }}
                                                        className="bg-white rounded-xl shadow-lg border border-neutral-200 py-2"
                                                    >
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                console.log('Settings clicked');
                                                                router.push('/business/settings');
                                                            }}
                                                            className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <Feather name="settings" size={18} color="#737373" />
                                                            <Text className="ml-3 text-neutral-900">Settings</Text>
                                                        </TouchableOpacity>

                                                        <View className="h-px bg-neutral-200 my-1" />

                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                console.log('Sign out clicked');
                                                                handleSignOut();
                                                            }}
                                                            className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <Feather name="log-out" size={18} color="#737373" />
                                                            <Text className="ml-3 text-neutral-900">Sign Out</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                                                <Text className="text-neutral-700 font-medium">Dashboard</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                                                <Text className="text-neutral-700 font-medium">Profile</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Link href="/business-signup" asChild>
                                        <TouchableOpacity>
                                            <Text className="text-neutral-700 font-medium">Add Your Business</Text>
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
                            <View>
                                {isBusinessOwner ? (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setMenuOpen(false);
                                                router.push('/business/dashboard');
                                            }}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-3"
                                        >
                                            <Text className="text-neutral-900 font-medium text-base">Dashboard</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setMenuOpen(false);
                                                router.push('/business/settings');
                                            }}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-3"
                                        >
                                            <View className="flex-row items-center">
                                                <Feather name="settings" size={18} color="#737373" />
                                                <Text className="ml-3 text-neutral-900 font-medium text-base">Settings</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setMenuOpen(false);
                                                handleSignOut();
                                            }}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                        >
                                            <View className="flex-row items-center">
                                                <Feather name="log-out" size={18} color="#737373" />
                                                <Text className="ml-3 text-neutral-900 font-medium text-base">Sign Out</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setMenuOpen(false);
                                                router.push('/(tabs)');
                                            }}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-3"
                                        >
                                            <Text className="text-neutral-900 font-medium text-base">Dashboard</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setMenuOpen(false);
                                                router.push('/(tabs)/profile');
                                            }}
                                            className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                        >
                                            <Text className="text-neutral-900 font-medium text-base">Profile</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
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
