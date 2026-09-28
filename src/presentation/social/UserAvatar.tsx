import { StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { initialsOf, type PresenceStatus } from '@/domain';
import { useProfile } from '../state/ProfileProvider';
import { PresenceDot } from './PresenceDot';

/** Stable per player, so the same friend keeps the same colour everywhere. */
function paletteIndex(seed: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100_000;
  return hash % size;
}

export function UserAvatar({
  id,
  name,
  emoji,
  presence,
  size = 46,
}: {
  id: string;
  name: string;
  emoji?: string | null;
  presence?: PresenceStatus;
  size?: number;
}) {
  const { theme } = useProfile();
  const palette = Object.values(theme.colors);
  const tint = palette[paletteIndex(id, palette.length)]!;
  return (
    <View>
      <View
        style={[
          s.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 3.2,
            backgroundColor: `${tint}22`,
            borderColor: `${tint}66`,
          },
        ]}
      >
        <Text style={[s.text, { color: tint, fontSize: emoji ? size * 0.46 : size * 0.34 }]}>
          {emoji || initialsOf(name)}
        </Text>
      </View>
      {presence && (
        <View style={[s.badge, { borderColor: theme.surface }]}>
          <PresenceDot status={presence} size={8} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  text: { fontWeight: '900' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    padding: 2,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#0e1322',
  },
});
