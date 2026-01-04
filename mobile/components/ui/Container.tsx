import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export default function Container({ children, style }: ContainerProps) {
    return (
        <LinearGradient
            // A subtle, fresh gradient: Very light warm tint fading to white
            colors={['#FFF8F0', '#FFFFFF']}
            style={styles.outerBackground}
        >
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
    constrainedContent: {
        flex: 1,
        width: '100%',
        // MOBILE: 500px max (keeps it looking like an app)
        // WEB: 1000px max (uses more screen space)
        maxWidth: Platform.OS === 'web' ? 1000 : 500,
        paddingHorizontal: 20,
    },
});
