import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BossWidgetProps {
    hp: number;
    maxHp: number;
    name: string;
}

export default function BossWidget({ hp, maxHp, name }: BossWidgetProps) {
    const hpPercent = Math.max(0, hp / maxHp);
    const width = useSharedValue(hpPercent * 100);

    useEffect(() => {
        width.value = withTiming(hpPercent * 100, { duration: 1000 });
    }, [hp, maxHp]);

    const barStyle = useAnimatedStyle(() => {
        return {
            width: `${width.value}%`,
        };
    });

    return (
        <View style={styles.container}>
            {/* ROW 1: HUD HEADER */}
            <View style={styles.hudHeader}>
                <Text style={styles.bossName}>{(name || "Unknown Boss").toUpperCase()}</Text>
                <View style={styles.hpBadge}>
                    <Text style={styles.hpText}>{hp}/{maxHp}</Text>
                </View>
            </View>

            {/* ROW 2: THE BAR */}
            <View style={styles.barTrack}>
                <Animated.View style={[styles.barFillWrapper, barStyle]}>
                    <LinearGradient
                        colors={['#bef264', '#22c55e', '#15803d']} // 3D Cylinder Effect: Highlight -> Normal -> Shadow
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.gradientFill}
                    />
                </Animated.View>

                {/* ICON OVERLAY (Right Side) */}
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="skull" size={20} color="white" style={{ opacity: 0.8 }} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        paddingHorizontal: 5
    },
    hudHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 6,
        paddingHorizontal: 4
    },
    bossName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#374151',
        letterSpacing: 1,
        fontStyle: 'italic'
    },
    hpBadge: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4
    },
    hpText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6B7280'
    },
    barTrack: {
        height: 34, // Taller
        backgroundColor: '#1F2937',
        borderRadius: 17,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#4B5563', // Outer rim
        borderBottomWidth: 6, // 3D Depth
        borderBottomColor: '#111827', // Deep shadow
        position: 'relative',
        justifyContent: 'center',
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8
    },
    barFillWrapper: {
        height: '100%',
        borderRadius: 0, // Fill doesn't need radius if track clips it, but safer to match? Track overflows hidden handles it.
    },
    gradientFill: {
        width: '100%',
        height: '100%'
    },
    iconContainer: {
        position: 'absolute',
        right: 12,
        top: 4, // Centered visually w/ thicc border
        zIndex: 10
    }
});
