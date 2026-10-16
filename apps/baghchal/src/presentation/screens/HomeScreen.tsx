import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rewardedAds } from '@/config/container';
import { useSettings } from '../state/SettingsProvider';
import { colors } from '../theme/colors';

export function HomeScreen() {
  const { settings, update } = useSettings();
  // Where the law requires it, players can revisit their ad privacy choices.
  const [adPrivacy, setAdPrivacy] = useState(false);
  useEffect(() => {
    let live = true;
    void rewardedAds.privacyOptionsRequired().then((required) => {
      if (live) setAdPrivacy(required);
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.title}>Bagh-Chal</Text>
        <Text style={styles.subtitle}>Four tigers. Twenty goats. One board.</Text>
      </View>
      <View style={styles.menu}>
        <MenuButton
          label="Pass & Play"
          hint="Two players, one screen"
          onPress={() => router.push('/game')}
        />
        <MenuButton label="Play the AI" hint="Three levels" onPress={() => router.push('/ai')} />
        <MenuButton label="Daily Puzzle" hint="Coming soon" />
        <MenuButton
          label="Online"
          hint="Invite a friend by code"
          onPress={() => router.push('/online')}
        />
        <MenuButton
          label="Store"
          hint="Boards, pieces, Supporter Pass"
          onPress={() => router.push('/store')}
        />
      </View>
      <View style={styles.settings}>
        <Toggle label="Sound" value={settings.sound} onChange={(sound) => update({ sound })} />
        <Toggle
          label="Haptics"
          value={settings.haptics}
          onChange={(haptics) => update({ haptics })}
        />
      </View>
      {adPrivacy && (
        <Pressable
          onPress={() => void rewardedAds.showPrivacyOptions()}
          accessibilityRole="button"
          style={styles.privacy}
        >
          <Text style={styles.privacyText}>Ad privacy choices</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

interface MenuButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress?: () => void;
}

function MenuButton({ label, hint, onPress }: MenuButtonProps) {
  const disabled = !onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
      <Text style={styles.buttonHint}>{hint}</Text>
    </Pressable>
  );
}

interface ToggleProps {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.surface }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: 8 },
  menu: { gap: 12 },
  button: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  buttonHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  settings: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 24,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  privacy: { alignItems: 'center', paddingBottom: 16 },
  privacyText: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
});
