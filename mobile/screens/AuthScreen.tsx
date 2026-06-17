import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthActions } from "@convex-dev/auth/react";
import DuoButton from '../components/ui/DuoButton';
import Container from '@/components/ui/Container';

export default function AuthScreen() {
    const { signIn } = useAuthActions();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    async function handleAuth() {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Error", "Please enter both email and password.");
            return;
        }
        setLoading(true);
        try {
            const flow = isLogin ? "signIn" : "signUp";
            await signIn("password", { email, password, flow });
            // For email verification flow, we might need to handle the step parameter
            // But for simple password auth (if configured dev mode or without verification), it might just log in.
        } catch (error: any) {
            let errorMsg = error.message || "Unknown error";
            if (errorMsg.includes("InvalidSecret")) {
                errorMsg = "Incorrect password.";
            } else if (errorMsg.includes("InvalidAccountId")) {
                errorMsg = "Account not found.";
            }
            Alert.alert("Authentication Failed", errorMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
            <Stack.Screen options={{ headerShown: false, contentStyle: { backgroundColor: '#FFF8E7' } }} />
            <View style={{
                width: 150, height: 150, borderRadius: 75, backgroundColor: '#F9F9F9',
                justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 10,
                shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
                // Removed overflow: 'hidden' to prevent clipping animation
            }}>
                <Image
                    source={require('../assets/animations/happy_zippy_animated.gif')}
                    style={{ width: 110, height: 110 }}
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.title}> ZippyFit </Text>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Email"
                    placeholderTextColor="#A0A0A0"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput
                    placeholder="Password"
                    placeholderTextColor="#A0A0A0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                />
            </View>

            <DuoButton
                title={loading ? "Loading..." : (isLogin ? "LOG IN" : "CREATE ACCOUNT")}
                onPress={handleAuth}
            />

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
                <Text style={styles.linkText}>
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                </Text>
            </TouchableOpacity>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'white' },
    title: { fontSize: 30, fontWeight: '900', color: '#58CC02', textAlign: 'center', marginBottom: 40 },
    inputContainer: { marginBottom: 20 },
    input: {
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        padding: 15,
        fontSize: 18,
        marginBottom: 10,
        backgroundColor: '#F7F7F7',
        color: '#333333'
    },
    linkText: {
        color: '#58CC02',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16
    }
});