import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { Colors } from '../constants/theme';
import { initFirebase, onAuthChange } from '../services/firebase';
import { registerForPushNotifications, requestPermissions } from '../services/notifications';
import { flushQueue, startOfflineQueueSync } from '../services/offlineQueue';
import { useLogStore } from '../store/useLogStore';
import { useMedicineStore } from '../store/useMedicineStore';
import LoginScreen from './login';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// MediMind Paper theme
const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.danger,
  },
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const loadMedicines = useMedicineStore((s) => s.loadMedicines);
  const loadTodayLogs = useLogStore((s) => s.loadTodayLogs);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Initialize Firebase and check auth
    initFirebase();

    // Listen for auth state changes
    const unsubscribe = onAuthChange(async (userId) => {
      if (userId) {
        setIsAuthenticated(true);
        await AsyncStorage.setItem('@medimind_userId', userId);
        await requestPermissions();
        registerForPushNotifications().catch(() => { });
        await loadMedicines();
        await loadTodayLogs();
        startOfflineQueueSync();
        flushQueue().catch(() => { });
      } else {
        // Check if we have a stored userId (offline case)
        const storedUserId = await AsyncStorage.getItem('@medimind_userId');
        if (storedUserId) {
          setIsAuthenticated(true);
          await loadMedicines();
          await loadTodayLogs();
        } else {
          setIsAuthenticated(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loaded && isAuthenticated !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthenticated]);

  if (!loaded || isAuthenticated === null) {
    return null;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <PaperProvider theme={paperTheme}>
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="medicine/add"
            options={{
              title: 'Add Medicine',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.primary,
              headerTitleStyle: { fontSize: 20, fontWeight: '600' },
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="log-dose"
            options={{
              title: 'Log Dose',
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="medicine/[id]"
            options={{
              title: 'Edit Medicine',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.primary,
              headerTitleStyle: { fontSize: 20, fontWeight: '600' },
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}
