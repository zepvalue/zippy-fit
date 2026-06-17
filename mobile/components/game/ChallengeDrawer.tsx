import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import ChallengeOfTheDay from './ChallengeOfTheDay';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.85; // Max height expansion
const PEEK_HEIGHT = 280; // Visible height
const MAX_TRANSLATE_Y = -500; // Placeholder, controlled by Dashboard logic

interface ChallengeDrawerProps {
    challengeData: { text: string; base_count: number; unit: string };
    onComplete: () => void;
    isCompleted: boolean;
    mascotStatus: any;
}

export default function ChallengeDrawer({ challengeData, onComplete, isCompleted, mascotStatus }: ChallengeDrawerProps) {
    // Note: The translation logic is handled by the parent's Gesture, 
    // but here we might want to internalize specific animations like the video expansion.
    // However, the prompt says "Video Placeholder: Create a hidden or collapsed section... When the user taps or drags the drawer up, this section expands".

    // We need access to the derived values or shared value driving the drawer to animate the video.
    // The Dashboard controls the main sheet position. Let's assume we receive a SharedValue if we wanted to animate internally based on scroll, 
    // OR we just layout the content and let the parent masking/movement handle it.

    // Actually, to animate the video height based on drawer position, we need the drawer position.
    // BUT the prompt implies the drawer is just the content container.
    // Let's implement the layout first. The Dashboard will pass the animated style or we wrap this in Animated.View in Dashboard.

    // RETHINK: The video needs to expand. 
    // If we just put a view with height 200, it effectively pushes the content down.
    // If the drawer moves up, and the video matches that expansion, it feels natural.

    // For now, let's build the static layout that will be placed inside the Animated View in Dashboard.
    // We will accept a 'videoOpacity' or similar style if needed, but maybe just static layout is enough for step 1?
    // "Video Placeholder: Create a hidden or collapsed section... section expands to show the video/details."
    // This implies we need the `translateY` here.

    return (
        <View style={styles.container}>
            {/* HANDLE */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* VIDEO PLACEHOLDER (Collapsible) */}
            {/* Only visible when expanded. We need to hook this up to animation later. 
                For now, let's keep it structurally ready. 
                The prompt says "hidden or collapsed section above the text".
            */}
            {/* <Animated.View style={[styles.videoPlaceholder, { height: interpolatedHeight }]} /> */}
            {/* We will leave this blank/collapsed for the initial peek implementation unless we pull translateY in. */}

            {/* CONTENT */}
            <View style={styles.content}>
                <ChallengeOfTheDay
                    challengeText={challengeData.text}
                    onComplete={onComplete}
                    isCompleted={isCompleted}
                    mascotStatus={mascotStatus}
                    variant="drawer"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        width: '100%',
        height: '100%', // Ensure it fills the animated wrapper
        paddingBottom: 60, // Increased padding to prevent cut-off on tall screens vs logic
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    handleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 15,
    },
    handle: {
        width: 50,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#E5E7EB',
    },
    content: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20
    }
});
