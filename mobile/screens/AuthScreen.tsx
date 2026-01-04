import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import DuoButton from '../components/ui/DuoButton';
import Container from '@/components/ui/Container';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) Alert.alert("Error", error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) Alert.alert("Check your inbox!", "We sent you a verification link.");
        setLoading(false);
    }

    return (
        <Container style={{ justifyContent: 'center' }}>
            <Text style={styles.title}> ZippyFit </Text>

            < View style={styles.inputContainer} >
                <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput
                    placeholder="Password"
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
        backgroundColor: '#F7F7F7'
    }
});