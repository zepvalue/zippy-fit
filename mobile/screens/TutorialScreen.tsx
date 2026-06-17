import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

interface TutorialScreenProps {
    onComplete?: () => void;
    // Render as a centered card (settings refresher) instead of full screen.
    asCard?: boolean;
}

export default function TutorialScreen({ onComplete, asCard = false }: TutorialScreenProps) {
    const router = useRouter(); // Use Expo Router
    const [step, setStep] = useState(0);
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);

    // Convex Mutations
    const createTeam = useMutation(api.teams.create);
    const joinTeam = useMutation(api.teams.join);

    const handleCreateTeam = async () => {
        setLoading(true);
        try {
            const result = await createTeam({});
            Alert.alert("Team Created!", `Your invite code is: ${result.code}`);
            if (onComplete) {
                onComplete();
            } else {
                router.replace('/');
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to create team");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!inviteCode) {
            Alert.alert("Error", "Please enter a code");
            return;
        }
        setLoading(true);
        try {
            const result = await joinTeam({ code: inviteCode });
            Alert.alert("Joined!", `Welcome to the team.`);
            if (onComplete) {
                onComplete();
            } else {
                router.replace('/');
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Invalid code");
        } finally {
            setLoading(false);
        }
    };

    // ... rest of UI logic remains similar, just removed fetch calls ...

    const slides = [
        {
            title: "Welcome to ZippyFit",
            description: "The fitness game you play with a partner.",
            icon: "dumbbell"
        },
        {
            title: "Keep the Streak",
            description: "Work out every day to build your streak. If one person misses, you both lose hearts!",
            icon: "fire"
        },
        {
            title: "Get Ready",
            description: "Create a team or join your partner using their code.",
            icon: "account-group"
        }
    ];

    const body = (
        <>
            <View style={[styles.iconContainer, asCard && styles.iconContainerCard]}>
                <MaterialCommunityIcons name={slides[step].icon as any} size={asCard ? 52 : 80} color="#FF4B4B" />
            </View>

            <Text style={styles.title}>{slides[step].title}</Text>
            <Text style={[styles.description, asCard && styles.descriptionCard]}>{slides[step].description}</Text>

            {step < 2 ? (
                <TouchableOpacity style={styles.button} onPress={() => setStep(step + 1)}>
                    <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.button, loading && styles.disabled]}
                        onPress={handleCreateTeam}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Create New Team</Text>}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <Text style={styles.dividerText}>OR JOIN PARTNER</Text>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter Invite Code"
                        placeholderTextColor="#666"
                        value={inviteCode}
                        onChangeText={setInviteCode}
                        autoCapitalize="characters"
                        maxLength={4}
                    />

                    <TouchableOpacity
                        style={[styles.secondaryButton, loading && styles.disabled]}
                        onPress={handleJoinTeam}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FF4B4B" /> : <Text style={styles.secondaryButtonText}>Join Team</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </>
    );

    // Refresher: centered card over a dimmed backdrop (matches ProfileModal).
    if (asCard) {
        return (
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    {onComplete && (
                        <TouchableOpacity style={styles.cardClose} onPress={onComplete} hitSlop={12}>
                            <MaterialCommunityIcons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {body}
                </View>
            </View>
        );
    }

    // Onboarding: full-screen, mandatory (no close button).
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
            <StatusBar hidden />
            <View style={styles.content}>
                {body}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
        width: '88%',
        maxHeight: '85%',
        backgroundColor: '#111',
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    cardClose: {
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 10,
        padding: 4,
    },
    iconContainer: {
        marginBottom: 40,
        width: 120,
        height: 120,
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerCard: {
        width: 88,
        height: 88,
        borderRadius: 44,
        marginBottom: 20,
    },
    descriptionCard: {
        marginBottom: 28,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 50,
    },
    button: {
        backgroundColor: '#FF4B4B',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionContainer: {
        width: '100%',
        alignItems: 'center',
    },
    divider: {
        marginVertical: 20,
    },
    dividerText: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#1A1A1A',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
        textTransform: 'uppercase',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FF4B4B',
    },
    secondaryButtonText: {
        color: '#FF4B4B',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabled: {
        opacity: 0.7
    }
});
