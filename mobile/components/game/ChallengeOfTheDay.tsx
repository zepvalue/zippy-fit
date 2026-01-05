import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChallengeOfTheDayProps {
    challengeText: string;
    onComplete: () => void;
    isCompleted: boolean;
}

export default function ChallengeOfTheDay({ challengeText, onComplete, isCompleted }: ChallengeOfTheDayProps) {


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="trophy" size={24} color="#FF9600" />
                <Text style={styles.title}>CHALLENGE OF THE DAY</Text>
            </View>

            <Text style={styles.challengeText}>{challengeText}</Text>

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
