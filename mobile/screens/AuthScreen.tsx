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
            // SIGN UP FLOW
            // 1. Try to Log In first (in case they essentially deleted data but are still in Auth system)
            console.log("🔹 Attempting check for existing user...");
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (loginData.session) {
                console.log("✅ User exists! Auto-logging in...");
                Alert.alert("Welcome Back!", "You already had an account, so we logged you in.");
                return; // Stop here, session listener will handle redirect
            }

            // 2. If Login failed, proceed with actual Sign Up
            console.log("🔹 Creating new user...");
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { emailRedirectTo: 'zippyfit://auth-callback' }
            });

            if (error) {
                // Hide "User already registered" error if possible, but usually handled by login check above
                Alert.alert("Signup Failed", getErrorMessage(error));
            } else if (data.session) {
                console.log("✅ Signup returned session (Immediate Verify).");
                Alert.alert("Welcome!", "Account created and verified.");
            } else {
                console.log("⏳ Verification Email Sent.");
                Alert.alert("Check your inbox!", "We sent you a verification link.");
                setIsLogin(true);
            }
        }
        setLoading(false);
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
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