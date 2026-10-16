import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setLanguage } from '@/presentation/i18n';
import { EntitlementsProvider } from '@/presentation/state/EntitlementsProvider';
import { RecordProvider } from '@/presentation/state/RecordProvider';
import { SettingsProvider, useSettings } from '@/presentation/state/SettingsProvider';
import { ThemeProvider, useTheme } from '@/presentation/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_500Medium,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <EntitlementsProvider>
              <RecordProvider>{ready ? <Navigator /> : null}</RecordProvider>
            </EntitlementsProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const theme = useTheme();
  const { settings, loaded } = useSettings();
  useEffect(() => {
    setLanguage(settings.language);
  }, [settings.language]);
  useEffect(() => {
    // Settings decide the light (Evening or Morning); show the app once they are in.
    if (loaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);
  return (
    <>
      <StatusBar style={theme.scheme === 'evening' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {/* A level takes the whole screen; a tap near the edge must never become a swipe back. */}
        <Stack.Screen name="play/[id]" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
