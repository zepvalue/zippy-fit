import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import DuoButton from '../components/ui/DuoButton';
import Container from '@/components/ui/Container';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Helper to translate technical errors to friendly messages
    function getErrorMessage(error: any) {
        const msg = error.message || "Unknown error";
        if (msg.includes("Invalid login credentials")) return "Incorrect email or password.";
        if (msg.includes("already registered")) return "This email is already in use. Try logging in.";
        if (msg.includes("password should be")) return "Password is too weak. content length must be at least 6 characters.";
        if (msg.includes("invalid_grant")) return "Invalid login details.";
        return msg;
    }

    // Helper for validation
    function validateInputs() {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Missing Info", "Please enter both email and password.");
            return false;
        }
        return true;
    }

    async function signInWithEmail() {
        if (!validateInputs()) return;
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert("Login Failed", getErrorMessage(error));
        }
        setLoading(false);
    }

    async function signUpWithEmail() {
        if (!validateInputs()) return;
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: 'zippyfit://auth-callback'
            }
        });

        if (error) {
            Alert.alert("Signup Failed", getErrorMessage(error));
        } else {
            Alert.alert("Check your inbox!", "We sent you a verification link.");
        }
        setLoading(false);
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
            <Text style={styles.title}> ZippyFit </Text>

            < View style={styles.inputContainer} >
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

            < DuoButton title={loading ? "Loading..." : "LOG IN"} onPress={signInWithEmail} />
            <DuoButton title="CREATE ACCOUNT" onPress={signUpWithEmail} color="#fff" textColor="#58CC02" shadowColor="#E5E5E5" />
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
        color: '#333333' // Ensure text is visible
    }
});