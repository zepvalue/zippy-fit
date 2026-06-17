import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';

interface ContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export default function Container({ children, style }: ContainerProps) {
    const sv = useSharedValue(0);

    useEffect(() => {
        sv.value = withRepeat(
            withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
            -1, // infinite
            true // reverse
        );
    }, [sv]);

    const blob1Style = useAnimatedStyle(() => ({
        transform: [
            { scale: 1 + sv.value * 0.1 },
            { translateY: sv.value * 10 }
        ]
    }));

    const blob2Style = useAnimatedStyle(() => ({
        transform: [
            { scale: 1 + (1 - sv.value) * 0.1 },
            { translateY: (1 - sv.value) * -10 }
        ]
    }));

    const blob3Style = useAnimatedStyle(() => ({
        transform: [
            { scale: 1 + sv.value * 0.15 },
            { rotate: `${sv.value * 10}deg` }
        ]
    }));

    return (
        <LinearGradient
            colors={['#FFF8E7', '#FFFFFF']}
            style={styles.outerBackground}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            {/* Background Blobs */}
            <View style={styles.blobContainer} pointerEvents="none">
                <Animated.View style={[styles.blob, styles.blob1, blob1Style]} />
                <Animated.View style={[styles.blob, styles.blob2, blob2Style]} />
                <Animated.View style={[styles.blob, styles.blob3, blob3Style]} />
            </View>

            <View style={[styles.constrainedContent, style]}>
                {children}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    outerBackground: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    blobContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.4,
    },
    blob1: {
        width: 300,
        height: 300,
        backgroundColor: '#FFDEE9', // Soft Pink
        top: -50,
        left: -80,
    },
    blob2: {
        width: 250,
        height: 250,
        backgroundColor: '#B5FFFC', // Soft Blue
        bottom: 100,
        right: -60,
    },
    blob3: {
        width: 200,
        height: 200,
        backgroundColor: '#F7FF00', // Soft Yellow
        top: '40%',
        left: '60%',
        opacity: 0.2,
    },
    constrainedContent: {
        flex: 1,
        width: '100%',
        // MOBILE: 500px max (keeps it looking like an app)
        // WEB: 1000px max (uses more screen space)
        maxWidth: Platform.OS === 'web' ? 1000 : 500,
        paddingHorizontal: 20,
    },
});
