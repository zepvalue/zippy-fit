import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, runOnJS } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

interface SecretScrollModalProps {
    visible: boolean;
    fact: { title: string; text: string } | null;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function SecretScrollModal({ visible, fact, onClose }: SecretScrollModalProps) {
    const [isOpened, setIsOpened] = useState(false);

    // Animations
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const rotate = useSharedValue('0deg');
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            setIsOpened(false);
            contentOpacity.value = 0;
            // Entrance
            scale.value = withSpring(1);
            opacity.value = withTiming(1);
            rotate.value = withTiming('0deg');
        } else {
            scale.value = 0;
            opacity.value = 0;
        }
    }, [visible]);

    const handleOpen = () => {
        // Shake and Open
        rotate.value = withSequence(
            withTiming('-5deg', { duration: 50 }),
            withTiming('5deg', { duration: 50 }),
            withTiming('0deg', { duration: 50 }, () => {
                runOnJS(setIsOpened)(true);
                contentOpacity.value = withTiming(1, { duration: 800 });
            })
        );
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { rotate: rotate.value }],
            opacity: opacity.value
        };
    });

    const contentStyle = useAnimatedStyle(() => {
        return {
            opacity: contentOpacity.value
        };
    });

    if (!visible || !fact) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <Animated.View style={[styles.container, animatedStyle]}>
                    <View style={styles.scrollBody}>
                        {/* DECORATIVE TASSELS */}
                        <View style={styles.tasselTop} />

                        {!isOpened ? (
                            <TouchableOpacity activeOpacity={0.9} onPress={handleOpen} style={styles.closedState}>
                                <MaterialCommunityIcons name="email-seal" size={80} color="#D97706" />
                                <Text style={styles.tapText}>TAP TO BREAK SEAL</Text>
                            </TouchableOpacity>
                        ) : (
                            <Animated.View style={[styles.openState, contentStyle]}>
                                <View style={styles.headerRow}>
                                    <MaterialCommunityIcons name="script-text-outline" size={24} color="#92400E" />
                                    <Text style={styles.scrollTitle}>ANCIENT WISDOM</Text>
                                    <MaterialCommunityIcons name="script-text-outline" size={24} color="#92400E" />
                                </View>

                                <View style={styles.divider} />

                                <Text style={styles.factTitle}>{fact.title}</Text>
                                <Text style={styles.factText}>{fact.text}</Text>

                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>CLAIM KNOWLEDGE</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: width * 0.85,
        backgroundColor: '#FEF3C7', // Parchment color
        borderRadius: 20,
        padding: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 4,
        borderColor: '#D97706' // Gold border
    },
    scrollBody: {
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        minHeight: 300,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderStyle: 'dashed'
    },
    tasselTop: {
        position: 'absolute',
        top: -10,
        width: 60,
        height: 10,
        backgroundColor: '#B45309',
        borderRadius: 5
    },
    closedState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20
    },
    tapText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#B45309',
        letterSpacing: 2,
        marginTop: 10
    },
    openState: {
        alignItems: 'center',
        width: '100%'
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10
    },
    scrollTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#92400E',
        letterSpacing: 1.5,
        textTransform: 'uppercase'
    },
    divider: {
        height: 2,
        backgroundColor: '#FCD34D',
        width: '60%',
        marginBottom: 20
    },
    factTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#78350F', // Dark Brown
        marginBottom: 16,
        textAlign: 'center',
        fontFamily: 'serif' // Attempt serif if available, else system
    },
    factText: {
        fontSize: 16,
        color: '#92400E',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30
    },
    closeButton: {
        backgroundColor: '#D97706',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        shadowColor: "#D97706",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1
    }
});
