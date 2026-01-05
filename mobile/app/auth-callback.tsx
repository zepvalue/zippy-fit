import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
    const router = useRouter();
    const [status, setStatus] = useState<'verifying' | 'success'>('verifying');

    useEffect(() => {
        const handleAuth = async () => {
            // Give Supabase a moment to process the hash
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                console.log("✅ Auth Callback: Session found, showing success...");
                setStatus('success');
                setTimeout(() => {
                    router.replace("/");
                }, 2000);
            } else {
                console.log("⏳ Auth Callback: No session yet, waiting...");
                setTimeout(() => {
                    // Fallback redirect
                    router.replace("/");
                }, 2000);
            }
        };

        handleAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                setStatus('success');
                setTimeout(() => router.replace("/"), 2000);
            }
        });

        return () => {
            subscription.unsubscribe();
        };

    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            {status === 'verifying' ? (
                <>
                    <ActivityIndicator size="large" color="#58CC02" />
                    <Text style={{ marginTop: 20, fontSize: 16, color: '#555' }}>Verifying your email...</Text>
                </>
            ) : (
                <>
                    <MaterialCommunityIcons name="check-circle" size={80} color="#58CC02" />
                    <Text style={{ marginTop: 20, fontSize: 22, fontWeight: 'bold', color: '#58CC02' }}>Email Verified!</Text>
                    <Text style={{ marginTop: 10, fontSize: 14, color: '#888' }}>Redirecting you to ZippyFit...</Text>
                </>
            )}
        </View>
    );
}
