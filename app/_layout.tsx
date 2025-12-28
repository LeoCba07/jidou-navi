// Root layout - wraps the entire app
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
