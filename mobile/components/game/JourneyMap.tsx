import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface JourneyMapProps {
    history: string[];
    onSpotRequest?: () => void;
    canRequestSpot?: boolean;
    spotStatus?: 'active' | 'none' | 'requested_by_partner';
}

const { width } = Dimensions.get('window');
const NODE_SIZE = 60;
const VERTICAL_SPACING = 80;

export default function JourneyMap({ history, onSpotRequest, canRequestSpot, spotStatus }: JourneyMapProps) {
    // Generate 7 days centered on today? 
    // User said "winding path with 7 circular stepping stones".
    // Let's do: 3 days past, Today, 3 days future.
    const today = new Date();
    const days = [];
    for (let i = -3; i <= 3; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
    }

    // Determine Mascot
    // (We reuse the assets from dashboard context roughly, but hardcode for now or pass as prop)
    const mascotSource = require('../../assets/animations/happy_zippy_animated.gif');

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>YOUR PATH</Text>
                <View style={styles.streakBadge}>
                    <Text style={styles.streakText}>7 DAY VIEW</Text>
                </View>
            </View>

            <View style={styles.mapContainer}>
                {days.map((date, index) => {
                    const isToday = date === today.toISOString().split('T')[0];
                    const isPast = new Date(date) < new Date(today.toISOString().split('T')[0]);
                    const isFuture = new Date(date) > new Date(today.toISOString().split('T')[0]);

                    const isCompleted = history.includes(date);

                    // ZIG ZAG LOGIC
                    // We want the path to wind back and forth.
                    // 0: Center
                    // 1: Right
                    // 2: Center (or Left?)
                    // Let's do Sine wave: Center -> Right -> Center -> Left -> Center...
                    // Indices: 0, 1, 2, 3, 4, 5, 6
                    // Offsets from center: 0, +50, 0, -50, 0, +50, 0

                    const offsets = [0, 60, 0, -60, 0, 60, 0];
                    const nodeXOffset = offsets[index];

                    // STYLES
                    // Past/Completed: Glowing Green
                    // Today: Zippy
                    // Future: Grey

                    let nodeColor = ['#E5E7EB', '#D1D5DB', '#9CA3AF']; // Grey 3D
                    let iconName = "lock";
                    let iconColor = "#9CA3AF";
                    let textColor = "#6B7280";
                    let opacity = 0.5;

                    if (isCompleted) {
                        // GLOWING GREEN
                        nodeColor = ['#a3e635', '#4ade80', '#16a34a'];
                        iconName = "check-bold";
                        iconColor = "white";
                        textColor = "#14532D";
                        opacity = 1;
                    } else if (isToday) {
                        // ACTIVE (Orange or Neutral waiting)
                        // User said "Current day has Zippy". 
                        // If not done, it should look active.
                        nodeColor = ['#FEF08A', '#FACC15', '#CA8A04']; // Yellow/Gold
                        iconName = "star";
                        iconColor = "white";
                        textColor = "#713F12";
                        opacity = 1;
                    }

                    return (
                        <View key={date} style={[styles.row, { left: nodeXOffset }]}>
                            {/* CONNECTOR (Absolute) */}
                            {/* The connector needs to originate from the center of this node visually 
                                 It's hard to position perfectly in a relative flow. 
                                 Let's actually put the connectors in a separate layer or calculated carefully.
                                 
                                 Simplified Approach: 
                                 Just draw a line between centers. 
                                 I'll use a hacky rotation on a view placed absolute bottom center.
                             */}
                            {index < days.length - 1 && (
                                <View style={{ position: 'absolute', top: NODE_SIZE / 2, left: NODE_SIZE / 2 - 1, zIndex: -1 }}>
                                    {/* Calculated Connector */}
                                    <View style={{
                                        width: 4,
                                        height: Math.sqrt(VERTICAL_SPACING ** 2 + (offsets[index + 1] - nodeXOffset) ** 2),
                                        backgroundColor: (isCompleted || (isToday && isCompleted))
                                            ? '#4ADE80' // Green if path traveled
                                            : 'rgba(255,255,255,0.3)', // Semi-transparent white "drawn" effect
                                        transformOrigin: 'top center',
                                        transform: [
                                            { rotate: `${-Math.atan2(offsets[index + 1] - nodeXOffset, VERTICAL_SPACING)}rad` }
                                        ]
                                    }} />
                                </View>
                            )}

                            <Animated.View
                                entering={FadeInDown.delay(index * 100).springify()}
                                style={[styles.nodeWrapper]}
                            >
                                <LinearGradient
                                    colors={nodeColor as any}
                                    style={styles.nodeInner}
                                >
                                    {/* LABEL */}
                                    <Text style={[styles.dateLabel, { color: iconColor }]}>
                                        {new Date(date).getDate()}
                                    </Text>
                                    <Text style={[styles.dayLabel, { color: iconColor }]}>
                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                    </Text>

                                    {/* ICON (Small) */}
                                    {/* <MaterialCommunityIcons name={iconName} size={16} color={iconColor} style={{ marginTop: 2}} /> */}
                                </LinearGradient>

                                {/* MASCOT ON TOP (If Today) */}
                                {isToday && (
                                    <Animated.View entering={FadeIn.delay(500)} style={styles.mascotContainer}>
                                        <Image source={mascotSource} style={styles.mascotImage} resizeMode="contain" />
                                    </Animated.View>
                                )}

                                {/* GLOW EFFECT (If Past/Check) */}
                                {isCompleted && (
                                    <View style={styles.glow} />
                                )}
                            </Animated.View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 20
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 30
    },
    title: {
        fontSize: 12,
        fontWeight: '900',
        color: '#9CA3AF',
        letterSpacing: 2
    },
    streakBadge: {
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2
    },
    streakText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6B7280'
    },
    mapContainer: {
        alignItems: 'center',
        // We need space for the zigzag widths
        width: '100%',
        paddingBottom: 40
    },
    row: {
        height: VERTICAL_SPACING,
        justifyContent: 'flex-start', // Top aligned of the row
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
    },
    nodeWrapper: {
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: NODE_SIZE / 2,
        // 3D Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
        backgroundColor: 'white' // Fallback
    },
    nodeInner: {
        width: '100%',
        height: '100%',
        borderRadius: NODE_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        borderBottomWidth: 5, // Thick bottom for 3D
        borderBottomColor: 'rgba(0,0,0,0.1)' // Fake depth
    },
    dateLabel: {
        fontWeight: '900',
        fontSize: 16
    },
    dayLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: 0
    },
    mascotContainer: {
        position: 'absolute',
        top: -45, // Sit on top
        width: 80,
        height: 80,
        zIndex: 20
    },
    mascotImage: {
        width: '100%',
        height: '100%'
    },
    glow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 30,
        backgroundColor: '#4ade80',
        opacity: 0.4,
        zIndex: -1,
        transform: [{ scale: 1.2 }]
    }
});
