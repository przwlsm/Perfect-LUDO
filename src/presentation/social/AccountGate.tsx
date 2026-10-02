import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Body, Button, Card, Label, Sheet, useShared } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

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
  /** Named so the copy can say what, exactly, is locked; already in the player's language. */
  feature: string;
  onContinueAsGuest(): void;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation('account');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const night = ui.scheme === 'dark';
  return (
    // By day: a white card (the 60%) whose lock sits on a navy tile (the 30%).
    <Card style={{ borderColor: night ? `${theme.accent}40` : ui.line }}>
      <View style={shared.row}>
        <View
          style={[
            s.lock,
            night
              ? { backgroundColor: `${theme.accent}18` }
              : { backgroundColor: ui.navy, borderColor: ui.navy },
          ]}
        >
          <Text style={{ fontSize: 24 }}>🔒</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Label color={theme.accentText}>{t('gate.label')}</Label>
          <Text style={shared.sectionTitle}>{t('gate.title', { feature })}</Text>
        </View>
      </View>
      <Body>{t('gate.body')}</Body>
      <Button onPress={() => router.push(SIGN_UP_HREF)}>{t('gate.cta')}</Button>
      <Button secondary compact onPress={onContinueAsGuest}>
        {t('gate.guest')}
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
  const { t } = useTranslation('account');
  return (
    <Sheet visible={visible} onClose={onClose} title={t('gate.sheetTitle')}>
      <AccountGateCard feature={feature ?? t('gate.thisFeature')} onContinueAsGuest={onClose} />
    </Sheet>
  );
}

const useStyles = makeStyles((ui) => ({
  lock: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.line,
  },
}));
