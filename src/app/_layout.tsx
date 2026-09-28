import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import { ConnectivityProvider } from '@/presentation/state/ConnectivityProvider';
import { ProfileProvider } from '@/presentation/state/ProfileProvider';
import { SocialProvider } from '@/presentation/state/SocialProvider';
import { ChallengeBanner } from '@/presentation/social/ChallengeBanner';

const TAB_ROUTES = ['index', 'online', 'rewards', 'friends', 'profile'] as const;

export default function RootLayout() {
  // Registered under these exact names, which is what theme/typography.ts
  // refers to, identically on every platform.
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });
  // A few frames at most; a font that fails to load falls back to the system
  // typeface rather than holding the app on a blank screen.
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      {/* Lets every screen and dialog keep the field being typed in above the keyboard. */}
      <KeyboardProvider>
        <ConnectivityProvider>
          <ProfileProvider>
            <SocialProvider>
              <StatusBar style="light" />
              {/* The banner sits above the navigator so a challenge reaches the
                player on any screen, including mid-game. */}
              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0e1322' },
                  }}
                >
                  {/* Bottom-bar screens swap instantly at the native level (the
                      native replace animation can leave the new screen hidden on
                      Android); Screen eases their content in from the tapped side. */}
                  {TAB_ROUTES.map((name) => (
                    <Stack.Screen key={name} name={name} options={{ animation: 'none' }} />
                  ))}
                </Stack>
                <ChallengeBanner />
              </View>
            </SocialProvider>
          </ProfileProvider>
        </ConnectivityProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
