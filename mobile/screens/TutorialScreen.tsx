import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Container from '../components/ui/Container';
import DuoButton from '../components/ui/DuoButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TutorialScreenProps {
    onComplete: () => void;
}

export default function TutorialScreen({ onComplete }: TutorialScreenProps) {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "SHARED FATE",
            text: "Your team shares a single streak. If one person misses a workout, the streak resets for everyone!",
            icon: "heart-multiple",
            color: "#FF4B4B"
        },
        {
            title: "BOSS BATTLES",
            text: "Every workout deals damage to the Boss. Choose harder attacks (more reps) to defeat it faster!",
            icon: "sword-cross",
            color: "#FF9600"
        },
        {
            title: "TEAM WORK",
            text: "Invite as many friends as you want. The team is only safe when EVERYONE has completed their mission.",
            icon: "account-group",
            color: "#3B82F6"
        },
        {
            title: "NUDGE THEM",
            text: "Teammate sleeping? Send a Nudge notification to wake them up!",
            icon: "bell-ring",
            color: "#58CC02"
        }
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    return (
        <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
            <View style={styles.card}>
                <MaterialCommunityIcons
                    name={currentStep.icon as any}
                    size={80}
                    color={currentStep.color}
                    style={{ marginBottom: 20 }}
                />

                <Text style={[styles.title, { color: currentStep.color }]}>
                    {currentStep.title}
                </Text>

                <Text style={styles.text}>
                    {currentStep.text}
                </Text>

                <View style={styles.dots}>
                    {steps.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: i === step ? currentStep.color : '#E5E5E5' }
                            ]}
                        />
                    ))}
                </View>
            </View>

            <View style={{ width: '100%', marginTop: 30 }}>
                <DuoButton
                    title={step === steps.length - 1 ? "I'M READY!" : "NEXT"}
                    onPress={handleNext}
                    color={currentStep.color}
                    shadowColor="#ccc"
                />
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 32,
        alignItems: 'center',
        width: '100%',
        minHeight: 350,
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 15,
        letterSpacing: 2
    },
    text: {
        fontSize: 18,
        color: '#777',
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 30
    },
    dots: {
        flexDirection: 'row',
        gap: 8
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5
    }
});
