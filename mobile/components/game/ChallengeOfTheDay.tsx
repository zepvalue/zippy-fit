import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

interface ChallengeOfTheDayProps {
    challengeText: string;
    onComplete: () => void;
    isCompleted: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ChallengeOfTheDay({ challengeText, onComplete, isCompleted }: ChallengeOfTheDayProps) {
    const scale = useSharedValue(1);
    const iconScale = useSharedValue(1);

    const buttonStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const iconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: iconScale.value }]
        };
    });

    useEffect(() => {
        if (isCompleted) {
            // Pulse the icon once explicitly when completed
            iconScale.value = withSequence(
                withTiming(1.5, { duration: 200 }),
                withSpring(1)
            );
        }
    }, [isCompleted]);

    const handlePress = () => {
        if (isCompleted) return;

        // Button bounce
        scale.value = withSequence(
            withTiming(0.9, { duration: 100 }),
            withTiming(1, { duration: 100 }),
            withTiming(1, { duration: 0 }) // ensure reset
        );

        onComplete();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Animated.View style={iconStyle}>
                    <MaterialCommunityIcons name="trophy" size={24} color={isCompleted ? "#FFD700" : "#FF9600"} />
                </Animated.View>
                <Text style={styles.title}>CHALLENGE OF THE DAY</Text>
            </View>

            <Text style={styles.challengeText}>{challengeText}</Text>

            <AnimatedTouchableOpacity
                style={[styles.button, isCompleted && styles.buttonCompleted, buttonStyle]}
                onPress={handlePress}
                disabled={isCompleted}
                activeOpacity={0.8}
            >
                <Text style={[styles.buttonText, isCompleted && styles.buttonTextCompleted]}>
                    {isCompleted ? "COMPLETED ✅" : "MARK COMPLETE"}
                </Text>
            </AnimatedTouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // De-widgetized: Transparent background
        backgroundColor: 'transparent',
        borderRadius: 0,
        elevation: 0,
        shadowOpacity: 0,

        padding: 10,
        marginTop: 0, // Closer to Zippy
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    title: {
        fontWeight: '900',
        color: '#B0B0B0', // Softer grey
        fontSize: 14,
        letterSpacing: 2,
    },
    challengeText: {
        fontSize: 20, // Slightly larger
        fontWeight: 'bold',
        color: '#4B4B4B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 28,
    },
    button: {
        paddingVertical: 16, // Taller button
        paddingHorizontal: 24,
        borderRadius: 24, // Pill shape
        backgroundColor: '#58CC02',
        // Removed hard border for cleaner look, or keep subtle one
        shadowColor: "#58CC02",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
        width: '100%',
        alignItems: 'center',
    },
    buttonCompleted: {
        backgroundColor: '#F0F0F0',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    buttonTextCompleted: {
        color: '#AFAFAF',
    }
});

