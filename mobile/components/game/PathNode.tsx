import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface PathNodeProps {
    day: number;
    status: 'locked' | 'active' | 'done';
}

export default function PathNode({ day, status }: PathNodeProps) {
    // 1. Define colors based on status
    let faceColor = "#E5E5E5"; // Gray (Locked)
    let shadowColor = "#C8C8C8";
    let iconName = "lock";
    let iconColor = "#AFAFAF";
    let textColor = "#AFAFAF";

    if (status === "active") {
        faceColor = "#FF9600"; // Orange (Today)
        shadowColor = "#D37C00";
        iconName = "fire";
        iconColor = "white";
        textColor = "#FF9600";
    } else if (status === "done") {
        faceColor = "#FFD700"; // Gold (Done)
        shadowColor = "#D1B000";
        iconName = "check";
        iconColor = "white";
        textColor = "#FFD700";
    }

    return (
        <View style={styles.container}>
            {/* 2. The 3D Circle */}
            <View style={styles.nodeWrapper}>
                <View style={[styles.nodeShadow, { backgroundColor: shadowColor }]} />
                <View style={[styles.nodeFace, { backgroundColor: faceColor }]}>
                    <FontAwesome5 name={iconName} size={28} color={iconColor} />
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
        marginBottom: 20, // Spacing between circles
        height: 100,      // Total height including label
        justifyContent: 'center',
    },
    nodeWrapper: {
        width: 80,
        height: 80,
        alignItems: 'center',
        marginBottom: 10,
    },
    nodeFace: {
        width: 70,
        height: 70,
        borderRadius: 35, // Perfect circle
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2, // Sits on top
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.2)', // Subtle highlight
    },
    nodeShadow: {
        width: 70,
        height: 70,
        borderRadius: 35,
        position: 'absolute',
        top: 6, // Pushes shadow down for 3D effect
        zIndex: 1,
    },
    labelContainer: {
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        position: 'absolute',
        bottom: 0,
        zIndex: 3,
    },
    labelText: {
        fontWeight: '900',
        fontSize: 12,
    }
});