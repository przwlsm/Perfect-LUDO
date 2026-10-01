import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import type { PresenceStatus } from '@/domain';
import { i18n } from '../i18n';
import { ui } from '../theme/themes';

export const PRESENCE_COLOR: Record<PresenceStatus, string> = {
  ONLINE: ui.green,
  AWAY: ui.gold,
  IN_GAME: ui.violet,
  OFFLINE: ui.subtle,
};

/** Translated when called, so it always follows the current language. */
export function presenceLabel(status: PresenceStatus): string {
  return i18n.t(`social:presence.${status}`);
}

export function PresenceDot({ status, size = 9 }: { status: PresenceStatus; size?: number }) {
  const { t } = useTranslation('social');
  return (
    <View
      accessibilityLabel={t(`presence.${status}`)}
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: PRESENCE_COLOR[status],
      }}
    />
  );
}

export function PresenceText({ status }: { status: PresenceStatus }) {
  const { t } = useTranslation('social');
  return (
    <View style={s.row}>
      <PresenceDot status={status} size={7} />
      <Text style={[s.text, { color: PRESENCE_COLOR[status] }]}>{t(`presence.${status}`)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
