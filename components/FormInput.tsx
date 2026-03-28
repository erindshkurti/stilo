import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, TextInputProps, View, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';

interface InputProps extends Omit<TextInputProps, 'style'> {
    icon?: keyof typeof Feather.glyphMap;
    style?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
}

export function FormInput({
    icon,
    style,
    inputStyle,
    ...props
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View 
            style={[{
                height: 56,
                backgroundColor: isFocused ? '#ffffff' : '#f8f8f8',
                borderRadius: 16,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: isFocused ? '#171717' : '#f0f0f0',
                flexDirection: 'row',
                alignItems: 'center',
            }, style]}
        >
            {icon && (
                <View style={{ marginRight: 12 }}>
                    <Feather name={icon} size={20} color={isFocused ? "#171717" : "#737373"} />
                </View>
            )}
            <TextInput
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}
                placeholderTextColor="#a3a3a3"
                style={[{ 
                    flex: 1,
                    fontSize: 16,
                    color: '#171717',
                    height: '100%',
                    // Platform-specific centering nudge
                    paddingTop: Platform.OS === 'ios' ? 2 : 0,
                }, inputStyle]}
                {...props}
            />
        </View>
    );
}
