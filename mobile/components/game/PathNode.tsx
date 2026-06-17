import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Flame, Lock } from 'lucide-react-native';
import { MotiView } from 'moti';

export type PathNodeStatus = 'locked' | 'active' | 'done' | 'perfect';

interface PathNodeProps {
    day: number;
    status: PathNodeStatus;
    isToday?: boolean;
}

export default function PathNode({ day, status }: PathNodeProps) {
    // 1. Define colors and icons based on status
    let faceColor = "#E5E5E5"; // Gray (Locked)
    let shadowColor = "#C8C8C8";
    let icon = <Lock size={24} color="#AFAFAF" />;
    let textColor = "#AFAFAF";
    let borderColor = 'rgba(255,255,255,0.2)';
    let borderWidth = 4;
    let size = 70; // Standard size

    if (status === 'active') { // Current Day
        faceColor = "#FF9600"; // Orange
        shadowColor = "#D37C00";
        icon = <></>; // Mascot will be placed by parent on top
        textColor = "#FF9600";
    } else if (status === 'done') {
        faceColor = "#FFD700"; // Gold
        shadowColor = "#D1B000";
        icon = <Check size={28} color="white" strokeWidth={3} />;
        textColor = "#FFD700";
    } else if (status === 'perfect') {
        faceColor = "#EF4444"; // Red/Hot
        shadowColor = "#B91C1C";
        icon = <Flame size={28} color="white" fill="white" />;
        textColor = "#EF4444";
    }

    return (
        <View style={[styles.container, { height: size + 30 }]}>
            {/* Pulsing Ring for Active Node */}
            {status === 'active' && (
                <MotiView
                    from={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                    }}
                    style={[styles.pulseRing, { width: size, height: size, borderRadius: size / 2 }]}
                />
            )}

            {/* 2. The 3D Circle */}
            <View style={[styles.nodeWrapper, { width: size + 10, height: size + 10 }]}>
                <View style={[
                    styles.nodeShadow,
                    {
                        backgroundColor: shadowColor,
                        width: size,
                        height: size,
                        borderRadius: size / 2
                    }
                ]} />
                <View style={[
                    styles.nodeFace,
                    {
                        backgroundColor: faceColor,
                        borderColor: borderColor,
                        borderWidth: borderWidth,
                        width: size,
                        height: size,
                        borderRadius: size / 2
                    }
                ]}>
                    {icon}
                </View>
            </View>

            {/* 3. The Floating Label */}
            <View style={styles.labelContainer}>
                <Text style={[styles.labelText, { color: textColor }]}>DAY {day}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    nodeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 5,
    },
    nodeFace: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    nodeShadow: {
        position: 'absolute',
        top: 6,
        zIndex: 1,
    },
    pulseRing: {
        position: 'absolute',
        backgroundColor: '#FF9600',
        zIndex: 0,
    },
    labelContainer: {
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        position: 'absolute',
        bottom: -10,
        zIndex: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    labelText: {
        fontWeight: '900',
        fontSize: 12,
    }
});
