import React from 'react';
import { Modal, Text, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './Button';

interface AlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info';
    onConfirm: () => void;
    confirmLabel?: string;
    onCancel?: () => void;
    cancelLabel?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    visible,
    title,
    message,
    type = 'info',
    onConfirm,
    confirmLabel = 'OK',
    onCancel,
    cancelLabel = 'Cancel'
}) => {
    const getIcon = () => {
        switch (type) {
            case 'error': return { name: 'alert-circle' as const, color: '#EF4444' };
            case 'success': return { name: 'check-circle' as const, color: '#22C55E' };
            default: return { name: 'info' as const, color: '#3B82F6' };
        }
    };

    const icon = getIcon();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Feather name={icon.name} size={48} color={icon.color} />
                    </View>
                    
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    
                    <View style={styles.buttonContainer}>
                        {onCancel && (
                            <Button 
                                variant="secondary" 
                                label={cancelLabel} 
                                onPress={onCancel}
                                className="flex-1"
                            />
                        )}
                        <Button 
                            variant="primary" 
                            label={confirmLabel} 
                            onPress={onConfirm}
                            className="flex-1"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#171717',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#737373',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    }
});
