import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

interface DatePickerProps {
    value: string; // "YYYY-MM-DD" or similar
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    [key: string]: any;
}

export function DatePicker({ value, onChange, placeholder, className, ...props }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    // Parse value to viewDate (month/year)
    const initialDate = value ? new Date(value) : new Date();
    // Handle invalid dates gracefully and ensure we show current month if no value
    const safeInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

    // Using viewDate to track which month we are looking at in the calendar
    const [viewDate, setViewDate] = useState(safeInitialDate);

    // Helpers for Calendar Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDay = getFirstDayOfMonth(currentYear, currentMonth); // 0 = Sunday

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentYear, currentMonth + delta, 1);
        setViewDate(newDate);
    };

    const handleDaySelect = (day: number) => {
        // Construct date string YYYY-MM-DD
        // Note: Month is 0-indexed in JS Date, but we usually want 01-12 in strings
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    // Keep the "View Date" synced if value changes externally (optional, but good for reset)
    // useEffect(() => { if(value) setViewDate(new Date(value)) }, [value]);

    const renderCalendar = () => {
        const days = [];
        // Empty slots for startDay
        for (let i = 0; i < startDay; i++) {
            days.push(<View key={`empty-${i}`} className="w-[14.28%] aspect-square" />);
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            // Simple string comparison for selection highlighting
            // We assume 'value' is stored as YYYY-MM-DD
            const isSelected = value === dateStr;
            const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, i).toDateString();

            days.push(
                <TouchableOpacity
                    key={i}
                    onPress={() => handleDaySelect(i)}
                    className={`w-[14.28%] aspect-square items-center justify-center rounded-full mb-1 ${isSelected ? 'bg-black' : isToday ? 'bg-neutral-100' : ''
                        }`}
                >
                    <Text className={`text-sm ${isSelected ? 'text-white font-medium' : isToday ? 'text-neutral-900 font-medium' : 'text-neutral-700'}`}>
                        {i}
                    </Text>
                </TouchableOpacity>
            );
        }
        return days;
    };

    return (
        <View className={`relative flex-1 ${className}`} style={{ zIndex: isOpen ? 1000 : 1 }}>
            {/* Main Input Display */}
            {/* We render a Text element to look like an input, but purely controlled by the picker */}
            <TouchableOpacity
                activeOpacity={1} // No opacity change on press
                onPress={() => setIsOpen(!isOpen)}
                className="w-full h-full justify-center"
            >
                <Text
                    className={`text-base ${value ? 'text-neutral-900' : 'text-neutral-400'}`}
                    numberOfLines={1}
                >
                    {value || placeholder || "Select Date"}
                </Text>
            </TouchableOpacity>

            {/* Dropdown Calendar */}
            {isOpen && (
                <>
                    {/* Transparent Backdrop to close on outside click */}
                    {/* On Web, this acts as a fixed overlay. On Native, absolute fill. */}
                    <TouchableOpacity
                        activeOpacity={1}
                        className="absolute w-[9999px] h-[9999px] top-[-5000px] left-[-5000px] bg-transparent"
                        style={Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, cursor: 'default', zIndex: 40 } as any : { zIndex: 40 }}
                        onPress={() => setIsOpen(false)}
                    />

                    <View className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-neutral-200 p-4 z-50">
                        {/* Header */}
                        <View className="flex-row justify-between items-center mb-4">
                            <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2 rounded-full active:bg-neutral-100">
                                <Feather name="chevron-left" size={20} color="#333" />
                            </TouchableOpacity>
                            <Text className="font-semibold text-neutral-900 text-base">
                                {monthNames[currentMonth]} {currentYear}
                            </Text>
                            <TouchableOpacity onPress={() => changeMonth(1)} className="p-2 rounded-full active:bg-neutral-100">
                                <Feather name="chevron-right" size={20} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday Labels */}
                        <View className="flex-row mb-2 border-b border-neutral-100 pb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <Text key={d} className="w-[14.28%] text-center text-xs text-neutral-400 font-medium">
                                    {d}
                                </Text>
                            ))}
                        </View>

                        {/* Days Grid */}
                        <View className="flex-row flex-wrap">
                            {renderCalendar()}
                        </View>

                        {/* Clear Button */}
                        <TouchableOpacity
                            onPress={() => { onChange(''); setIsOpen(false); }}
                            className="mt-4 py-2 bg-neutral-100 rounded-lg items-center"
                        >
                            <Text className="text-xs font-semibold text-neutral-600">Clear Date</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}
