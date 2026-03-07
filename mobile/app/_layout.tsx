import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Suppress known benign warnings
LogBox.ignoreLogs([
  "Listening to push token changes is not yet fully supported on web",
  "expo-notifications: Android Push notifications", // Ignore Expo Go SDK 53 restriction error
]);

import { SafeAreaProvider } from 'react-native-safe-area-context';
import ConvexClientProvider from '../components/ConvexClientProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ConvexClientProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* This configuration applies to ALL screens */}
          <Stack.Screen name="index" />
        </Stack>
      </SafeAreaProvider>
    </ConvexClientProvider>
  );
}