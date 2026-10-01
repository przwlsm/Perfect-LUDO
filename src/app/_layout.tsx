import { useCallback, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LanguageProvider } from '@/presentation/i18n/LanguageProvider';
import { ConnectivityProvider } from '@/presentation/state/ConnectivityProvider';
import { ProfileProvider } from '@/presentation/state/ProfileProvider';
import { SocialProvider } from '@/presentation/state/SocialProvider';
import { ChallengeBanner } from '@/presentation/social/ChallengeBanner';
import { AppIntro } from '@/presentation/components/AppIntro';
import { AppUpdateProvider } from '@/presentation/state/AppUpdateProvider';
import { AppUpdateGate } from '@/presentation/components/AppUpdateGate';
import { CrashScreen } from '@/presentation/screens/CrashScreen';
import { FirstRunWalkthrough } from '@/presentation/components/Walkthrough';
import { rewardedAds } from '@/config/container';
import { startCrashReporting, withCrashReporting } from '@/config/monitoring';

// Before anything renders, so a crash during startup is reported too.
startCrashReporting();

// Keep the native splash up until the branded intro is drawn over it.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const TAB_ROUTES = ['index', 'online', 'rewards', 'friends', 'profile'] as const;

/** Expo Router shows this in place of the app when a render throws. */
export const ErrorBoundary = CrashScreen;

export default withCrashReporting(RootLayout);

function RootLayout() {
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => {
    setIntro(false);
    // Where the law requires it, the ad consent form appears now, at launch,
    // rather than interrupting the player's first tap on a reward.
    rewardedAds.prepare();
  }, []);
  return (
    // Language and its fonts first: nothing draws until both are ready, and a
    // font that fails to load falls back rather than holding the splash.
    <LanguageProvider>
      {/* Pinch-to-zoom on the big round tables needs the gesture root above everything. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {/* Lets every screen and dialog keep the field being typed in above the keyboard. */}
          <KeyboardProvider>
            <ConnectivityProvider>
              <ProfileProvider>
                <SocialProvider>
                  <AppUpdateProvider>
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
                      {/* After the intro, so a blocking update screen is never hidden behind it. */}
                      {!intro && <FirstRunWalkthrough />}
                      {!intro && <AppUpdateGate />}
                      {intro && <AppIntro onDone={endIntro} />}
                    </View>
                  </AppUpdateProvider>
                </SocialProvider>
              </ProfileProvider>
            </ConnectivityProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </LanguageProvider>
  );
}
