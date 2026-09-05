import { Stack } from 'expo-router';

// Stack for the maintenance/custody requests list, compose, and detail screens.
export default function MaintenanceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
