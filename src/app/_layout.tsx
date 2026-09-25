import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ConnectivityProvider } from '@/presentation/state/ConnectivityProvider';
import { ProfileProvider } from '@/presentation/state/ProfileProvider';
import { SocialProvider } from '@/presentation/state/SocialProvider';
import { ChallengeBanner } from '@/presentation/social/ChallengeBanner';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConnectivityProvider>
        <ProfileProvider>
          <SocialProvider>
            <StatusBar style="light" />
            {/* The banner sits above the navigator so a challenge reaches the
                player on any screen, including mid-game. */}
            <View style={{ flex: 1 }}>
              <Stack
                screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0e1322' } }}
              />
              <ChallengeBanner />
            </View>
          </SocialProvider>
        </ProfileProvider>
      </ConnectivityProvider>
    </SafeAreaProvider>
  );
}
