import { StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Body, Button, Card, Label, Sheet, shared } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

/** Where a guest goes to become a member; they come back to online play after. */
export const SIGN_UP_HREF = {
  pathname: '/login',
  params: { intent: 'online', mode: 'signUp' },
} as const;
export const LOGIN_HREF = { pathname: '/login', params: { intent: 'online' } } as const;

/**
 * The one explanation every locked feature shares, so a guest always reads
 * the same offer in the same words: what an account adds, and that playing
 * on as a guest is still fine.
 */
export function AccountGateCard({
  feature,
  onContinueAsGuest,
}: {
  /** Named so the copy can say what, exactly, is locked. */
  feature: string;
  onContinueAsGuest(): void;
}) {
  const { theme } = useProfile();
  return (
    <Card style={{ borderColor: `${theme.accent}40` }}>
      <View style={shared.row}>
        <View style={[s.lock, { backgroundColor: `${theme.accent}18` }]}>
          <Text style={{ fontSize: 24 }}>🔒</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Label color={theme.accent}>ACCOUNT FEATURE</Label>
          <Text style={shared.sectionTitle}>Create an account to unlock {feature}</Text>
        </View>
      </View>
      <Body>
        Sign in to save your progress, add friends, view your game history, and more. Everything you
        have played as a guest comes with you.
      </Body>
      <Button onPress={() => router.push(SIGN_UP_HREF)}>Login / Sign Up</Button>
      <Button secondary compact onPress={onContinueAsGuest}>
        Continue as Guest
      </Button>
    </Card>
  );
}

export function AccountGateSheet({
  feature,
  visible,
  onClose,
}: {
  feature: string | null;
  visible: boolean;
  onClose(): void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Unlock with an account">
      <AccountGateCard feature={feature ?? 'this feature'} onContinueAsGuest={onClose} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  lock: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.line,
  },
});
