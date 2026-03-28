import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'info';
    onHide: () => void;
    duration?: number;
}

export function Toast({ visible, message, type = 'success', onHide, duration = 3000 }: ToastProps) {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Show
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 200,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                hide();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onHide) onHide();
        });
    };

    const isError = type === 'error';
    const bgColor = isError ? '#dc2626' : '#171717';
    const iconName = isError ? 'alert-circle' : 'check-circle';
    const iconColor = isError ? '#ffffff' : '#10b981';

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="none"
            onRequestClose={hide}
        >
            <View 
                pointerEvents="box-none"
                style={styles.overlay}
            >
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                            backgroundColor: bgColor,
                        },
                    ]}
                >
                    <Feather name={iconName as any} size={28} color={iconColor} style={{ marginBottom: 12 }} />
                    <Text style={styles.text}>{message}</Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        zIndex: 10000,
    },
    toastContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 32,
        borderRadius: 32,
        // Premium Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 24,
        // Ensure visibility
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        maxWidth: '85%',
    },
    text: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 22,
    },
});
