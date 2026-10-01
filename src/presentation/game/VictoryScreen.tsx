import { useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { levelInfo, type MatchStats } from '@/domain';
import { Text } from '../components/AppText';
import { CoinPill, GemPill } from '../components/Kit';
import { Bob, Shine } from '../components/Live';
import { ProgressBar, RewardChips } from '../components/Progress';
import { UserAvatar } from '../social/UserAvatar';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';
import { numberLocale } from '../i18n/format';
import { forwardArrow } from '../i18n/rtl';

export type VictoryOutcome = 'win' | 'loss' | 'abandoned';

export interface Standing {
  /** Stable key, e.g. the colour. */
  readonly key: string;
  readonly name: string;
  /** The seat's board colour. */
  readonly color: string;
  readonly you: boolean;
  readonly coinsHome: number;
  /** Online players have an account avatar. */
  readonly userId?: string;
  readonly avatar?: string | null;
}

/**
 * The full-screen match result: a banner, the podium, what the match paid
 * (with the level bar moving), how the player played, and what to do next.
 * Shared by solo and online tables.
 */
export function VictoryScreen({
  visible,
  outcome,
  banner,
  subtitle,
  standings,
  reward,
  note,
  stats,
  durationMs,
  goal,
  primary,
  secondary,
  shareMessage,
  error,
  motionEnabled,
}: {
  visible: boolean;
  outcome: VictoryOutcome;
  /** e.g. "VICTORY!", "YOUR TEAM WINS", "GOOD GAME". */
  banner: string;
  /** Smaller line under the banner: mode, how it was won. */
  subtitle: string;
  /** Best first. */
  standings: readonly Standing[];
  reward: { coins: number; xp: number } | null;
  note?: string;
  stats: MatchStats | null;
  durationMs: number | null;
  /** Coins needed home in this game, for "3/4 home". */
  goal: number;
  primary: { label: string; busy?: boolean; onPress(): void };
  secondary: { label: string; onPress(): void };
  shareMessage?: string;
  error?: string | null;
  motionEnabled: boolean;
}) {
  const { profile, member } = useProfile();
  const { t } = useTranslation('game');
  const insets = useSafeAreaInsets();
  const before = levelInfo(profile.xp);
  const after = reward ? levelInfo(profile.xp + reward.xp) : before;
  const levelUp = reward !== null && after.level > before.level;
  const win = outcome === 'win';
  const motion = motionEnabled && visible;
  const rise = (delay: number) => (motion ? FadeInUp.delay(delay).duration(380) : undefined);
  const podium = standings.slice(0, 3);
  // Podium order on screen: 2nd, 1st, 3rd.
  const columns = [podium[1], podium[0], podium[2]];

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent>
      <LinearGradient
        colors={win ? ['#2a1d05', '#0e1322', '#0e1322'] : ['#161b2c', '#0e1322', '#0e1322']}
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {win && motion && <Confetti />}
        <View style={s.topBar}>
          <Text style={s.topTitle}>{t('victory.title')}</Text>
          <View style={s.pills}>
            <GemPill />
            <CoinPill />
          </View>
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.completed}>
            <Ionicons name="star" size={12} color={ui.gold} />
            <Text style={s.completedText}>
              {outcome === 'abandoned' ? t('victory.ended') : t('victory.completed')}
            </Text>
            <Ionicons name="star" size={12} color={ui.gold} />
          </View>

          <Animated.View entering={motion ? ZoomIn.springify().damping(12) : undefined}>
            <LinearGradient
              colors={win ? ['#fde68a', '#f59e0b', '#d97706'] : ['#475569', '#334155']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.banner}
            >
              <Shine active={motion && win} width={420} every={2200} />
              <Ionicons
                name={win ? 'trophy' : outcome === 'abandoned' ? 'exit' : 'ribbon'}
                size={30}
                color={win ? '#3b2400' : '#e2e8f0'}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[s.bannerText, { color: win ? '#3b2400' : '#f1f5f9' }]}
              >
                {banner}
              </Text>
            </LinearGradient>
          </Animated.View>
          <Text style={[s.subtitle, { color: win ? ui.gold : ui.muted }]}>{subtitle}</Text>

          {podium.length > 0 && (
            <Animated.View entering={rise(150)} style={s.podium}>
              {columns.map((entry, i) =>
                entry ? (
                  <PodiumColumn
                    key={entry.key}
                    entry={entry}
                    place={i === 1 ? 1 : i === 0 ? 2 : 3}
                    reward={entry.you ? reward : null}
                    goal={goal}
                    motion={motion}
                  />
                ) : (
                  <View key={`empty-${i}`} style={{ flex: 1 }} />
                ),
              )}
            </Animated.View>
          )}

          {reward && member ? (
            <Animated.View entering={rise(300)} style={s.card}>
              <View style={s.rowBetween}>
                <View style={[s.row, { gap: 8 }]}>
                  <Ionicons name="gift" size={20} color={ui.gold} />
                  <Text style={s.cardTitle}>{t('victory.rewards')}</Text>
                </View>
                <RewardChips coins={reward.coins} xp={reward.xp} />
              </View>
              <View style={s.levelBox}>
                <View style={s.rowBetween}>
                  <Text style={s.levelText}>
                    {t('victory.level', { level: before.level })}
                    {levelUp ? (
                      <Text style={{ color: ui.gold }}>
                        {`  ${forwardArrow}  ${t('victory.level', { level: after.level })}`}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={[s.levelText, { color: ui.green }]}>+{reward.xp} XP</Text>
                </View>
                <ProgressBar
                  value={after.into / after.need}
                  height={10}
                  colors={levelUp ? [ui.gold, '#f59e0b'] : [ui.green, ui.blue]}
                />
                <View style={s.rowBetween}>
                  <Text style={s.small}>
                    {after.into} / {after.need} XP
                  </Text>
                  <Text style={[s.small, { color: levelUp ? ui.gold : ui.green }]}>
                    {levelUp
                      ? t('victory.levelUp')
                      : t('victory.toNext', {
                          percent: Math.round((after.into / after.need) * 100),
                        })}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : note ? (
            <Animated.View entering={rise(300)} style={s.card}>
              <Text style={[s.small, { textAlign: 'center', fontSize: 13 }]}>{note}</Text>
            </Animated.View>
          ) : null}

          {stats && (
            <Animated.View entering={rise(420)} style={{ gap: 10 }}>
              <View style={s.rowBetween}>
                <Text style={s.section}>{t('victory.performance')}</Text>
                {durationMs !== null && (
                  <View style={[s.row, { gap: 4 }]}>
                    <Ionicons name="time-outline" size={14} color={ui.muted} />
                    <Text style={s.small}>{formatDuration(durationMs, t)}</Text>
                  </View>
                )}
              </View>
              <View style={s.statsGrid}>
                <StatTile
                  icon="dice"
                  label={t('victory.sixes')}
                  value={stats.sixes}
                  color={ui.gold}
                />
                <StatTile
                  icon="flash"
                  label={t('victory.captured')}
                  value={stats.captures}
                  color="#f87171"
                />
                <StatTile
                  icon="home"
                  label={t('victory.home')}
                  value={stats.home}
                  color={ui.green}
                />
              </View>
            </Animated.View>
          )}
          {error ? <Text style={s.error}>{error}</Text> : null}
        </ScrollView>

        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={primary.busy}
            onPress={primary.onPress}
            style={({ pressed }) => [
              s.primary,
              { opacity: primary.busy ? 0.6 : pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient
              colors={['#ffd48a', '#ffb95f', '#f59e0b']}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="refresh" size={20} color="#3b2400" />
            <Text style={s.primaryText}>
              {primary.busy ? t('victory.saving') : primary.label.toUpperCase()}
            </Text>
          </Pressable>
          <View style={[s.row, { gap: 10 }]}>
            <Pressable
              accessibilityRole="button"
              disabled={primary.busy}
              onPress={secondary.onPress}
              style={s.secondary}
            >
              <Ionicons name="home" size={18} color={ui.text} />
              <Text style={s.secondaryText}>{secondary.label}</Text>
            </Pressable>
            {shareMessage && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void Share.share({ message: shareMessage }).catch(() => undefined)}
                style={s.secondary}
              >
                <Ionicons name="share-social" size={18} color={ui.blueSoft} />
                <Text style={[s.secondaryText, { color: ui.blueSoft }]}>{t('victory.share')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
}

/** Text: game:victory.place.<id>. */
const PLACE = {
  1: { id: 'winner', tint: ui.gold, size: 84 },
  2: { id: 'silver', tint: '#cbd5e1', size: 62 },
  3: { id: 'bronze', tint: '#d97706', size: 62 },
} as const;

function PodiumColumn({
  entry,
  place,
  reward,
  goal,
  motion,
}: {
  entry: Standing;
  place: 1 | 2 | 3;
  reward: { coins: number; xp: number } | null;
  goal: number;
  motion: boolean;
}) {
  const { t } = useTranslation('game');
  const style = PLACE[place];
  const avatar = entry.userId ? (
    <UserAvatar
      id={entry.userId}
      name={entry.name}
      emoji={entry.avatar ?? null}
      size={style.size}
    />
  ) : (
    <View
      style={{
        width: style.size,
        height: style.size,
        borderRadius: style.size / 2,
        backgroundColor: entry.color,
        borderWidth: 3,
        borderColor: '#ffffffcc',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: style.size * 0.4 }}>
        {entry.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6, marginTop: place === 1 ? 0 : 34 }}>
      {place === 1 && (
        <Bob active={motion} distance={4}>
          <Text style={{ fontSize: 26, marginBottom: -8 }}>👑</Text>
        </Bob>
      )}
      <View
        style={[s.avatarRing, { borderColor: style.tint, boxShadow: `0 0 18px ${style.tint}55` }]}
      >
        {avatar}
        <View style={[s.placeBadge, { backgroundColor: style.tint }]}>
          <Text style={s.placeText}>{place}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={[s.podiumName, entry.you && { color: ui.gold }]}>
        {entry.you ? t('victory.you', { name: entry.name }) : entry.name}
      </Text>
      <Text style={[s.placeLabel, { color: style.tint }]}>{t(`victory.place.${style.id}`)}</Text>
      <View
        style={[
          s.podiumBox,
          place === 1 && { minHeight: 74, backgroundColor: '#3a2a0c', borderColor: `${ui.gold}55` },
        ]}
      >
        {reward ? (
          <>
            <Text style={s.rewardCoins}>+{reward.coins.toLocaleString(numberLocale())} 🪙</Text>
            <Text style={s.rewardXp}>+{reward.xp} XP</Text>
          </>
        ) : (
          <Text style={s.homeText}>{t('victory.homeCount', { home: entry.coinsHome, goal })}</Text>
        )}
      </View>
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const CONFETTI_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#c084fc', '#ffb95f'];

/** A light shower of confetti for a win: a handful of falling, turning bits. */
function Confetti() {
  const { width, height } = useWindowDimensions();
  const bits = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: ((i * 37) % 100) / 100,
        delay: (i * 173) % 2400,
        duration: 2600 + ((i * 91) % 1800),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        size: 6 + (i % 4) * 2,
      })),
    [],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((bit, i) => (
        <ConfettiBit key={i} {...bit} width={width} height={height} />
      ))}
    </View>
  );
}

function ConfettiBit({
  x,
  delay,
  duration,
  color,
  size,
  width,
  height,
}: {
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  width: number;
  height: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1));
  }, [delay, duration, t]);
  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + t.value * (height + 80) },
      { translateX: Math.sin(t.value * 6.28 * 2) * 18 },
      { rotate: `${t.value * 720}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x * width,
          top: 0,
          width: size,
          height: size * 1.6,
          borderRadius: 2,
          backgroundColor: color,
          opacity: 0.85,
        },
        anim,
      ]}
    />
  );
}

function formatDuration(ms: number, t: TFunction<'game'>): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m > 0
    ? t('victory.minutesSeconds', { minutes: m, seconds: sec })
    : t('victory.seconds', { seconds: sec });
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topTitle: { color: ui.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  pills: { flexDirection: 'row', gap: 6 },
  content: { padding: 16, paddingBottom: 24, gap: 16 },
  completed: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff10',
  },
  completedText: { color: ui.text, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    overflow: 'hidden',
    borderBottomWidth: 5,
    borderBottomColor: '#00000040',
  },
  bannerText: { fontSize: 38, fontWeight: '900', letterSpacing: 1, flexShrink: 1 },
  subtitle: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: -6,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 24,
    backgroundColor: '#161c2d',
    borderWidth: 1,
    borderColor: ui.line,
  },
  avatarRing: { borderWidth: 3, borderRadius: 999, padding: 3 },
  placeBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0e1322',
  },
  placeText: { color: '#1f1500', fontWeight: '900', fontSize: 12 },
  podiumName: { color: ui.text, fontWeight: '800', fontSize: 14, marginTop: 6, maxWidth: '100%' },
  placeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  podiumBox: {
    alignSelf: 'stretch',
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff08',
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  rewardCoins: { color: ui.gold, fontWeight: '900', fontSize: 16 },
  rewardXp: { color: ui.green, fontWeight: '800', fontSize: 13 },
  homeText: { color: ui.muted, fontWeight: '800', fontSize: 13 },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#161c2d',
    borderWidth: 1,
    borderColor: ui.line,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { color: ui.text, fontSize: 18, fontWeight: '900' },
  levelBox: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: '#0a0f1c' },
  levelText: { color: ui.text, fontWeight: '800', fontSize: 14 },
  small: { color: ui.muted, fontSize: 12, fontWeight: '700' },
  section: { color: ui.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1.6 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#161c2d',
    borderWidth: 1,
    borderColor: ui.line,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: ui.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: ui.subtle, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  error: { color: ui.danger, textAlign: 'center' },
  actions: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 },
  primary: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderBottomWidth: 4,
    borderBottomColor: '#b45309',
  },
  primaryText: { color: '#3b2400', fontWeight: '900', fontSize: 17, letterSpacing: 1.2 },
  secondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#232d4b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { color: ui.text, fontWeight: '800', fontSize: 14 },
});
