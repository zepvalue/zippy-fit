import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, View, ViewStyle } from 'react-native';

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
    const [isPressed, setIsPressed] = useState(false);

    // If disabled, gray it out
    if (disabled) {
        color = '#E5E5E5';
        shadowColor = '#C8C8C8';
        textColor = '#AFAFAF';
    }

    return (
        <Pressable
            onPressIn={() => !disabled && setIsPressed(true)}
            onPressOut={() => !disabled && setIsPressed(false)}
            onPress={!disabled ? onPress : undefined}
            style={[styles.container, { width }]}
        >
            {/* The Bottom Shadow Layer */}
            <View style={[styles.shadowLayer, { backgroundColor: shadowColor, borderRadius: 16 }]} />

            {/* The Top Face Layer (Moves down when pressed) */}
            <View style={[
                styles.topLayer,
                {
                    backgroundColor: color,
                    transform: [{ translateY: isPressed ? 4 : 0 }] // The 3D Click Effect
                }
            ]}>
                <Text style={[styles.text, { color: textColor }]}>{title}</Text>
            </View>
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