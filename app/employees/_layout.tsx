import { Stack } from 'expo-router';

// Stack for the admin employees list + employee profile screens.
export default function EmployeesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
