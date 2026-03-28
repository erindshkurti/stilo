import { Feather } from '@expo/vector-icons';
import React, { useState, useCallback, useMemo } from 'react';
import { Platform, FlatList, Text, TouchableOpacity, View } from 'react-native';

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
    [key: string]: any;
}

export function TimePicker({ value, onChange, placeholder, className, isInline, ...props }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const valueIndex = useMemo(() => TIMES.indexOf(value), [value]);

    const handleSelect = useCallback((time: string) => {
        onChange(time);
        setIsOpen(false);
    }, [onChange]);

    const renderItem = useCallback(({ item: t }: { item: string }) => (
        <TouchableOpacity
            onPress={() => handleSelect(t)}
            className={`h-12 px-4 justify-center border-b border-neutral-50 ${value === t ? 'bg-neutral-50' : ''}`}
        >
            <Text className={`text-center ${value === t ? 'font-bold text-black' : 'text-neutral-600'}`}>
                {t}
            </Text>
        </TouchableOpacity>
    ), [value, handleSelect]);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 48,
        offset: 48 * index,
        index
    }), []);

    return (
        <View className={`relative ${isInline ? '' : 'flex-1'} ${className}`} style={{ zIndex: isOpen ? 1000 : 1 }}>
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                className={`w-full ${isInline ? 'h-12 bg-neutral-50 rounded-xl px-4 border border-neutral-200' : 'h-full'} justify-center`}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Text 
                        style={{ fontSize: 16, color: value ? '#000' : '#a3a3a3' }}
                        numberOfLines={1}
                    >
                        {value || placeholder || "Select Time"}
                    </Text>
                    <Feather name="chevron-down" size={16} color="#a3a3a3" />
                </View>
            </TouchableOpacity>

            {isOpen && (
                <>
                    {!isInline && (
                        <TouchableOpacity
                            activeOpacity={1}
                            className="absolute w-[9999px] h-[9999px] top-[-5000px] left-[-5000px] bg-transparent"
                            style={Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 } as any : { zIndex: 40 }}
                            onPress={() => setIsOpen(false)}
                        />
                    )}

                    <View className="absolute top-full left-0 mt-1 w-full max-h-60 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50">
                        <FlatList 
                            data={TIMES}
                            keyExtractor={(t) => t}
                            initialScrollIndex={valueIndex !== -1 ? valueIndex : 0}
                            getItemLayout={getItemLayout}
                            renderItem={renderItem}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={48} // Render enough to cover the list
                            windowSize={1} // Keep window small since all items are rendered
                        />
                    </View>
                </>
            )}
        </View>
    );
}
