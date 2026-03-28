import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View, Modal, SafeAreaView } from 'react-native';

const TIMES: string[] = (() => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            times.push(time);
        }
    }
    return times;
})();

interface TimePickerProps {
    value: string; // "HH:mm"
    onChange: (time: string) => void;
    placeholder?: string;
    className?: string;
    isInline?: boolean;
    showChevron?: boolean;
    [key: string]: any;
}

export function TimePicker({ value, onChange, placeholder, className, isInline, showChevron = false, ...props }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const valueIndex = TIMES.indexOf(value);

    useEffect(() => {
        if (isOpen && valueIndex !== -1) {
            // Give a tiny bit of time for layout after modal transition
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: Math.max(0, valueIndex - 2) * 60, animated: false });
            }, 100);
        }
    }, [isOpen, valueIndex]);

    const handleSelect = (time: string) => {
        onChange(time);
        setIsOpen(false);
    };

    return (
        <View className={`${isInline ? '' : 'flex-1'} ${className}`}>
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                className={`w-full ${isInline ? 'h-12 bg-neutral-50 rounded-xl px-4 border border-neutral-200' : 'h-full'} justify-center`}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isInline ? 'space-between' : 'flex-start' }}>
                    <Text 
                        className={`text-lg font-semibold ${value ? 'text-neutral-900' : 'text-neutral-400'}`}
                        numberOfLines={1}
                    >
                        {value || placeholder || "Select Time"}
                    </Text>
                    {showChevron && <Feather name="chevron-down" size={16} color="#a3a3a3" className="ml-2" />}
                </View>
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsOpen(false)}
            >
                <SafeAreaView className="flex-1 bg-white">
                    <View className="h-16 flex-row items-center justify-between px-6 border-b border-neutral-100">
                        <Text className="text-xl font-bold text-neutral-900">Select Time</Text>
                        <TouchableOpacity 
                            onPress={() => setIsOpen(false)}
                            className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
                        >
                            <Feather name="x" size={20} color="#171717" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 20 }}>
                        {TIMES.map((t, idx) => {
                            const isSelected = value === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => handleSelect(t)}
                                    className={`h-[60px] px-8 justify-center border-b border-neutral-50 ${isSelected ? 'bg-neutral-50' : 'bg-white'}`}
                                >
                                    <View className="flex-row items-center justify-between">
                                        <Text className={`text-xl ${isSelected ? 'font-bold text-black' : 'text-neutral-500 font-medium'}`}>
                                            {t}
                                        </Text>
                                        {isSelected && <Feather name="check" size={20} color="#000" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </View>
    );
}
