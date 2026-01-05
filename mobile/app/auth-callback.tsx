import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        // Supabase's onAuthStateChange handles the session processing automatically
        // when the app opens via deep link. We just need to wait a moment and redirect.
        const handleAuth = async () => {
            // Give Supabase a moment to process the hash
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                console.log("✅ Auth Callback: Session found, redirecting...");
                router.replace("/");
            } else {
                console.log("⏳ Auth Callback: No session yet, waiting...");
                // If it takes too long, we might just redirect anyway and let root layout handle it
                setTimeout(() => {
                    router.replace("/");
                }, 2000);
            }
        };

        handleAuth();

        // Also listen for state changes (e.g. if the link comes in late)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                router.replace("/");
            }
        });

        return () => {
            subscription.unsubscribe();
        };

    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <ActivityIndicator size="large" color="#58CC02" />
            <Text style={{ marginTop: 20, fontSize: 16, color: '#555' }}>Verifying your email...</Text>
        </View>
    );
}
