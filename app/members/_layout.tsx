import { Stack } from 'expo-router';

// Stack for the "members" (supervisors who can view my page) screen.
export default function MembersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
