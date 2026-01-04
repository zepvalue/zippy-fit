import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CHALLENGES = [
    "Do 20 pushups",
    "Drink 2L of water",
    "Walk 10,000 steps",
    "Do 50 jumping jacks",
    "Hold a plank for 1 minute",
    "Stretch for 10 minutes",
    "Eat a piece of fruit",
    "Do 15 squats",
    "Take the stairs today",
    "No sugar for the rest of the day",
    "Do 20 lunges",
    "Meditate for 5 minutes",
    "Stand up every hour",
    "Go for a 15 minute walk",
    "Do 10 burpees"
];

interface ChallengeOfTheDayProps {
    onComplete: () => void;
    isCompleted: boolean;
}

export default function ChallengeOfTheDay({ onComplete, isCompleted }: ChallengeOfTheDayProps) {
    // Memoize the challenge so it doesn't change on re-renders, 
    // but updates if the day changes (though in a single session it likely won't).
    const challenge = useMemo(() => {
        // Simple hash of the date string to pick a challenge
        const dateStr = new Date().toDateString(); // "Fri Dec 28 2025"
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
            hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % CHALLENGES.length;
        return CHALLENGES[index];
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="trophy" size={24} color="#FF9600" />
                <Text style={styles.title}>CHALLENGE OF THE DAY</Text>
            </View>

            <Text style={styles.challengeText}>{challenge}</Text>

            <TouchableOpacity
                style={[styles.button, isCompleted && styles.buttonCompleted]}
                onPress={onComplete}
                disabled={isCompleted}
            >
                <Text style={[styles.buttonText, isCompleted && styles.buttonTextCompleted]}>
                    {isCompleted ? "COMPLETED ✅" : "MARK COMPLETE"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        padding: 20,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    title: {
        fontWeight: '900',
        color: '#CECECE',
        fontSize: 14,
        letterSpacing: 2,
    },
    challengeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4B4B4B',
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: '#58CC02',
        borderBottomWidth: 4,
        borderBottomColor: '#46A302', // darker green
        width: '100%',
        alignItems: 'center',
    },
    buttonCompleted: {
        backgroundColor: '#E5E5E5',
        borderBottomColor: '#D4D4D4',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    buttonTextCompleted: {
        color: '#AFAFAF',
    }
});
