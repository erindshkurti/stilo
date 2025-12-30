import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function Header() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

    // Load user profile data
    useEffect(() => {
        async function loadProfile() {
            if (!user) {
                setAvatarUrl(null);
                return;
            }

            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single();

                if (data?.avatar_url) {
                    setAvatarUrl(data.avatar_url);
                } else if (user?.user_metadata?.avatar_url) {
                    // Fallback to Google/Auth provider metadata
                    setAvatarUrl(user.user_metadata.avatar_url);
                }
            } catch (error) {
                console.error('Error loading profile:', error);

                // Fallback on error too
                if (user?.user_metadata?.avatar_url) {
                    setAvatarUrl(user.user_metadata.avatar_url);
                }
            }
        }

        loadProfile();
    }, [user]);

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
        <View className="bg-white border-b border-neutral-100" style={{ overflow: 'visible', zIndex: 50 }}>
            <View className="px-6 py-4" style={{ overflow: 'visible' }}>
                <View className="flex-row items-center justify-between mx-auto w-full" style={{ overflow: 'visible', maxWidth: 1200 }}>
                    {/* Logo */}
                    <Link href="/?noredirect=true" asChild>
                        <TouchableOpacity onPress={() => setMenuOpen(false)}>
                            <Text className="text-2xl font-bold">Stilo</Text>
                        </TouchableOpacity>
                    </Link>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <View className="flex-row items-center gap-6">
                            {user ? (
                                <>
                                    {isBusinessOwner && (
                                        <TouchableOpacity onPress={() => router.push('/business/dashboard')}>
                                            <Text className="text-neutral-700 font-medium">Dashboard</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Unified Profile Dropdown */}
                                    <View style={{ position: 'relative', zIndex: 9999 }} data-dropdown="profile">
                                        <TouchableOpacity
                                            onPress={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                            className="w-10 h-10 rounded-full overflow-hidden items-center justify-center"
                                            style={{
                                                backgroundColor: avatarUrl ? 'transparent' : '#f5f5f5',
                                                borderWidth: 2,
                                                borderColor: '#e5e5e5',
                                            }}
                                        >
                                            {avatarUrl ? (
                                                <Image
                                                    source={{ uri: avatarUrl }}
                                                    style={{ width: 36, height: 36, borderRadius: 18 }}
                                                />
                                            ) : (
                                                <Feather name="user" size={20} color="#000" />
                                            )}
                                        </TouchableOpacity>

                                        {profileDropdownOpen ? (
                                            <View
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 48,
                                                    width: 192,
                                                    zIndex: 10000,
                                                    // @ts-ignore - web only style
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                                }}
                                                className="bg-white rounded-xl border border-neutral-200 py-2"
                                                // @ts-ignore - stop propagation to prevent closing when clicking inside
                                                onClick={(e: any) => e.stopPropagation()}
                                            >
                                                {isBusinessOwner ? (
                                                    <Link href="/business/settings" asChild>
                                                        <TouchableOpacity
                                                            onPress={() => setProfileDropdownOpen(false)}
                                                            className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                        >
                                                            <Feather name="settings" size={18} color="#737373" />
                                                            <Text className="ml-3 text-neutral-900">Settings</Text>
                                                        </TouchableOpacity>
                                                    </Link>
                                                ) : (
                                                    <Link href="/profile" asChild>
                                                        <TouchableOpacity
                                                            onPress={() => setProfileDropdownOpen(false)}
                                                            className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                        >
                                                            <Feather name="user" size={18} color="#737373" />
                                                            <Text className="ml-3 text-neutral-900">My Account</Text>
                                                        </TouchableOpacity>
                                                    </Link>
                                                )}

                                                <View className="h-px bg-neutral-200 my-1" />

                                                <TouchableOpacity
                                                    onPress={handleSignOut}
                                                    className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
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
                            {menuOpen ? (
                                <View className="w-8 h-8 items-center justify-center">
                                    <Feather name="x" size={24} color="#000" />
                                </View>
                            ) : user ? (
                                <View className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 items-center justify-center border border-neutral-200">
                                    {avatarUrl ? (
                                        <Image
                                            source={{ uri: avatarUrl }}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <Feather name="user" size={16} color="#000" />
                                    )}
                                </View>
                            ) : (
                                <View className="w-8 h-8 items-center justify-center">
                                    <Feather name="menu" size={24} color="#000" />
                                </View>
                            )}
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
                                        <Link href="/profile" asChild>
                                            <TouchableOpacity
                                                onPress={() => setMenuOpen(false)}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-3"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="user" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">My Account</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </Link>

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
                                )}
                            </View>
                        ) : (
                            <View className="space-y-6">
                                {/* For Customers Section */}
                                <View>
                                    <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3 px-4">
                                        For Current Customers And Businesses
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
                                        For New Businesses
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
