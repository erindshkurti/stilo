import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface AutocompleteInputProps extends Omit<TextInputProps, 'onChangeText'> {
    value: string;
    onChangeText: (text: string) => void;
    suggestions: string[];
    onSuggestionSelect: (suggestion: string) => void;
    icon?: keyof typeof Feather.glyphMap;
    loading?: boolean;
}

export function AutocompleteInput({
    value,
    onChangeText,
    suggestions,
    onSuggestionSelect,
    icon,
    loading = false,
    ...textInputProps
}: AutocompleteInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
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
        <View style={{ position: 'relative', zIndex: 1 }}>
            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200">
                {icon && <Feather name={icon} size={20} color="#737373" />}
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    className="flex-1 h-14 px-3 text-base"
                    {...textInputProps}
                />
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
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item, index) => `${item}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleSelect(item)}
                                className="px-4 py-3 border-b border-neutral-100 active:bg-neutral-50"
                            >
                                <Text className="text-base text-neutral-800">{item}</Text>
                            </TouchableOpacity>
                        )}
                        style={{ maxHeight: 200 }}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            )}
        </View>
    );
}
