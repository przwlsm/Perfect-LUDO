import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PresenceStatus } from '@/domain';
import { shared } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';
import { PresenceText } from './PresenceDot';
import { UserAvatar } from './UserAvatar';

/** One player in any list: avatar, name, status, ID, and whatever actions fit. */
export function PlayerRow({
  id,
  name,
  emoji,
  presence,
  publicId,
  subtitle,
  children,
}: {
  id: string;
  name: string;
  emoji: string | null;
  presence?: PresenceStatus;
  /** Shown so a player can confirm they found the right account. */
  publicId?: string | null;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { theme } = useProfile();
  return (
    <View style={[s.row, { backgroundColor: theme.surface }]}>
      <UserAvatar id={id} name={name} emoji={emoji} presence={presence} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={s.meta}>
          {presence ? (
            <PresenceText status={presence} />
          ) : (
            <Text style={shared.small}>{subtitle}</Text>
          )}
          {publicId && (
            <Text style={s.id} accessibilityLabel={`User ID ${publicId}`}>
              ID {publicId}
            </Text>
          )}
        </View>
      </View>
      <View style={s.actions}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: ui.line,
  },
  name: { color: ui.text, fontSize: 15.5, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  id: { color: ui.subtle, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
