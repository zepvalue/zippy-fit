import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, withDelay, FadeIn, FadeOut } from 'react-native-reanimated';
// import Confetti from './Confetti'; // Removed per user request

interface ZippyMascotProps {
    status: 'SAFE' | 'AT_RISK' | 'SLEEPING';
}

const MESSAGES = {
    SAFE: ["See you tomorrow! ⚡", "We crushed it! 🎉", "Wohooo 🎉 ", "High five! ✋"],
    AT_RISK: ["Don't break the streak! 🔥", "Zippy needs you! 🥺", "Let's go! 🏃", "Almost lost it! 😰"],
    SLEEPING: ["Zzz... waiting... 😴", "Wake up partner! 📢", "I'm nappin' here...", "Did they forget? 🤔"]
};

export default function ZippyMascot({ status }: ZippyMascotProps) {
    const translateY = useSharedValue(0);
    const rotate = useSharedValue(0);
    const scale = useSharedValue(1);

    // Dynamic Image Selection
    let source;
    switch (status) {
        case 'SAFE':
            source = require('../../assets/mascot_happy.png');
            break;
        case 'SLEEPING': // Partner not done
            source = require('../../assets/mascot_sleeping.png');
            break;
        case 'AT_RISK':
        default:
            source = require('../../assets/mascot_sad.png');
            break;
    }

    // Message Logic
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Pick a random message when status changes
        const options = MESSAGES[status];
        setMessage(options[Math.floor(Math.random() * options.length)]);
    }, [status]);

    // Animation Logic
    useEffect(() => {
        if (status === 'SAFE') {
            // Happy Jump (Bouncier)
            scale.value = withTiming(1);
            translateY.value = withRepeat(
                withSequence(
                    withTiming(-25, { duration: 350, easing: Easing.out(Easing.quad) }),
                    withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) }),
                    withTiming(-10, { duration: 200, easing: Easing.out(Easing.quad) }), // Double hop
                    withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
                    withTiming(0, { duration: 800 }) // Pause
                ),
                -1,
                true
            );
            rotate.value = withTiming(0);
        } else if (status === 'AT_RISK') {
            // Sad/Nervous (Slow Tremble)
            scale.value = withTiming(0.95); // Shrink slightly in fear
            translateY.value = withTiming(0);
            rotate.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 150 }),
                    withTiming(3, { duration: 150 })
                ),
                -1,
                true
            );
        } else {
            // Sleeping (Deep Breathing)
            rotate.value = withTiming(0);
            translateY.value = withTiming(0);
            // Breathe: Scale up/down slowly
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                    withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) })
                ),
                -1,
                true
            );
        }
    }, [status]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: translateY.value },
                { rotate: `${rotate.value}deg` },
                { scale: scale.value }
            ]
        };
    });

    return (
        <View style={styles.container}>
            {/* Speech Bubble */}
            <Animated.View
                key={message} // Re-animate on change
                entering={FadeIn.delay(300).duration(500)}
                exiting={FadeOut}
                style={styles.bubble}
            >
                <Text style={styles.bubbleText}>{message}</Text>
                <View style={styles.bubbleArrow} />
            </Animated.View>

            <Animated.Image
                source={source}
                style={[styles.image, animatedStyle]}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        // Increased height slightly to fit bubble
        height: 320, // Taller to avoid clipping
        marginTop: 40, // Push down from header pills
        marginBottom: 10,
    },
    image: {
        width: 250,
        height: 250,
    },
    bubble: {
        position: 'absolute',
        top: 0,
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
        transform: [{ translateY: -10 }] // Float slightly
    },
    bubbleText: {
        fontWeight: 'bold',
        color: '#4B4B4B',
        fontSize: 16
    },
    bubbleArrow: {
        position: 'absolute',
        bottom: -8,
        left: '50%',
        marginLeft: -8,
        width: 16,
        height: 16,
        backgroundColor: 'white',
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: '#E5E5E5',
        transform: [{ rotate: '45deg' }]
    }
});
