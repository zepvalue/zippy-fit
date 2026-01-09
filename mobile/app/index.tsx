import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import DashboardScreen from '../screens/DashboardScreen';
import AuthScreen from '../screens/AuthScreen';

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for login/logout events
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {session && session.user ? (
        <DashboardScreen session={session} />
      ) : (
        <AuthScreen />
      )}
    </View>
  );
}