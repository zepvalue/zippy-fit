import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, PanResponder, Animated as RNAnimated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ChallengeOfTheDayProps {
    challengeText: string;
    onComplete: () => void;
    isCompleted: boolean;
    type?: 'normal' | 'spot_cover' | 'critical';
    mascotStatus?: 'SAFE' | 'AT_RISK' | 'SLEEPING';
}

const SLIDER_WIDTH = 250;
const SLIDER_HEIGHT = 60;
const THUMB_SIZE = 50;


const MESSAGES = {
    SAFE: ["See you tomorrow! ⚡", "We crushed it! 🎉", "Wohooo 🎉 ", "High five! ✋"],
    AT_RISK: ["Don't break the streak! 🔥", "Zippy needs you! 🥺", "Let's go! 🏃", "Almost lost it! 😰"],
    SLEEPING: ["Zzz... waiting... 😴", "Wake up partner! 📢", "I'm nappin' here...", "Did they forget? 🤔"]
};

export default function ChallengeOfTheDay({ challengeText, onComplete, isCompleted, type = 'normal', mascotStatus = 'AT_RISK' }: ChallengeOfTheDayProps) {
    const isHero = type === 'spot_cover';
    const isCritical = type === 'critical';

    // COLORS
    let mainColor = '#58CC02'; // Green
    if (isHero) mainColor = '#3B82F6'; // Blue
    if (isCritical) mainColor = '#DC2626'; // Red

    // MASCOT
    let mascotSource;
    switch (mascotStatus) {
        case 'SAFE':
            mascotSource = require('../../assets/animations/happy_zippy_animated.gif');
            break;
        case 'SLEEPING':
            mascotSource = require('../../assets/animations/sleepy_zippy_animated.gif');
            break;
        case 'AT_RISK':
        default:
            mascotSource = require('../../assets/animations/worried_zippy_animated.gif');
            break;
    }

    // SPEECH BUBBLE LOGIC
    const [message, setMessage] = useState("");
    useEffect(() => {
        const options = MESSAGES[mascotStatus || 'AT_RISK'];
        setMessage(options[Math.floor(Math.random() * options.length)]);
    }, [mascotStatus]);

    // --- SLIDER LOGIC ---
    const pan = useRef(new RNAnimated.ValueXY()).current;
    const [sliderActive, setSliderActive] = useState(false);

    const resetSlider = () => {
        RNAnimated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false
        }).start();
        setSliderActive(false);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isCompleted,
            onMoveShouldSetPanResponder: () => !isCompleted,
            onPanResponderTerminationRequest: () => false, // KEY FIX: Prevent ScrollView from stealing control
            onShouldBlockNativeResponder: () => true,

            onPanResponderGrant: () => {
                setSliderActive(true);
                // We keep the offset logic, but ensure we don't jump if re-grabbing? 
                // Actually for a simple slider, usually we reset or continue.
                // Current logic: pan.setOffset... this assumes we want to add to existing. 
                // But if we reset on release (if failed), offset is cleared.
                // If we succeeded, we are done.
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: 0
                });
            },
            onPanResponderMove: (_, gestureState) => {
                // Bounds Calculation (Total Width - Thumb - Padding * 2)
                const MAX_RANGE = SLIDER_WIDTH - THUMB_SIZE - 10;

                // Allow drag even if outside bounds (but clamp result)
                let newX = gestureState.dx;
                // Clamp
                if (newX < 0) newX = 0;
                if (newX > MAX_RANGE) newX = MAX_RANGE;

                pan.setValue({ x: newX, y: 0 });
            },
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset(); // Flatten so the offset becomes part of the base value

                const MAX_RANGE = SLIDER_WIDTH - THUMB_SIZE - 10;

                // Check if we crossed the threshold (e.g. 70% of max range)
                if (gestureState.dx > MAX_RANGE * 0.7) {
                    onComplete();
                    // Snap to end visually
                    RNAnimated.timing(pan, {
                        toValue: { x: MAX_RANGE, y: 0 },
                        duration: 200,
                        useNativeDriver: false
                    }).start();
                } else {
                    // Reset
                    resetSlider();
                }
            }
        })
    ).current;

    // Effect to handle external completion (if triggered simply by prop update)
    // or just to maintain state if already completed
    useEffect(() => {
        if (isCompleted) {
            pan.setValue({ x: SLIDER_WIDTH - THUMB_SIZE - 10, y: 0 });
        }
    }, [isCompleted]);

    const animatedWidth = RNAnimated.add(pan.x, THUMB_SIZE);

    return (
        <View style={styles.container}>
            {/* 1. FREE MASCOT (Overlapping) */}
            <View style={styles.mascotContainer}>
                {/* SPEECH BUBBLE OVERLAY */}
                {message && (
                    <Animated.View
                        entering={FadeIn.delay(500).duration(500)}
                        style={styles.speechBubble}
                    >
                        <Text style={styles.speechText}>{message}</Text>
                        <View style={styles.speechArrow} />
                    </Animated.View>
                )}

                <Image
                    source={mascotSource}
                    style={styles.mascotImage}
                    resizeMode="contain"
                />
            </View>

            {/* 2. MAIN CARD */}
            <View style={styles.card}>

                {/* HEADER LABEL */}
                <Text style={[styles.headerLabel, isCritical && { color: '#EF4444' }]}>
                    {isCritical ? "⚠️ CRITICAL FAILURE" : "CHALLENGE OF THE DAY"}
                </Text>

                {/* HUGE TASK TEXT */}
                <Text style={styles.hugeText}>
                    {isCompleted ? "DONE!" : challengeText}
                </Text>

                {/* SLIDER BUTTON */}
                <View style={styles.sliderContainer}>
                    {/* Background Track */}
                    <View style={styles.sliderTrack} />

                    {/* Active Fill Track */}
                    <RNAnimated.View style={[styles.sliderFill, { width: animatedWidth, backgroundColor: isCompleted ? '#E5E7EB' : mainColor }]} />

                    {/* Text Underneath Slider (Hint) */}
                    {!sliderActive && !isCompleted && (
                        <View style={styles.sliderHintContainer}>
                            <Text style={styles.sliderHintText}>SLIDE TO COMPLETE</Text>
                            <MaterialCommunityIcons name="chevron-double-right" size={20} color="white" style={{ opacity: 0.8 }} />
                        </View>
                    )}

                    {/* Draggable Thumb */}
                    <RNAnimated.View
                        style={[
                            styles.sliderThumb,
                            {
                                transform: [{ translateX: pan.x }],
                                backgroundColor: isCompleted ? '#9CA3AF' : 'white'
                            }
                        ]}
                        hitSlop={{ top: 30, bottom: 30, left: 30, right: 50 }} // KEY FIX: Easier to grab
                        {...panResponder.panHandlers}
                    >
                        <MaterialCommunityIcons
                            name={isCompleted ? "check" : (isCritical ? "alert" : "trophy")}
                            size={24}
                            color={isCompleted ? "white" : mainColor}
                        />
                    </RNAnimated.View>
                </View>

                {/* STATUS TEXT (Optional Footer) */}
                {isCompleted && (
                    <Text style={styles.footerText}>Great job! Streak preserved.</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center', // Center the card wrapper
        position: 'relative',
        marginTop: 40, // Increased spacing from element above
        marginBottom: 40
    },
    // MASCOT
    mascotContainer: {
        position: 'absolute',
        top: -20, // Lowered to avoid overlap with Boss HP bar (was -50)
        right: 0, // Align flush with right edge
        width: 150, // Slightly smaller to be less overwhelming? Or keep 160. Let's try 150.
        height: 150,
        zIndex: 20,
        elevation: 20,
        alignItems: 'center'
    },
    mascotImage: {
        width: '100%',
        height: '100%',
    },
    // SPEECH BUBBLE
    speechBubble: {
        position: 'absolute',
        top: -30, // Adjusted relative to new mascot size
        right: 30,
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 30,
        maxWidth: 140, // More width
    },
    speechText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4B5563',
        textAlign: 'center',
        fontStyle: 'italic'
    },
    speechArrow: {
        position: 'absolute',
        bottom: -6,
        right: 20,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
    },
    // CARD
    card: {
        backgroundColor: '#FFFFFF', // Pure White
        width: '100%',
        borderRadius: 32,
        paddingVertical: 24,
        paddingHorizontal: 20,
        // Align content to LEFT
        alignItems: 'flex-start',
        // Drop Shadow - Vibrant Blue/Purple
        shadowColor: "#4F46E5", // Indigo-600
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2, // Slightly stronger for "pop"
        shadowRadius: 24,
        elevation: 12,
        // Removed grey border to reduce "muddy" look, or stick to very subtle
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)' // White border for highlight? Or just remove.
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#9CA3AF',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 8
    },
    hugeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1F2937',
        textAlign: 'left', // Left align
        marginBottom: 24,
        lineHeight: 36,
        width: '70%', // Leave room for mascot on right
    },
    // SLIDER
    sliderContainer: {
        width: SLIDER_WIDTH,
        height: SLIDER_HEIGHT,
        borderRadius: SLIDER_HEIGHT / 2,
        position: 'relative',
        justifyContent: 'center',
        // Shadow for the button itself
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        backgroundColor: 'white', // Container bg
        alignSelf: 'center', // Keep slider centered or 'flex-start'
        marginTop: 10
    },
    sliderTrack: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: SLIDER_HEIGHT / 2,
        backgroundColor: '#F3F4F6', // Light gray track
        overflow: 'hidden'
    },
    sliderFill: {
        position: 'absolute',
        height: '100%',
        borderRadius: SLIDER_HEIGHT / 2,
        left: 0,
    },
    sliderHintContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        zIndex: 1,
        paddingLeft: 40 // Offset for thumb
    },
    sliderHintText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    sliderThumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: 'white',
        position: 'absolute',
        left: 5, // Padding start
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4
    },
    footerText: {
        marginTop: 15,
        color: '#10B981',
        fontWeight: 'bold',
        fontSize: 13,
        alignSelf: 'center'
    }
});
