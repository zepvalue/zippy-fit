import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface StatusCardProps {
    status: 'SAFE' | 'AT_RISK';
}

export default function StatusCard({ status }: StatusCardProps) {
    const isSafe = status === 'SAFE';

    return (
        <View style={[styles.card, { backgroundColor: isSafe ? '#1CB0F6' : '#FF4B4B' }]}>
            <View style={styles.iconCircle}>
                <FontAwesome5 name={isSafe ? "shield-alt" : "exclamation-triangle"} size={24} color={isSafe ? '#1CB0F6' : '#FF4B4B'} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{isSafe ? "SAFE" : "AT RISK"}</Text>
                <Text style={styles.subtitle}>
                    {isSafe ? "Partner completed their task." : "Partner has not worked out yet!"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 16,
        marginBottom: 20,
        alignItems: 'center',
        borderBottomWidth: 4,
        borderBottomColor: 'rgba(0,0,0,0.2)', // Generic shadow
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    textContainer: { flex: 1 },
    title: { color: 'white', fontWeight: '900', fontSize: 18, textTransform: 'uppercase' },
    subtitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 14 }
});