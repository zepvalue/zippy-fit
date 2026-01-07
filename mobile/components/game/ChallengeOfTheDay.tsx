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

    // Ref to track completion for PanResponder which is created once
    const isCompletedRef = useRef(isCompleted);
    useEffect(() => {
        isCompletedRef.current = isCompleted;
    }, [isCompleted]);

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
            // Fix: Check isCompleted ref or prop. Since this creates on first render, 
            // the closure might capture initial 'false'.
            // Using a ref for isCompleted would be safer if we didn't re-create PanResponder.
            // But actually we are using useRef(PanResponder.create(...)).current.
            // This means 'isCompleted' inside here is STALE (always false from first render).

            // WE MUST create PanResponder inside useMemo dependent on [isCompleted], OR use a ref tracking it.
            // Let's use a ref to track completion status so the closure reads up-to-date value.
            onStartShouldSetPanResponder: () => !isCompletedRef.current,
            onMoveShouldSetPanResponder: () => !isCompletedRef.current,

            onPanResponderTerminationRequest: () => false,
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
                {/* WATERMARK */}
                <View style={styles.watermarkContainer}>
                    <MaterialCommunityIcons name="dumbbell" size={120} color="#000" />
                </View>

                <Text style={[styles.headerLabel, isCritical && { color: '#EF4444' }]}>
                    {isCritical ? "⚠️ CRITICAL FAILURE" : "CHALLENGE OF THE DAY"}
                </Text>

                <Text style={styles.hugeText}>
                    {isCompleted ? "DONE!" : (
                        // Regex to find the number and style it
                        // e.g. "Walk 10,000 steps" -> ["Walk ", "10,000", " steps"]
                        challengeText.split(/(\d+(?:,\d+)*)/).map((part, index) => {
                            if (/^\d+(?:,\d+)*$/.test(part)) {
                                return <Text key={index} style={{ fontSize: 64, color: '#F97316' }}>{part}</Text>;
                            }
                            return <Text key={index} style={{ fontSize: 32, color: '#1F2937' }}>{part}</Text>;
                        })
                    )}
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
        alignItems: 'center',
        position: 'relative',
        marginTop: 60, // More space for mascot head
        marginBottom: 70, // More space for hanging button
        paddingHorizontal: 20, // ensure card considers screen padding if distinct
    },
    // MASCOT - FRONT (Peeking Over)
    mascotContainer: {
        position: 'absolute',
        top: -55,
        right: 20,
        width: 80,
        height: 80,
        zIndex: 20, // Sit ON TOP of the card
        transform: [{ rotate: '15deg' }],
    },
    mascotImage: {
        width: '100%',
        height: '100%',
    },
    // ...
    speechBubble: {
        position: 'absolute',
        top: -60, // Move up with mascot
        right: 40,
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 30,
        zIndex: 30,
        maxWidth: 140,
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
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderRadius: 30, // Squircle-ish
        paddingTop: 40,
        paddingBottom: 60, // Extra space for content + visual balance
        paddingHorizontal: 24,
        alignItems: 'center', // Center text
        zIndex: 10, // Above mascot
        // Shadow
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'visible', // Allow button to hang out? No, button is absolute. 
        // If overflow hidden, button clips. Must be visible.
    },
    // WATERMARK (New)
    watermarkContainer: {
        position: 'absolute',
        top: '10%',
        left: '5%',
        opacity: 0.05,
        zIndex: 0,
        transform: [{ rotate: '-10deg' }]
    },
    headerLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 10,
        textAlign: 'center'
    },
    hugeText: {
        fontSize: 42, // Massive
        fontWeight: '900',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 46,
        zIndex: 1, // On top of watermark
    },
    // SLIDER
    sliderContainer: {
        position: 'absolute', // Break out!
        bottom: -SLIDER_HEIGHT / 2, // Hang 50% off bottom
        width: SLIDER_WIDTH,
        height: SLIDER_HEIGHT,
        borderRadius: SLIDER_HEIGHT / 2,
        justifyContent: 'center',

        // Heavy Color Shadow
        shadowColor: "#3B82F6", // Blue glow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 15, // High elevation

        backgroundColor: 'white',
        borderWidth: 4,
        borderColor: 'white', // Explicit white border as requested
        zIndex: 20, // Top most
    },
    sliderTrack: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: SLIDER_HEIGHT / 2,
        backgroundColor: '#F3F4F6',
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
        paddingLeft: 40
    },
    sliderHintText: {
        color: '#9CA3AF', // Lighter text on white bg? Or white on color fill? 
        // Wait, track is start transparent/white. Fill covers it.
        // Let's keep white for text assuming it's visible? 
        // Actually if track is grey, text should be grey? 
        // User didn't specify, but "Slide to complete" usually on track.
        // Let's keep it white and assume strong shadow/contrast or maybe grey if track is light.
        // Let's go with Silver for hint text if on empty track.
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
    sliderThumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: 'white',
        position: 'absolute',
        left: 5,
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
        marginTop: 10,
        color: '#10B981',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center'
    }
});
