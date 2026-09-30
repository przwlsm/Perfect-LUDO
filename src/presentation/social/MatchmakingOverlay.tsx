import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VARIANT_INFO, tablePrize, type GameVariant } from '@/domain';
import { Text } from '../components/AppText';
import { LiveDot, Shine } from '../components/Live';
import { UserAvatar } from './UserAvatar';
import { ui } from '../theme/themes';

/** Faces the opponent slots flick through while the search runs. */
const ROLL_FACES = [
  '🦊',
  '🐯',
  '🐼',
  '🦁',
  '🐸',
  '🐵',
  '🐨',
  '🐙',
  '🦄',
  '🐲',
  '🐺',
  '🐻',
  '🐧',
  '🦉',
];
const SLOT_COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

/**
 * The quick-play search as a head-to-head arena: your card is fixed on one
 * side, and each open seat keeps rolling through faces until the server
 * seats a table. A running timer and the queue size show it is working.
 */
export function MatchmakingOverlay({
  visible,
  matched,
  seats,
  variant,
  teams = false,
  stake,
  waiting,
  you,
  error,
  motionEnabled,
  onCancel,
}: {
  visible: boolean;
  matched: boolean;
  seats: number;
  variant: GameVariant;
  /** 2 v 2 search: the second slot is your partner-to-be. */
  teams?: boolean;
  stake: number;
  /** Others in the same queue, from the server's ticket. */
  waiting: number | null;
  you: { id: string; name: string; avatar: string | null };
  error: string | null;
  motionEnabled: boolean;
  onCancel(): void;
}) {
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(0);
  const motion = motionEnabled && visible;

  useEffect(() => {
    if (!visible || matched) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the count for each search
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [visible, matched]);

  const opponents = Math.max(1, seats - 1);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <LinearGradient
        colors={['#1b2340', '#131a2e', '#0e1322']}
        style={[s.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
      >
        <View style={s.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel search"
            onPress={onCancel}
            style={s.back}
          >
            <Ionicons name="close" size={22} color={ui.text} />
          </Pressable>
          <View style={s.banner}>
            <LiveDot color={ui.green} active={motion} />
            <Text style={s.bannerText}>
              {matched
                ? 'LET’S PLAY!'
                : teams
                  ? 'FINDING YOUR TEAM'
                  : seats > 2
                    ? 'FINDING YOUR RIVALS'
                    : 'FINDING YOUR RIVAL'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={s.tableInfo}>
          <Text style={s.table}>
            {VARIANT_INFO[variant].title} · {teams ? '2 v 2 teams' : `${seats} players`}
          </Text>
          <Text style={s.stake}>
            {stake > 0
              ? `Entry ${stake.toLocaleString()}  ·  Win ${tablePrize(stake, seats).toLocaleString()}`
              : 'Free entry'}
          </Text>
        </View>

        <View style={s.arena}>
          {/* 2 v 2: you and your partner-to-be against two rivals. */}
          <View style={[s.opponents, teams && { gap: 10 }]}>
            <PlayerCard label={you.name} tint={'#ef4444'} compact={opponents > 1}>
              <UserAvatar
                id={you.id}
                name={you.name}
                emoji={you.avatar}
                size={opponents > 1 ? 64 : 92}
              />
            </PlayerCard>
            {teams && (
              <PlayerCard label={matched ? 'Partner!' : 'Partner?'} tint={SLOT_COLORS[1]!} compact>
                <RollingFace rolling={!matched && motion} offset={3} size={64} found={matched} />
              </PlayerCard>
            )}
          </View>
          <VsBadge active={motion} />
          <View style={[s.opponents, opponents > 1 && { gap: 10 }]}>
            {Array.from({ length: teams ? 2 : opponents }, (_, i) => (
              <PlayerCard
                key={i}
                label={matched ? 'Found!' : '?????'}
                tint={teams ? SLOT_COLORS[i === 0 ? 0 : 2]! : SLOT_COLORS[i % SLOT_COLORS.length]!}
                compact={opponents > 1}
              >
                <RollingFace
                  rolling={!matched && motion}
                  offset={i * 5 + 7}
                  size={opponents > 1 ? 64 : 92}
                  found={matched}
                />
              </PlayerCard>
            ))}
          </View>
        </View>

        <View style={s.timer}>
          <Ionicons name="stopwatch" size={18} color={ui.green} />
          <Text style={s.timerText}>{clock}</Text>
        </View>
        <Text style={s.waiting}>
          {matched
            ? 'All seats filled — taking you to the table…'
            : `${waiting ?? 1} ${waiting === 1 ? 'player' : 'players'} in this queue`}
        </Text>

        <View style={s.searchWrap}>
          <LinearGradient colors={['#4d8eff', '#2f62d8']} style={s.search}>
            <Shine active={motion && !matched} width={300} every={900} />
            <Text style={s.searchText}>{matched ? 'Match found!' : 'Searching for players…'}</Text>
          </LinearGradient>
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        <Text style={s.hint}>Keep this screen open — leaving cancels your search.</Text>
      </LinearGradient>
    </Modal>
  );
}

function PlayerCard({
  label,
  tint,
  compact = false,
  children,
}: {
  label: string;
  tint: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', gap: compact ? 4 : 8 }}>
      <View
        style={[
          s.frame,
          { borderColor: tint, boxShadow: `0 0 14px ${tint}44` },
          compact && s.frameSmall,
        ]}
      >
        {children}
      </View>
      <View style={[s.nameTag, { borderColor: tint }]}>
        <Text numberOfLines={1} style={[s.name, compact && { fontSize: 11 }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Flicks through faces like a slot reel until a table is found. */
function RollingFace({
  rolling,
  offset,
  size,
  found,
}: {
  rolling: boolean;
  offset: number;
  size: number;
  found: boolean;
}) {
  const [face, setFace] = useState(offset % ROLL_FACES.length);
  const bump = useSharedValue(0);
  useEffect(() => {
    if (!rolling) return;
    const timer = setInterval(() => {
      setFace((f) => (f + 1) % ROLL_FACES.length);
      bump.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 60 }));
    }, 110);
    return () => clearInterval(timer);
  }, [rolling, bump]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: bump.value * -6 }, { scale: 1 - bump.value * 0.06 }],
  }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {found ? (
        <Animated.View entering={ZoomIn.springify()}>
          <Ionicons name="checkmark-circle" size={size * 0.7} color={ui.green} />
        </Animated.View>
      ) : (
        <Animated.Text style={[{ fontSize: size * 0.62 }, anim]}>{ROLL_FACES[face]}</Animated.Text>
      )}
    </View>
  );
}

function VsBadge({ active }: { active: boolean }) {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(spin);
    cancelAnimation(pulse);
    if (active) {
      spin.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1);
      pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    }
    return () => {
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [active, spin, pulse]);
  const rays = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.08 }] }));
  return (
    <View style={s.vsWrap}>
      <Animated.View style={[s.rays, rays]}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={[s.ray, { transform: [{ rotate: `${i * 30}deg` }] }]} />
        ))}
      </Animated.View>
      <Animated.View style={badge}>
        <LinearGradient colors={['#ffd9a1', '#ffb95f']} style={s.vs}>
          <Text style={s.vsText}>VS</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: ui.surfaceHigh,
    borderWidth: 1,
    borderColor: ui.line,
  },
  bannerText: { color: ui.text, fontWeight: '900', fontSize: 14, letterSpacing: 1.6 },
  tableInfo: { alignItems: 'center', gap: 2 },
  table: { color: ui.muted, fontWeight: '700', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  stake: { color: ui.gold, fontWeight: '800', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  arena: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  opponents: { alignItems: 'center', justifyContent: 'center' },
  frame: {
    padding: 8,
    borderRadius: 18,
    borderWidth: 4,
    backgroundColor: '#ffffff0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameSmall: { padding: 4, borderRadius: 14, borderWidth: 3 },
  nameTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: ui.surfaceHigh,
    maxWidth: 130,
  },
  name: { color: ui.text, fontWeight: '800', fontSize: 13 },
  vsWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  rays: {
    position: 'absolute',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 3,
    height: 90,
    borderRadius: 2,
    backgroundColor: '#ffb95f38',
  },
  vs: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0e1322',
  },
  vsText: { color: '#4a3010', fontWeight: '900', fontSize: 22 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: ui.surfaceHigh,
    borderWidth: 1,
    borderColor: ui.line,
  },
  timerText: {
    color: ui.text,
    fontWeight: '900',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  waiting: { color: ui.green, fontWeight: '700', fontSize: 13, lineHeight: 18 },
  searchWrap: { alignSelf: 'stretch', paddingHorizontal: 20 },
  search: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${ui.blueSoft}55`,
  },
  searchText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.4 },
  error: { color: ui.danger, textAlign: 'center', lineHeight: 18 },
  hint: {
    color: ui.subtle,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 24,
  },
});
