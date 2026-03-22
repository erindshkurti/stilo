import { Feather } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';

export default function ProfileScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { user, isLoading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile fields
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const isLargeScreen = width > 768;
    const containerMaxWidth = isLargeScreen ? 600 : width - 48;

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/sign-in?returnTo=/profile');
            return;
        }

        async function fetchProfile() {
            if (!user) return;
            try {
                const docSnap = await getDoc(doc(db, 'profiles', user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setDisplayName(data.display_name || '');
                    setPhone(data.phone || '');
                    setEmail(data.email || user.email || '');
                } else {
                    setEmail(user.email || '');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [user, authLoading]);

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'profiles', user.uid), {
                display_name: displayName,
                phone: phone,
            }, { merge: true });
            
            if (typeof window !== 'undefined' && window.alert) {
                window.alert('Profile updated successfully');
            } else {
                Alert.alert('Success', 'Profile updated successfully');
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            if (typeof window !== 'undefined' && window.alert) {
                window.alert('Failed to update profile');
            } else {
                Alert.alert('Error', 'Failed to update profile');
            }
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || loading) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <Header />
                <View className="flex-1 items-center justify-center">
                    <Text className="text-neutral-500">Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Header />

            <ScrollView className="flex-1">
                <View className="px-6 py-8 items-center">
                    <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
                        <Text className={`font-bold mb-2 ${isLargeScreen ? 'text-4xl' : 'text-3xl'}`}>
                            Profile
                        </Text>
                        <Text className="text-neutral-600 mb-8">
                            Update your personal information
                        </Text>

                        <View className="space-y-6">
                            <View>
                                <Text className="font-semibold text-neutral-900 mb-2 px-1">Email</Text>
                                <TextInput
                                    value={email}
                                    editable={false}
                                    className="h-14 bg-neutral-100 rounded-2xl px-4 border border-neutral-200 text-neutral-500 text-base"
                                />
                                <Text className="text-neutral-500 text-xs mt-2 px-1">Email cannot be changed natively at this time.</Text>
                            </View>

                            <View>
                                <Text className="font-semibold text-neutral-900 mb-2 px-1">Full Name</Text>
                                <TextInput
                                    placeholder="Enter your full name"
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-black text-base"
                                />
                            </View>

                            <View>
                                <Text className="font-semibold text-neutral-900 mb-2 px-1">Phone Number</Text>
                                <TextInput
                                    placeholder="Enter your phone number"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    className="h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200 focus:border-black text-base"
                                />
                            </View>

                            <View className="mt-4">
                                <Button
                                    label="Save Profile"
                                    loading={saving}
                                    onPress={handleSave}
                                    className="w-full"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
