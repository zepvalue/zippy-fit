import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// 1. Adapter for SecureStore (Mobile)
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

// 2. Decide which storage to use
const getStorage = () => {
    // If we are on the Web...
    if (Platform.OS === 'web') {
        // ...Check if we are in the Browser or on the Server
        if (typeof window === 'undefined') {
            return null; // 🛑 SERVER SIDE: Return null (No storage)
        }
        return AsyncStorage; // ✅ CLIENT SIDE: Use AsyncStorage
    }

    // If we are on Mobile (iOS/Android), use SecureStore
    return ExpoSecureStoreAdapter;
};

// 3. Load Keys
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ MISSING KEYS: Check mobile/.env file.");
}

// 4. Initialize Supabase
export const supabase = createClient(
    supabaseUrl || "",
    supabaseAnonKey || "",
    {
        auth: {
            storage: getStorage(), // <--- Safe storage selector
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },

    }
);