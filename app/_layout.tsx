import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import OnboardingScreen from '@/components/OnboardingScreen';

export default function RootLayout() {
  useFrameworkReady();
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <>
      {showOnboarding ? (
        <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
      <StatusBar style="light" />
    </>
  );
}
