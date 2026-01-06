import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface StatusCardProps {
    status: 'SAFE' | 'AT_RISK';
    overrideTitle?: string;
    overrideSubtitle?: string;
}

export default function StatusCard({ status, overrideTitle, overrideSubtitle }: StatusCardProps) {
    const isSafe = status === 'SAFE';

    return (
        <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={styles.card}
        >
            <View style={styles.iconCircle}>
                <FontAwesome5 name={isSafe ? "shield-alt" : "exclamation-triangle"} size={26} color={isSafe ? '#1CB0F6' : '#FF4B4B'} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: isSafe ? '#1CB0F6' : '#FF4B4B' }]}>
                    {overrideTitle || (isSafe ? "SAFE" : "AT RISK")}
                </Text>
                <Text style={styles.subtitle}>
                    {overrideSubtitle || (isSafe ? "Partner completed their task." : "Partner has not worked out yet!")}
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: 24, // More breathing room
        borderRadius: 32, // Super rounded
        marginBottom: 20,
        alignItems: 'center',
        // Solid Style (Reverted Glass)
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconCircle: {
        width: 60, // Larger icon
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    textContainer: { flex: 1 },
    title: {
        color: '#4B4B4B', // Darker text for glass
        fontWeight: '900',
        fontSize: 18,
        textTransform: 'uppercase',
        marginBottom: 4
    },
    subtitle: {
        color: '#7A7A7A',
        fontWeight: '600',
        fontSize: 14,
        lineHeight: 20
    }
});