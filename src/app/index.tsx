import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Root index — immediately navigates to the (tabs) group.
// Expo Router groups with () are transparent in the URL,
// so /(tabs) maps to the same '/' path as this file.
// This redirect ensures any deep-link to '/' reaches the dashboard.
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return null;
}
