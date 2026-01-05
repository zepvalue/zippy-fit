import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface DuoButtonProps {
    title: string;
    onPress: () => void;
    color?: string;       // Face color (e.g., #58CC02 green)
    shadowColor?: string; // Shadow color (e.g., #58A700 dark green)
    textColor?: string;
    width?: ViewStyle['width'];
    disabled?: boolean;
}

export default function DuoButton({
    title,
    onPress,
    color = '#58CC02',
    shadowColor = '#58A700',
    textColor = 'white',
    width = '100%',
    disabled = false
}: DuoButtonProps) {
    // Shared value for press state: 0 (unpressed) -> 1 (pressed)
    const pressed = useSharedValue(0);

    // Derived colors for disabled state
    const activeColor = disabled ? '#E5E5E5' : color;
    const activeShadow = disabled ? '#C8C8C8' : shadowColor;
    const activeText = disabled ? '#AFAFAF' : textColor;

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: withSpring(pressed.value * 4, {
                        mass: 0.5,
                        damping: 12,
                        stiffness: 200,
                    })
                }
            ],
            backgroundColor: activeColor // In case we want to animate color changes later
        };
    });

    return (
        <Pressable
            onPressIn={() => !disabled && (pressed.value = 1)}
            onPressOut={() => !disabled && (pressed.value = 0)}
            onPress={!disabled ? onPress : undefined}
            style={[styles.container, { width }]}
        >
            {/* The Bottom Shadow Layer */}
            <Animated.View style={[styles.shadowLayer, { backgroundColor: activeShadow, borderRadius: 16 }]} />

            {/* The Top Face Layer (Moves down when pressed) */}
            <Animated.View style={[
                styles.topLayer,
                animatedStyle
            ]}>
                <Text style={[styles.text, { color: activeText }]}>{title}</Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 50,
        marginTop: 5,
    },
    shadowLayer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 50,
        borderRadius: 16,
    },
    topLayer: {
        width: '100%',
        height: 46, // Slightly shorter to reveal shadow
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    text: {
        fontWeight: 'bold',
        fontSize: 15,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});