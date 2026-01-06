import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

interface JourneyMapProps {
    history: string[];
    onSpotRequest?: () => void;
    canRequestSpot?: boolean;
    spotStatus?: 'active' | 'none' | 'requested_by_partner';
}

export default function JourneyMap({ history, onSpotRequest, canRequestSpot, spotStatus }: JourneyMapProps) {
    // Generate last 5 days + next 2 days for the "Map" view
    const today = new Date();
    const days = [];
    for (let i = -4; i <= 2; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>YOUR JOURNEY</Text>
                {canRequestSpot && (
                    <Text onPress={onSpotRequest} style={styles.spotLink}>
                        Can't workout?
                    </Text>
                )}
                {spotStatus === 'active' && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>SPOT ACTIVE</Text>
                    </View>
                )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
                {days.map((date, index) => {
                    const isCompleted = history.includes(date);
                    const isToday = date === today.toISOString().split('T')[0];
                    const isFuture = new Date(date) > today;

                    return (
                        <View key={date} style={styles.stepContainer}>
                            {/* Path Connector */}
                            {index > 0 && <View style={[styles.connector, { backgroundColor: isCompleted || (isToday && isCompleted) ? '#58CC02' : '#E5E5E5' }]} />}

                            {/* Step Node */}
                            <View style={[
                                styles.node,
                                isCompleted ? styles.nodeCompleted : (isToday ? styles.nodeCurrent : styles.nodeFuture)
                            ]}>
                                {isToday && !isCompleted ? (
                                    <View style={styles.mascotPlaceholder}>
                                        {/* Zippy Head will go here or just an icon for now */}
                                        <MaterialCommunityIcons name="lightning-bolt" size={20} color="white" />
                                    </View>
                                ) : (
                                    (isCompleted || isFuture) ? (
                                        <MaterialCommunityIcons
                                            name={isCompleted ? "check-bold" : "lock"}
                                            size={isCompleted ? 20 : 16}
                                            color={isCompleted ? "white" : "#B0B0B0"}
                                        />
                                    ) : (
                                        <Text style={styles.pastDayText}>
                                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                                        </Text>
                                    )
                                )}
                            </View>

                            <Text style={styles.dayLabel}>
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 20,
        width: '100%',
        marginBottom: 20,
        // Solid clean look (Reverted Glass)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    title: {
        fontWeight: '900',
        color: '#B0B0B0',
        fontSize: 14,
        letterSpacing: 2,
        marginBottom: 0, // removed margin to handle row
        textAlign: 'center'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 10
    },
    spotLink: {
        color: '#FF9600',
        fontWeight: 'bold',
        fontSize: 12,
        textDecorationLine: 'underline'
    },
    badge: {
        backgroundColor: '#FF9600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8
    },
    badgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10
    },
    track: {
        alignItems: 'center',
        paddingHorizontal: 10
    },
    stepContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        marginRight: -10 // Pull nodes closer together
    },
    connector: {
        width: 30,
        height: 4,
        position: 'absolute',
        left: -20,
        top: 23,
        zIndex: -1
    },
    node: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E5E5E5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
        zIndex: 1
    },
    nodeCompleted: {
        backgroundColor: '#58CC02',
    },
    nodeCurrent: {
        backgroundColor: '#FF9600', // Orange for today
        transform: [{ scale: 1.1 }]
    },
    nodeFuture: {
        backgroundColor: '#F0F0F0'
    },
    mascotPlaceholder: {
        // Simple placeholder for Zippy's location
    },
    dayLabel: {
        position: 'absolute',
        bottom: -20,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#B0B0B0',
        width: 50,
        textAlign: 'center'
    },
    pastDayText: {
        color: '#B0B0B0',
        fontWeight: 'bold',
        fontSize: 14
    }
});
