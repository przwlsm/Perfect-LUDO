import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SCRIPT_FONT_MAP } from '@/presentation/glyph/fonts';
import { setLanguage } from '@/presentation/i18n';
import { EntitlementsProvider } from '@/presentation/state/EntitlementsProvider';
import { ProgressProvider, useProgress } from '@/presentation/state/ProgressProvider';
import { SettingsProvider, useSettings } from '@/presentation/state/SettingsProvider';
import { ThemeProvider, useTheme } from '@/presentation/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Fraunces_700Bold,
    Nunito_500Medium,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    ...SCRIPT_FONT_MAP,
  });
  const fontsReady = fontsLoaded || !!fontError;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <EntitlementsProvider>
              <ProgressProvider>
                <Navigator fontsReady={fontsReady} />
              </ProgressProvider>
            </EntitlementsProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigator({ fontsReady }: { fontsReady: boolean }) {
  const theme = useTheme();
  const { settings, loaded } = useSettings();
  const { loaded: progressLoaded } = useProgress();
  const ready = fontsReady && loaded && progressLoaded;
  useEffect(() => {
    setLanguage(settings.language);
  }, [settings.language]);
  useEffect(() => {
    // Settings decide the light and whether to welcome; show the app once they are in.
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;
  return (
    <>
      <StatusBar style={theme.scheme === 'slate' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* Writing screens: leaving goes through the back button, not an edge swipe mid-stroke. */}
        <Stack.Screen name="trace/[script]/[index]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="slate" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
