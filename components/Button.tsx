import { clsx } from 'clsx';
import { forwardRef } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface ButtonProps extends React.ComponentProps<typeof TouchableOpacity> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'google';
    size?: 'sm' | 'md' | 'lg';
    label: string;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
    ({ variant = 'primary', size = 'md', label, loading, icon, className, disabled, ...props }, ref) => {

        const baseStyles = "flex-row items-center justify-center rounded-2xl active:opacity-80";

        const variants = {
            primary: "bg-black",
            secondary: "bg-neutral-100",
            outline: "bg-transparent border border-neutral-200",
            ghost: "bg-transparent",
            google: "bg-white border border-neutral-300 shadow-sm",
        };

        const textColors = {
            primary: "text-white",
            secondary: "text-neutral-900",
            outline: "text-neutral-900",
            ghost: "text-neutral-900",
            google: "text-neutral-700",
        };

        const sizes = {
            sm: "h-10 px-4",
            md: "h-14 px-6",
            lg: "h-16 px-8",
        };

        const textSizes = {
            sm: "text-sm font-medium",
            md: "text-base font-medium",
            lg: "text-lg font-semibold",
        };

        return (
            <TouchableOpacity
                ref={ref}
                className={clsx(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    (disabled || loading) && "opacity-50",
                    className
                )}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'primary' ? 'white' : 'black'} />
                ) : (
                    <View className="flex-row items-center gap-3">
                        {icon && <View>{icon}</View>}
                        <Text className={clsx(textColors[variant], textSizes[size])}>
                            {label}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }
);
