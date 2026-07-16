import { Stack } from 'expo-router';

// Stack for daily attendance marking + the monthly report.
export default function AttendanceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
