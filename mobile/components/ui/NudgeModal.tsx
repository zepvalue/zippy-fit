import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing, Platform, Vibration } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DuoButton from './DuoButton';

interface NudgeModalProps {
    visible: boolean;
    onDismiss: () => void;
}

export default function NudgeModal({ visible, onDismiss }: NudgeModalProps) {
    // Animation Values
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current; // Text pulse

    useEffect(() => {
        if (visible) {
            // 0. Trigger Vibration (Standard Motor - Stronger)
            if (Platform.OS !== 'web') {
                // Pattern: Wait 0ms, Vibrate 400ms, Wait 200ms, Vibrate 400ms
                Vibration.vibrate([0, 400, 200, 400]);
            }

            // 1. Pop In
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7
            }).start();

            // 2. Continuous Ringing (More energetic)
            const startShaking = () => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateAnim, { toValue: -1.2, duration: 80, useNativeDriver: true }),
                        Animated.timing(rotateAnim, { toValue: 1.2, duration: 80, useNativeDriver: true }),
                        Animated.timing(rotateAnim, { toValue: -1.2, duration: 80, useNativeDriver: true }),
                        Animated.timing(rotateAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
                        Animated.delay(800)
                    ])
                ).start();
            };
            startShaking();

            // 3. Text Pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
                ])
            ).start();

        } else {
            scaleAnim.setValue(0);
            rotateAnim.setValue(0);
            pulseAnim.setValue(1);
        }
    }, [visible]);

    const handleDismiss = () => {
        if (Platform.OS !== 'web') {
            Vibration.cancel(); // Stop any ongoing vibration
        }
        onDismiss();
    };

    // Interpolate rotation: Wide swing
    const spin = rotateAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-30deg', '30deg']
    });

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>

                    <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 15 }}>
                        <MaterialCommunityIcons name="bell-ring" size={90} color="#FF9600" />
                    </Animated.View>

                    <Animated.Text style={[styles.title, { transform: [{ scale: pulseAnim }] }]}>
                        NUDGE!
                    </Animated.Text>

                    <Text style={styles.subtitle}>Your partner is waiting for you to complete your workout!</Text>

                    <View style={{ width: '100%', marginTop: 30 }}>
                        <DuoButton
                            title="I'M ON IT!"
                            onPress={handleDismiss}
                            color="#58CC02"
                            shadowColor="#58A700"
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContainer: {
        backgroundColor: 'white',
        width: '100%',
        maxWidth: 400,
        padding: 30,
        borderRadius: 32,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderBottomWidth: 6,
        boxShadow: '0px 4px 4.65px rgba(0,0,0,0.3)',
        elevation: 8,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FF4B4B', // Red/Orange for urgency
        marginBottom: 10,
        letterSpacing: 2
    },
    subtitle: {
        fontSize: 18,
        color: '#777',
        textAlign: 'center',
        lineHeight: 26,
        fontWeight: 'bold'
    }
});
