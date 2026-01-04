import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DuoButton from '../components/ui/DuoButton';
import Container from '../components/ui/Container';
import { api } from '../lib/api';

interface OnboardingProps {
    token: string;
    onSuccess: () => void; // Function to call when team is set up
}

export default function OnboardingScreen({ token, onSuccess }: OnboardingProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'MENU' | 'JOIN'>('MENU');

    // Handle "Create Team"
    async function handleCreate() {
        setLoading(true);
        console.log("👉 User clicked Create Team");

        const res = await api.createTeam(token);

        setLoading(false);
        console.log("👈 Result in UI:", res);

        if (res.error) {
            // Use window.alert for Web, Alert.alert for Mobile
            if (Platform.OS === 'web') {
                window.alert(`Error: ${res.error}`);
            } else {
                Alert.alert("Error", res.error);
            }
        } else {
            // SUCCESS!
            const successMsg = `Team Created! Code: ${res.code}`;
            if (Platform.OS === 'web') {
                window.alert(successMsg);
            } else {
                Alert.alert("Success", successMsg);
            }

            console.log("✅ Calling onSuccess()...");
            onSuccess(); // This refreshes the Dashboard
        }
    }

    // Handle "Join Team"
    async function handleJoin() {
        if (code.length < 4) {
            Alert.alert("Invalid Code", "Code must be at least 4 characters.");
            return;
        }

        setLoading(true);
        const res = await api.joinTeam(token, code);
        setLoading(false);

        if (res.error) {
            Alert.alert("Error", res.error);
        } else {
            Alert.alert("Joined!", "You are now linked with your partner.");
            onSuccess();
        }
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
            <MaterialCommunityIcons name="account-group" size={80} color="#58CC02" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>FIND YOUR DUO</Text>
            <Text style={styles.subtitle}>Fitness is better together. Pair up with a friend to start your streak.</Text>

            {mode === 'MENU' ? (
                <View style={{ width: '100%', gap: 15, marginTop: 30 }}>
                    <DuoButton
                        title={loading ? "CREATING..." : "CREATE NEW TEAM"}
                        onPress={handleCreate}
                    />
                    <DuoButton
                        title="I HAVE A CODE"
                        onPress={() => setMode('JOIN')}
                        color="#fff"
                        textColor="#58CC02"
                        shadowColor="#E5E5E5"
                    />
                </View>
            ) : (
                <View style={{ width: '100%', marginTop: 30 }}>
                    <TextInput
                        style={styles.input}
                        placeholder="ENTER CODE (e.g. XJ92)"
                        value={code}
                        onChangeText={text => setCode(text.toUpperCase())}
                        maxLength={6}
                        autoCapitalize="characters"
                    />

                    <View style={{ gap: 15 }}>
                        <DuoButton
                            title={loading ? "JOINING..." : "JOIN TEAM"}
                            onPress={handleJoin}
                        />
                        <DuoButton
                            title="BACK"
                            onPress={() => setMode('MENU')}
                            color="#fff"
                            textColor="#58CC02"
                            shadowColor="#E5E5E5"
                        />
                    </View>
                </View>
            )}
        </Container>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 28, fontWeight: '900', color: '#4B4B4B', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#CECECE', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    input: {
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        padding: 15,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        backgroundColor: '#F7F7F7',
        width: '100%',
        letterSpacing: 2
    }
});