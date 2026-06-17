import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useConvexAuth, useQuery } from "convex/react";
import { api } from '../convex/_generated/api';
import DashboardScreen from '../screens/DashboardScreen';
import AuthScreen from '../screens/AuthScreen';
import TutorialScreen from '../screens/TutorialScreen';

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#FF4B4B" />
    </View>
  );
}

export default function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const dashboardData = useQuery(
    api.dashboard.get,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Query in flight or auth not yet resolved server-side — wait, don't fall
  // through to the tutorial (that was the original bug: null was treated as
  // "no team").
  if (dashboardData === undefined || dashboardData === null) {
    return <Loading />;
  }

  // Authenticated and resolved: show onboarding/team-setup only when there is
  // genuinely no team. A user with a team goes straight to the dashboard.
  if (dashboardData.has_team === false) {
    return <TutorialScreen />;
  }

  return <DashboardScreen />;
}
