import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';

interface ContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export default function Container({ children, style }: ContainerProps) {
    return (
        <View style={styles.outerBackground}>
            <View style={[styles.constrainedContent, style]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerBackground: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#fff',
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