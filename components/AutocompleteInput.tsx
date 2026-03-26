import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface AutocompleteInputProps extends Omit<TextInputProps, 'onChangeText'> {
    value: string;
    onChangeText: (text: string) => void;
    suggestions: string[];
    onSuggestionSelect: (suggestion: string) => void;
    icon?: keyof typeof Feather.glyphMap;
    loading?: boolean;
    suggestionLabel?: string;
}

export function AutocompleteInput({
    value,
    onChangeText,
    suggestions,
    onSuggestionSelect,
    icon,
    loading = false,
    suggestionLabel = "Suggestion",
    ...textInputProps
}: AutocompleteInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Show suggestions when there are results and input has value
    useEffect(() => {
        if (suggestions.length > 0 && value.trim().length > 0) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [suggestions, value]);

    const handleSelect = (suggestion: string) => {
        onSuggestionSelect(suggestion);
        setShowSuggestions(false);
    };

    return (
        <View style={{ position: 'relative', zIndex: 50 }}>
            <View className={`relative flex-row items-center h-14 bg-neutral-50 rounded-2xl px-4 border transition-colors ${isFocused ? 'border-neutral-900 bg-white' : 'border-neutral-200'}`}>
                {icon && <Feather name={icon} size={20} color={isFocused ? "#171717" : "#737373"} />}
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={(e) => {
                        setIsFocused(true);
                        textInputProps.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        textInputProps.onBlur?.(e);
                    }}
                    className="flex-1 h-10 px-3 pr-10 min-w-0 text-neutral-900"
                    placeholderTextColor="#a3a3a3"
                    style={{ 
                        fontSize: 16,
                        lineHeight: 20,
                        paddingVertical: 0,
                        textAlignVertical: 'center'
                    }}
                    {...textInputProps}
                />
                {/* Clear Button */}
                {value.length > 0 && (
                    <View className="absolute right-2 top-0 bottom-0 justify-center">
                        <TouchableOpacity onPress={() => onChangeText('')} className="p-2">
                            <Feather name="x" size={18} color="#a3a3a3" />
                        </TouchableOpacity>
                    </View>
                )}
                {loading && (
                    <View className="ml-2">
                        <Text className="text-neutral-400 text-xs">...</Text>
                    </View>
                )}
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
                <View
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden"
                    style={{ zIndex: 9999, elevation: 10 }}
                >
                    <ScrollView
                        style={{ maxHeight: 280 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {[value, ...suggestions.filter(s => s.toLowerCase() !== value.toLowerCase())].map((item, index) => (
                            <TouchableOpacity
                                key={`${item}-${index}`}
                                onPress={() => handleSelect(item)}
                                className={`px-5 py-4 flex-row items-center border-b border-neutral-50 active:bg-neutral-50 ${index === 0 ? 'bg-neutral-50/50' : ''}`}
                            >
                                <View className="mr-3 w-8 items-center">
                                    <Feather 
                                        name={index === 0 ? "corner-down-right" : "search"} 
                                        size={16} 
                                        color={index === 0 ? "#a3a3a3" : "#d4d4d4"} 
                                    />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-baseline">
                                        <Text className={`text-[15px] ${index === 0 ? 'text-black font-semibold' : 'text-neutral-700'}`}>
                                            {item}
                                        </Text>
                                        {index === 0 && (
                                            <Text className="ml-2 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                                                Search for
                                            </Text>
                                        )}
                                    </View>
                                    {index !== 0 && (
                                        <Text className="text-[11px] text-neutral-400 mt-0.5">
                                            {suggestionLabel}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
