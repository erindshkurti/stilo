import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, TouchableOpacity, useWindowDimensions, View, Platform } from 'react-native';
import { useAuth } from '../lib/auth';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
    showBack?: boolean;
    backHref?: string;
    backLabel?: string;
}

export function Header({ showBack = false, backHref, backLabel = 'Back' }: HeaderProps) {
    const { user } = useAuth();
    let canGoBack = false;
    try {
        canGoBack = router.canGoBack();
    } catch (e) {
        // Navigation not ready
    }
    const { width } = useWindowDimensions();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const isMobile = width < 768;
    const insets = useSafeAreaInsets();

    // Check user roles
    const [isBusinessOwner, setIsBusinessOwner] = useState(false);
    const [isStylist, setIsStylist] = useState(false);
    const [userType, setUserType] = useState<string | null>(null);

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
        await signOut(auth);
        setProfileDropdownOpen(false);
        router.replace('/');
    };

    // Load user profile data
    useEffect(() => {
        async function loadProfile() {
            if (!user) {
                setAvatarUrl(null);
                setIsBusinessOwner(false);
                setIsStylist(false);
                setUserType(null);
                return;
            }

            // Try Firebase user photo first
            if (user.photoURL) setAvatarUrl(user.photoURL);

            try {
                const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    setUserType(data.user_type);
                    setIsBusinessOwner(data.user_type === 'business_owner');
                    setIsStylist(data.user_type === 'stylist');
                    setDisplayName(data.full_name || data.display_name || null);
                    if (data.avatar_url) {
                        setAvatarUrl(data.avatar_url);
                    } else if (data.user_type === 'stylist' && data.business_id) {
                        // Fallback: Try to get avatar from stylist record
                        const stylistsSnap = await getDocs(
                            query(collection(db, 'businesses', data.business_id, 'stylists'), where('userId', '==', user.uid))
                        );
                        if (!stylistsSnap.empty) {
                            const stylistData = stylistsSnap.docs[0].data();
                            if (stylistData.image_url) setAvatarUrl(stylistData.image_url);
                        }
                    }
                }
            } catch (error: any) {
                if (error.message?.includes('requires an index')) {
                    console.warn('Calendar query failed: Missing Firestore index. Please click the link in your console to create it.');
                }
                console.error('Error loading profile:', error); // Changed from 'calendar' to 'profile' for context
            }
        }

        loadProfile();
    }, [user]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                
                // Handle Profile Dropdown
                if (profileDropdownOpen) {
                    const dropdownContainer = target.closest('[data-dropdown="profile"]');
                    const isButton = target.closest('[role="button"]');
                    if (!dropdownContainer && !isButton) {
                        setProfileDropdownOpen(false);
                    }
                }

                // Handle Business Dropdown
                if (businessDropdownOpen) {
                    const dropdownContainer = target.closest('[data-dropdown="business"]');
                    const isButton = target.closest('[role="button"]');
                    if (!dropdownContainer && !isButton) {
                        setBusinessDropdownOpen(false);
                    }
                }
            };

            // Add a small delay to prevent immediate closing
            setTimeout(() => {
                // @ts-ignore - web only
                document.addEventListener('click', handleClickOutside);
            }, 100);

            return () => {
                // @ts-ignore - web only
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [profileDropdownOpen, businessDropdownOpen]);

    return (
        <View className="bg-white border-b border-neutral-100" style={{ overflow: 'visible', zIndex: 1000 }}>
            <View className="px-6 pb-4 pt-2" style={{ overflow: 'visible' }}>
                <View className="flex-row items-center justify-between mx-auto w-full" style={{ overflow: 'visible', maxWidth: 1200 }}>
                    {/* Navigation / Logo */}
                    <View className="flex-row items-center">
                        {showBack ? (
                            <TouchableOpacity 
                                onPress={() => {
                                    if (router.canGoBack()) {
                                        router.back();
                                    } else if (backHref) {
                                        router.replace(backHref as any);
                                    } else {
                                        router.replace('/');
                                    }
                                }}
                                className="flex-row items-center py-2 -ml-2 px-2"
                            >
                                <Feather name="arrow-left" size={24} color="#000" />
                                <Text className="ml-2 font-medium text-lg text-neutral-900">{backLabel}</Text>
                            </TouchableOpacity>
                        ) : (
                            <Link href="/" asChild>
                                <TouchableOpacity onPress={() => setMenuOpen(false)}>
                                    <Text className="text-2xl font-bold text-neutral-900">Stilo</Text>
                                </TouchableOpacity>
                            </Link>
                        )}
                    </View>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <View className="flex-row items-center gap-6">
                            {user ? (
                                <>
                                    {(isBusinessOwner || isStylist) && (
                                        <View style={{ position: 'relative', zIndex: 9999 }} data-dropdown="business">
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setBusinessDropdownOpen(!businessDropdownOpen);
                                                    setProfileDropdownOpen(false);
                                                }}
                                                className="w-10 h-10 rounded-full items-center justify-center bg-neutral-50 border border-neutral-200"
                                            >
                                                <Feather name="briefcase" size={20} color="#000" />
                                            </TouchableOpacity>

                                            {businessDropdownOpen && (
                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: 48,
                                                        width: 200,
                                                        zIndex: 10000,
                                                        // @ts-ignore - web only style
                                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                                    }}
                                                    className="bg-white rounded-xl border border-neutral-200 py-2 shadow-xl"
                                                >
                                                    <View className="px-4 py-2 border-b border-neutral-50 mb-1">
                                                        <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Business Tools</Text>
                                                    </View>
                                                    
                                                    {isBusinessOwner ? (
                                                        <>
                                                            <Link href="/business/dashboard" asChild>
                                                                <TouchableOpacity
                                                                    onPress={() => setBusinessDropdownOpen(false)}
                                                                    className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                                >
                                                                    <Feather name="layout" size={18} color="#737373" />
                                                                    <Text className="ml-3 text-neutral-900 font-medium">Dashboard</Text>
                                                                </TouchableOpacity>
                                                            </Link>
                                                            <Link href="/business/calendar" asChild>
                                                                <TouchableOpacity
                                                                    onPress={() => setBusinessDropdownOpen(false)}
                                                                    className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                                >
                                                                    <Feather name="grid" size={18} color="#737373" />
                                                                    <Text className="ml-3 text-neutral-900 font-medium">Staff Calendar</Text>
                                                                </TouchableOpacity>
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Link href="/stylist/dashboard" asChild>
                                                                <TouchableOpacity
                                                                    onPress={() => setBusinessDropdownOpen(false)}
                                                                    className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                                >
                                                                    <Feather name="layout" size={18} color="#737373" />
                                                                    <Text className="ml-3 text-neutral-900 font-medium">My Work Bookings</Text>
                                                                </TouchableOpacity>
                                                            </Link>
                                                            <Link href="/stylist/hours" asChild>
                                                                <TouchableOpacity
                                                                    onPress={() => setBusinessDropdownOpen(false)}
                                                                    className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                                >
                                                                    <Feather name="clock" size={18} color="#737373" />
                                                                    <Text className="ml-3 text-neutral-900 font-medium">Working Hours</Text>
                                                                </TouchableOpacity>
                                                            </Link>
                                                            <Link href="/stylist/blocks" asChild>
                                                                <TouchableOpacity
                                                                    onPress={() => setBusinessDropdownOpen(false)}
                                                                    className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                                >
                                                                    <Feather name="slash" size={18} color="#737373" />
                                                                    <Text className="ml-3 text-neutral-900 font-medium">Blocked Time</Text>
                                                                </TouchableOpacity>
                                                            </Link>
                                                        </>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    )}


                                    {/* Unified Profile Dropdown */}
                                    <View style={{ position: 'relative', zIndex: 9999 }} data-dropdown="profile">
                                        <TouchableOpacity
                                            onPress={() => {
                                                setProfileDropdownOpen(!profileDropdownOpen);
                                                setBusinessDropdownOpen(false);
                                            }}
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

                                        {profileDropdownOpen && (
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
                                                className="bg-white rounded-xl border border-neutral-200 py-2 shadow-lg"
                                            >
                                                <View className="px-4 py-3 border-b border-neutral-100 mb-1">
                                                    <Text className="text-neutral-900 font-semibold text-base">
                                                        {displayName || user?.email?.split('@')[0] || 'Account'}
                                                    </Text>
                                                </View>
                                                
                                                {isBusinessOwner && (
                                                    <>
                                                        <Link href="/bookings" asChild>
                                                            <TouchableOpacity
                                                                onPress={() => setProfileDropdownOpen(false)}
                                                                className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            >
                                                                <Feather name="calendar" size={18} color="#737373" />
                                                                <Text className="ml-3 text-neutral-900">My Personal Bookings</Text>
                                                            </TouchableOpacity>
                                                        </Link>
                                                        <Link href="/business/profile" asChild>
                                                            <TouchableOpacity
                                                                onPress={() => setProfileDropdownOpen(false)}
                                                                className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            >
                                                                <Feather name="user" size={18} color="#737373" />
                                                                <Text className="ml-3 text-neutral-900">My Profile</Text>
                                                            </TouchableOpacity>
                                                        </Link>
                                                    </>
                                                )}

                                                {isStylist && (
                                                    <>
                                                        <Link href="/bookings" asChild>
                                                            <TouchableOpacity
                                                                onPress={() => setProfileDropdownOpen(false)}
                                                                className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            >
                                                                <Feather name="calendar" size={18} color="#737373" />
                                                                <Text className="ml-3 text-neutral-900">Personal Bookings</Text>
                                                            </TouchableOpacity>
                                                        </Link>
                                                        <Link href="/profile" asChild>
                                                            <TouchableOpacity
                                                                onPress={() => setProfileDropdownOpen(false)}
                                                                className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            >
                                                                <Feather name="user" size={18} color="#737373" />
                                                                <Text className="ml-3 text-neutral-900">My Profile</Text>
                                                            </TouchableOpacity>
                                                        </Link>
                                                    </>
                                                )}

                                                {!isBusinessOwner && !isStylist && (
                                                    <>
                                                        <Link href="/bookings" asChild>
                                                            <TouchableOpacity
                                                                onPress={() => setProfileDropdownOpen(false)}
                                                                className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            >
                                                                <Feather name="calendar" size={18} color="#737373" />
                                                                <Text className="ml-3 text-neutral-900">Bookings</Text>
                                                            </TouchableOpacity>
                                                        </Link>
                                                        <Link href="/profile" asChild>
                                                            <TouchableOpacity
                                                                onPress={() => setProfileDropdownOpen(false)}
                                                                className="px-4 py-3 flex-row items-center hover:bg-neutral-50"
                                                            >
                                                                <Feather name="user" size={18} color="#737373" />
                                                                <Text className="ml-3 text-neutral-900">Profile</Text>
                                                            </TouchableOpacity>
                                                        </Link>
                                                    </>
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
                                        )}
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
                                        <View className="mb-4">
                                            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-4">Business Tools</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/business/dashboard');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="layout" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">Dashboard</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/business/calendar');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="grid" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">Staff Calendar</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        <View className="mb-4">
                                            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-4">Personal Account</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/bookings');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="calendar" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">My Personal Bookings</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/business/profile');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="user" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">My Profile</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : isStylist ? (
                                    <>
                                        <View className="mb-4">
                                            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-4">Business Tools</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/stylist/dashboard');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="layout" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">My Work Bookings</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/stylist/hours');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="clock" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">Working Hours</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/stylist/blocks');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="slash" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">Blocked Time</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        <View className="mb-4">
                                            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-4">Personal Account</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/bookings');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="calendar" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">My Personal Bookings</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuOpen(false);
                                                    router.push('/profile');
                                                }}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="user" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">My Profile</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/bookings" asChild>
                                            <TouchableOpacity
                                                onPress={() => setMenuOpen(false)}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="calendar" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">Bookings</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </Link>

                                        <Link href="/profile" asChild>
                                            <TouchableOpacity
                                                onPress={() => setMenuOpen(false)}
                                                className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                            >
                                                <View className="flex-row items-center">
                                                    <Feather name="user" size={18} color="#737373" />
                                                    <Text className="ml-3 text-neutral-900 font-medium text-base">Profile</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </Link>
                                    </>
                                )}

                                <TouchableOpacity
                                    onPress={() => {
                                        setMenuOpen(false);
                                        handleSignOut();
                                    }}
                                    className="py-3 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100 mb-2"
                                >
                                    <View className="flex-row items-center">
                                        <Feather name="log-out" size={18} color="#737373" />
                                        <Text className="ml-3 text-neutral-900 font-medium text-base">Sign Out</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="gap-8">
                                {/* For Customers Section */}
                                <View>
                                    <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 px-4">
                                        For Users and Businesses
                                    </Text>
                                    <Link href="/sign-in" asChild>
                                        <TouchableOpacity
                                            onPress={() => setMenuOpen(false)}
                                            className="py-4 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
                                        >
                                            <Text className="text-neutral-900 font-medium text-base">Sign In</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>

                                {/* For Businesses Section */}
                                <View>
                                    <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 px-4">
                                        For New Businesses
                                    </Text>
                                    <Link href="/business-signup" asChild>
                                        <TouchableOpacity
                                            onPress={() => setMenuOpen(false)}
                                            className="py-4 px-4 bg-neutral-50 rounded-xl active:bg-neutral-100"
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
