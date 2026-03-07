import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useConvexAuth, useQuery } from "convex/react";
import { api } from '../convex/_generated/api';
import DashboardScreen from '../screens/DashboardScreen';
import AuthScreen from '../screens/AuthScreen';
import TutorialScreen from '../screens/TutorialScreen';

export default function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Only run when authenticated — returns null/undefined otherwise
  const dashboardData = useQuery(
    api.dashboard.get,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Still loading dashboard data
  if (dashboardData === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  // User has no team — send them to onboarding
  if (!dashboardData?.has_team) {
    return <TutorialScreen />;
  }

  return <DashboardScreen />;
}