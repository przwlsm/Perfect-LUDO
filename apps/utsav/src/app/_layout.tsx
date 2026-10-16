import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { YatraOne_400Regular } from '@expo-google-fonts/yatra-one';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/presentation/i18n';
import { CardFontsProvider } from '@/presentation/cards/fonts';
import { CardsProvider } from '@/presentation/state/CardsProvider';
import { EntitlementsProvider } from '@/presentation/state/EntitlementsProvider';
import { SettingsProvider, useSettings } from '@/presentation/state/SettingsProvider';
import { ThemeProvider, useTheme } from '@/presentation/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_500Medium,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    YatraOne_400Regular,
  });
  const ready = fontsLoaded || !!fontError;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <EntitlementsProvider>
              <CardsProvider>
                <CardFontsProvider>{ready ? <Navigator /> : null}</CardFontsProvider>
              </CardsProvider>
            </EntitlementsProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const theme = useTheme();
  const { loaded } = useSettings();
  useEffect(() => {
    // Settings decide the light (Ivory or Night); show the app once they are in.
    if (loaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);
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
        {/* The photo is pinched and dragged in the editor; no edge swipe should steal it. */}
        <Stack.Screen
          name="editor"
          options={{ gestureEnabled: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="sent" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </>
  );
}
