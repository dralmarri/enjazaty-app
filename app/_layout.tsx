/**
 * Root layout — wires up global providers (Language, Auth), the gesture
 * handler root, safe-area context, and the Expo Router stack.
 */
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="language" />
              <Stack.Screen name="role" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="achievement" />
              <Stack.Screen name="employees" />
              <Stack.Screen name="members" />
              <Stack.Screen name="folder" />
              <Stack.Screen name="evaluate" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="contact" />
              <Stack.Screen name="report" />
              <Stack.Screen name="signatures" />
              <Stack.Screen name="sign" />
            </Stack>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
