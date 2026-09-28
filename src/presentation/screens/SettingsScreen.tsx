import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import { profileService } from '@/config/container';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';
export default function SettingsScreen() {
  const { profile, theme, perform, ready } = useProfile();
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function update(settings: Parameters<typeof profileService.update>[0]) {
    setBusy(true);
    setMessage(null);
    try {
      await perform(() => profileService.update(settings));
      setMessage('Preferences saved.');
    } catch {
      setMessage('Could not save preferences. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Just how you like it." subtitle="YOUR PREFERENCES">
      <Card>
        <Label color={theme.accent}>AT THE TABLE</Label>
        <Text style={shared.sectionTitle}>What should we call you?</Text>
        <TextInput
          accessibilityLabel="Player name"
          value={name ?? profile.name}
          onChangeText={setName}
          maxLength={20}
          autoCorrect={false}
          placeholder="Your name"
          placeholderTextColor={ui.subtle}
          style={{
            color: ui.text,
            backgroundColor: theme.background,
            padding: 15,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#ffffff20',
            fontSize: 16,
          }}
        />
        <Button
          compact
          disabled={!ready || busy || name === null}
          onPress={() => void update({ name: name ?? profile.name })}
        >
          Save name
        </Button>
      </Card>
      <Card>
        <Label color={theme.accent}>LOOK & FEEL</Label>
        {(
          [
            [
              'board3d',
              'Play in 3D',
              'A dimensional board with sculpted pieces. Switch views during any match.',
            ],
            [
              'reducedMotion',
              'Reduced motion',
              'Keep coins and dice still, with clear outlines for playable pieces.',
            ],
            [
              'soundEnabled',
              'Game sounds',
              'Soft dice rolls, wooden taps, captures, and homecoming chimes.',
            ],
          ] as const
        ).map(([key, title, hint]) => (
          <View key={key} style={[shared.between, { paddingVertical: 8 }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[shared.sectionTitle, { fontSize: 16 }]}>{title}</Text>
              <Text style={shared.small}>{hint}</Text>
            </View>
            <Switch
              accessibilityLabel={title}
              value={profile[key]}
              disabled={!ready || busy}
              onValueChange={(value) => void update({ [key]: value })}
              trackColor={{ false: '#374158', true: theme.accent }}
              thumbColor="#ffffff"
            />
          </View>
        ))}
      </Card>
      {message && (
        <Text accessibilityLiveRegion="polite" style={shared.small}>
          {message}
        </Text>
      )}
      <Card>
        <Label color={theme.accent}>ABOUT THE CLUB</Label>
        <Text style={shared.sectionTitle}>Good times, wherever you are.</Text>
        <Body>
          Ludo Club works offline. Matches and settings are stored on this device; coins and your
          collection are kept on your account when you sign in.
        </Body>
        <Body>
          Daily gifts reset at midnight UTC. Coins cannot be purchased, transferred, or redeemed for
          money.
        </Body>
        <Text style={shared.small}>Ludo Club · 1.0.0</Text>
        <Button secondary compact onPress={() => router.push('/feedback')}>
          Send feedback or report a bug
        </Button>
      </Card>
    </Screen>
  );
}
