import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, Image } from 'react-native';
// Reanimated removed temporarily for debugging
// import Animated, { FadeInDown } from 'react-native-reanimated';
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
                Alert.alert("Success", successMsg, [
                    { text: "OK", onPress: onSuccess }
                ]);
            }

            console.log("✅ Calling onSuccess()...");
            // onSuccess(); // Now called via Alert
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
            Alert.alert("Joined!", "You are now linked with your partner.", [
                { text: "OK", onPress: onSuccess }
            ]);
        }
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
            <View>
                <View style={{
                    width: 150, height: 150, borderRadius: 75, backgroundColor: '#F9F9F9',
                    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
                    // Removed overflow: 'hidden' to prevent clipping animation
                }}>
                    <Image
                        source={require('../assets/animations/happy_zippy_animated.gif')}
                        style={{ width: 110, height: 110 }}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.title}>RECRUIT YOUR PARTNER</Text>
                <Text style={styles.subtitle}>Fitness is a team sport. Find your duo and start your streak!</Text>
            </View>

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