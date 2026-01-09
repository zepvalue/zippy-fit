import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, PanResponder, Animated as RNAnimated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface ChallengeOfTheDayProps {
    challengeText: string;
    onComplete: () => void;
    isCompleted: boolean;
    type?: 'normal' | 'boss';
    mascotStatus?: 'SAFE' | 'AT_RISK' | 'SLEEPING';
    variant?: 'card' | 'sheet' | 'drawer'; // NEW: Determine layout style
}

const SLIDER_WIDTH = 250;
const SLIDER_HEIGHT = 60;
const THUMB_SIZE = 50;


const MESSAGES = {
    SAFE: ["See you tomorrow! ⚡", "We crushed it! 🎉", "Wohooo 🎉 ", "High five! ✋"],
    AT_RISK: ["Workout Needed! 😤", "Don't break the streak! 🔥", "Zippy needs you! 🥺", "Let's go! 🏃"],
    SLEEPING: ["Workout Needed! ", "Wake up partner! 📢", "I'm nappin' here...", "Did they forget? 🤔"]
};

export default function ChallengeOfTheDay({ challengeText, onComplete, isCompleted, type = 'normal', mascotStatus = 'AT_RISK', variant = 'card' }: ChallengeOfTheDayProps) {
    // Legacy flags removed

    // Ref to track completion for PanResponder which is created once
    const isCompletedRef = useRef(isCompleted);
    useEffect(() => {
        isCompletedRef.current = isCompleted;
    }, [isCompleted]);

    // COLORS
    let mainColor = '#58CC02'; // Green
    if (type === 'boss') mainColor = '#DC2626'; // Boss Red

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

    // COMPUTE STYLES BASED ON VARIANT
    const isSheet = variant === 'sheet';
    const isDrawer = variant === 'drawer';

    // In drawer mode, we strip container styles
    const containerStyle: any = isDrawer ? { width: '100%', alignItems: 'center' } : (isSheet ? styles.sheetContainer : styles.container);
    // In drawer mode, content style is simple
    const contentStyle: any = isDrawer ? { width: '100%', alignItems: 'center' } : (isSheet ? styles.sheetContent : styles.card);


    // Helper to style numbers in orange
    const renderStyledText = (text: string) => {
        const parts = text.split(/(\d+)/);
        return parts.map((part, index) => {
            // Check if it is a number
            if (/^\d+$/.test(part)) {
                return <Text key={index} style={{ color: '#F97316' }}>{part}</Text>;
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    return (
        <View style={containerStyle}>

            {/* 1. MASCOT (Only show if NOT sheet AND NOT drawer - mascot is in World Layer) */}
            {!isSheet && !isDrawer && (
                <Animated.View style={styles.mascotContainer}>
                    <Image source={mascotSource} style={styles.mascotImage} resizeMode="contain" />

                    {/* Speech Bubble */}
                    <Animated.View entering={FadeIn.delay(500)} style={styles.speechBubble}>
                        <View style={styles.speechArrow} />
                        <Text style={styles.speechText}>
                            {MESSAGES[mascotStatus][Math.floor(Math.random() * MESSAGES[mascotStatus].length)]}
                        </Text>
                    </Animated.View>
                </Animated.View>
            )}

            {/* 2. CARD / SHEET / DRAWER CONTENT */}
            <View style={contentStyle}>

                {/* WATERMARK ICON (Behind Text) */}
                {(isDrawer || !isSheet) && (
                    <View style={styles.watermarkIconContainer}>
                        <MaterialCommunityIcons name="dumbbell" size={140} color="rgba(0,0,0,0.03)" />
                    </View>
                )}

                <Text style={styles.headerLabel}>CHALLENGE OF THE DAY</Text>

                <Animated.Text
                    entering={FadeIn.delay(300)}
                    style={styles.hugeText}
                    adjustsFontSizeToFit={true} // Scale down if too long
                    numberOfLines={2}
                    minimumFontScale={0.5}
                >
                    {renderStyledText(challengeText)}
                </Animated.Text>

                {/* SLIDER BUTTON */}
                <View style={[styles.sliderContainer, { overflow: 'hidden' }]}>
                    {/* Background Track - GRADIENT */}
                    <LinearGradient
                        colors={['#4ade80', '#22c55e']} // Green Gradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Active Fill Track (Grey when done, otherwise transparent over gradient) */}
                    {isCompleted && (
                        <View style={[styles.sliderFill, { width: '100%', backgroundColor: '#E5E7EB', zIndex: 11 }]} />
                    )}

                    {/* Text Underneath Slider (Hint) */}
                    {!sliderActive && !isCompleted && (
                        <View style={styles.sliderHintContainer}>
                            <Text style={styles.sliderHintText}>SLIDE TO COMPLETE</Text>
                            <MaterialCommunityIcons name="chevron-double-right" size={20} color="white" style={{ opacity: 0.8 }} />
                        </View>
                    )}

                    {/* THUMB */}
                    <RNAnimated.View
                        style={[
                            styles.sliderThumb,
                            {
                                transform: [{ translateX: pan.x }],
                                backgroundColor: isCompleted ? '#9CA3AF' : 'white'
                            }
                        ]}
                        hitSlop={{ top: 30, bottom: 30, left: 30, right: 50 }}
                        {...panResponder.panHandlers}
                    >
                        <MaterialCommunityIcons
                            name={isCompleted ? "check" : "trophy"}
                            size={24}
                            color={isCompleted ? "white" : mainColor}
                        />
                    </RNAnimated.View>
                </View>
            </View>

            {/* STATUS TEXT (Optional Footer) */}
            {isCompleted && (
                <Text style={styles.footerText}>Great job! Streak preserved.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        position: 'relative',
        marginTop: 40, // Reduced to pull closer to header
        marginBottom: 70, // More space for hanging button
        paddingHorizontal: 20, // ensure card considers screen padding if distinct
    },
    sheetContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        paddingTop: 30
    },
    sheetContent: {
        width: '100%',
        alignItems: 'center',
    },
    watermarkIconContainer: {
        position: 'absolute',
        top: -20,
        left: 10, // Move to left
        opacity: 1, // Color handles opacity
        zIndex: 0,
        transform: [{ rotate: '-15deg' }]
    },
    // MASCOT - FRONT (Peeking Over)
    mascotContainer: {
        position: 'absolute',
        top: -75,
        right: 40,
        width: 100,
        height: 100,
        zIndex: 20, // Sit ON TOP of the card
        transform: [{ rotate: '0deg' }],
    },
    mascotImage: {
        width: '100%',
        height: '100%',
    },
    // ...
    speechBubble: {
        position: 'absolute',
        top: 0, // Higher, right by Zippy (BossWidget gone)
        right: 100, // To the left of Zippy
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
        top: 12, // Vertically centered
        right: -6, // Sticking out right
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderTopWidth: 6,
        borderBottomWidth: 6,
        borderLeftWidth: 6, // Points Right
        borderRightWidth: 0,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'white',
        borderRightColor: 'transparent',
    },
    // CARD
    card: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderRadius: 30, // Squircle-ish
        paddingTop: 40,
        // ...
        // borderColor: 'rgba(255, 255, 255, 0.4)', // Removed
        // borderWidth: 1, // Removed
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
        color: '#000000', // Black
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 10,
        textAlign: 'center'
    },
    hugeText: {
        fontSize: 42, // Massive
        fontWeight: '900',
        color: '#000000', // Black
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 46,
        zIndex: 1, // On top of watermark
    },
    // SLIDER
    sliderContainer: {
        position: 'absolute', // Break out!
        bottom: -SLIDER_HEIGHT * 1.2, // Move lower (Hang more than 100% off bottom of content)
        width: SLIDER_WIDTH,
        height: SLIDER_HEIGHT,
        borderRadius: SLIDER_HEIGHT / 2,
        justifyContent: 'center',

        // Heavy Color Shadow
        shadowColor: "#22c55e", // Green glow matches gradient
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 15, // High elevation

        backgroundColor: 'white', // Fallback, covered by gradient
        borderWidth: 4,
        borderColor: 'white', // Explicit white border as requested
        zIndex: 20, // Top most
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
        zIndex: 10,
        paddingLeft: 40
    },
    sliderHintText: {
        color: '#FFFFFF', // White text on Green Gradient
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
