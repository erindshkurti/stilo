import { Feather } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface TimePickerProps {
    value: string; // "HH:mm"
    onChange: (time: string) => void;
    placeholder?: string;
    className?: string;
    [key: string]: any;
}

export function TimePicker({ value, onChange, placeholder, className, ...props }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // Generate times from 00:00 to 23:30 in 30-minute intervals
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            times.push(time);
        }
    }

    // Auto-scroll logic
    useEffect(() => {
        if (isOpen && value) {
            const index = times.indexOf(value);
            if (index !== -1) {
                // Wait a tiny bit for the View to be ready and measured
                setTimeout(() => {
                    scrollRef.current?.scrollTo({
                        y: index * 48, // Based on h-12 (48px)
                        animated: false
                    });
                }, 10);
            }
        }
    }, [isOpen, value]);

    const handleSelect = (time: string) => {
        onChange(time);
        setIsOpen(false);
    };

    return (
        <View className={`relative flex-1 ${className}`} style={{ zIndex: isOpen ? 1000 : 1 }}>
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                className="w-full h-full justify-center"
            >
                <View className="flex-row items-center justify-between">
                    <Text className={`text-base ${value ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {value || placeholder || "Select Time"}
                    </Text>
                    <Feather name="chevron-down" size={16} color="#a3a3a3" />
                </View>
            </TouchableOpacity>

            {isOpen && (
                <>
                    <TouchableOpacity
                        activeOpacity={1}
                        className="absolute w-[9999px] h-[9999px] top-[-5000px] left-[-5000px] bg-transparent"
                        style={Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 } as any : { zIndex: 40 }}
                        onPress={() => setIsOpen(false)}
                    />

                    <View className="absolute top-full left-0 mt-1 w-full max-h-60 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50">
                        <ScrollView 
                            ref={scrollRef}
                            showsVerticalScrollIndicator={false}
                        >
                            {times.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => handleSelect(t)}
                                    className={`h-12 px-4 justify-center border-b border-neutral-50 ${value === t ? 'bg-neutral-50' : ''}`}
                                >
                                    <Text className={`text-center ${value === t ? 'font-bold text-black' : 'text-neutral-600'}`}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );
}
