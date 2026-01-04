import { Stack } from "expo-router";
import { LogBox } from "react-native";

// Suppress known benign warnings
LogBox.ignoreLogs([
  "Listening to push token changes is not yet fully supported on web",
  "expo-notifications: Android Push notifications", // Ignore Expo Go SDK 53 restriction error
]);

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This configuration applies to ALL screens */}
      <Stack.Screen name="index" />
    </Stack>
  );
}