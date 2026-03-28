import { Feather } from '@expo/vector-icons';
import React, { useState, useCallback, useMemo } from 'react';
import { Platform, FlatList, Text, TouchableOpacity, View, Modal, SafeAreaView } from 'react-native';

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

    const valueIndex = useMemo(() => TIMES.indexOf(value), [value]);

    const handleSelect = useCallback((time: string) => {
        onChange(time);
        setIsOpen(false);
    }, [onChange]);

    const renderItem = useCallback(({ item: t }: { item: string }) => (
        <TouchableOpacity
            onPress={() => handleSelect(t)}
            className={`h-16 px-6 justify-center border-b border-neutral-50 ${value === t ? 'bg-neutral-50' : ''}`}
        >
            <Text className={`text-center text-xl ${value === t ? 'font-bold text-black' : 'text-neutral-500 font-medium'}`}>
                {t}
            </Text>
        </TouchableOpacity>
    ), [value, handleSelect]);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 64,
        offset: 64 * index,
        index
    }), []);

    return (
        <View className={`${isInline ? '' : 'flex-1'} ${className}`}>
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                className={`w-full ${isInline ? 'h-14 bg-neutral-50 rounded-2xl px-4 border border-neutral-200' : 'h-full'} justify-center`}
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
                    
                    <FlatList 
                        data={TIMES}
                        keyExtractor={(t) => t}
                        initialScrollIndex={valueIndex !== -1 ? Math.max(0, valueIndex - 2) : 0}
                        getItemLayout={getItemLayout}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingVertical: 10 }}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}
