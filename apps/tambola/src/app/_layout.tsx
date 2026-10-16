import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setLanguage } from '@/presentation/i18n';
import { EntitlementsProvider } from '@/presentation/state/EntitlementsProvider';
import { GameProvider, useGame } from '@/presentation/state/GameProvider';
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
    Baloo2_700Bold,
  });
  const ready = fontsLoaded || !!fontError;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <EntitlementsProvider>
              <GameProvider>{ready ? <Navigator /> : null}</GameProvider>
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
  const game = useGame();
  useEffect(() => {
    setLanguage(settings.language);
  }, [settings.language]);
  useEffect(() => {
    // Settings decide the light and saved games decide Home; show the app once both are in.
    if (loaded && game.loaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, game.loaded]);
  if (!loaded || !game.loaded) return null;
  return (
    <>
      <StatusBar style={theme.scheme === 'night' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {/* A game in progress is left with its own buttons, never by a stray edge swipe. */}
        <Stack.Screen name="host/caller" options={{ gestureEnabled: false }} />
        <Stack.Screen name="solo/game" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="play" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
