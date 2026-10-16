import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { rewardedAds } from '@/config/container';
import { SessionProvider } from '@/presentation/state/SessionProvider';
import { SettingsProvider } from '@/presentation/state/SettingsProvider';
import { WalletProvider } from '@/presentation/state/WalletProvider';
import { colors } from '@/presentation/theme/colors';

// Where the law requires it, the ad consent form appears at launch rather
// than interrupting the player's first tap on a reward. No ad is ever shown
// without a tap.
rewardedAds.prepare();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SessionProvider>
            <WalletProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                {/* Leaving a game goes through its own button, not an edge swipe. */}
                <Stack.Screen name="game" options={{ gestureEnabled: false }} />
                <Stack.Screen name="match/[id]" options={{ gestureEnabled: false }} />
              </Stack>
            </WalletProvider>
          </SessionProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
