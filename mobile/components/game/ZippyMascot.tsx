import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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
    // Dynamic Image Selection
    let source;
    switch (status) {
        case 'SAFE':
            source = require('../../assets/animations/happy_zippy_animated.gif');
            break;
        case 'SLEEPING': // Partner not done
            source = require('../../assets/animations/sleepy_zippy_animated.gif');
            break;
        case 'AT_RISK':
        default:
            source = require('../../assets/animations/worried_zippy_animated.gif');
            break;
    }

    // Message Logic
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Pick a random message when status changes
        const options = MESSAGES[status];
        setMessage(options[Math.floor(Math.random() * options.length)]);
    }, [status]);

    // Dynamic Background Color (Happy GIF is off-white, others are transparent/white)
    const containerColor = status === 'SAFE' ? '#F9F9F9' : 'white';

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

            <View style={{
                width: 280, height: 280, borderRadius: 140, backgroundColor: containerColor,
                justifyContent: 'center', alignItems: 'center',
                shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
                // Removed overflow: 'hidden' to prevent clipping animation
            }}>
                <Image
                    source={source}
                    style={{ width: 220, height: 220 }}
                    resizeMode="contain"
                />
            </View>
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
