import { StyleSheet, Text, View } from 'react-native';
import type { PresenceStatus } from '@/domain';
import { ui } from '../theme/themes';

export const PRESENCE_COLOR: Record<PresenceStatus, string> = {
  ONLINE: ui.green,
  AWAY: ui.gold,
  IN_GAME: ui.violet,
  OFFLINE: ui.subtle,
};

const LABEL: Record<PresenceStatus, string> = {
  ONLINE: 'Online',
  AWAY: 'Away',
  IN_GAME: 'In a game',
  OFFLINE: 'Offline',
};

export function presenceLabel(status: PresenceStatus): string {
  return LABEL[status];
}

export function PresenceDot({ status, size = 9 }: { status: PresenceStatus; size?: number }) {
  return (
    <View
      accessibilityLabel={LABEL[status]}
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
  return (
    <View style={s.row}>
      <PresenceDot status={status} size={7} />
      <Text style={[s.text, { color: PRESENCE_COLOR[status] }]}>{LABEL[status]}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
