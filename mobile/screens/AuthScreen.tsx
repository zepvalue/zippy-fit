import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import DuoButton from '../components/ui/DuoButton';
import Container from '@/components/ui/Container';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

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

    async function handleAuth() {
        if (!validateInputs()) return;
        setLoading(true);

        if (isLogin) {
            // LOGIN
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) Alert.alert("Login Failed", getErrorMessage(error));
        } else {
            // SIGN UP
            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { emailRedirectTo: 'zippyfit://auth-callback' }
            });
            if (error) {
                Alert.alert("Signup Failed", getErrorMessage(error));
            } else {
                Alert.alert("Check your inbox!", "We sent you a verification link.");
                setIsLogin(true); // Switch back to login after signup attempt
            }
        }
        setLoading(false);
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
            <Image
                source={require('../assets/mascot_happy.png')}
                style={{ width: 120, height: 120, alignSelf: 'center', marginBottom: 10 }}
                resizeMode="contain"
            />
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