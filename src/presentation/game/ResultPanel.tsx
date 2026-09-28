import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { levelInfo, type MatchStats } from '@/domain';
import { Text } from '../components/AppText';
import { ProgressBar, RewardChips } from '../components/Progress';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

export type ResultOutcome = 'win' | 'loss' | 'abandoned';

/**
 * The end-of-match card shared by solo and online tables: a medallion, the
 * headline, what the player did this match, and what it paid — including
 * the XP bar and a level-up badge when the reward crosses a level.
 */
export function ResultPanel({
  outcome,
  headline,
  accent,
  subline,
  stats,
  reward,
  note,
  motionEnabled,
  children,
}: {
  outcome: ResultOutcome;
  headline: string;
  /** The winner's colour, used for the medallion and headline. */
  accent: string;
  subline: string;
  stats: MatchStats | null;
  /** What this result pays the signed-in member; null when nothing is paid. */
  reward: { coins: number; xp: number } | null;
  /** Shown instead of the reward, e.g. the sign-in offer for guests. */
  note?: string;
  motionEnabled: boolean;
  children?: ReactNode;
}) {
  const { profile, member } = useProfile();
  const before = levelInfo(profile.xp);
  const after = reward ? levelInfo(profile.xp + reward.xp) : before;
  const levelUp = reward !== null && after.level > before.level;
  const zoom = motionEnabled ? ZoomIn.springify().damping(12) : undefined;
  const rise = (delay: number) =>
    motionEnabled ? FadeInDown.delay(delay).duration(320) : undefined;
  const medal =
    outcome === 'win'
      ? (['#fde68a', '#f59e0b'] as const)
      : outcome === 'abandoned'
        ? (['#475569', '#1e293b'] as const)
        : ([accent, '#1a1f2f'] as const);

  return (
    <View style={s.wrap}>
      <Animated.View entering={zoom} style={s.medalWrap}>
        <View style={[s.halo, { backgroundColor: outcome === 'win' ? ui.gold : accent }]} />
        <LinearGradient colors={medal} style={s.medal}>
          <Ionicons
            name={outcome === 'win' ? 'trophy' : outcome === 'abandoned' ? 'exit' : 'ribbon'}
            size={46}
            color={outcome === 'win' ? '#472a00' : '#fff'}
          />
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={rise(120)} style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[s.kicker, { color: outcome === 'win' ? ui.gold : ui.subtle }]}>
          {outcome === 'win' ? 'VICTORY' : outcome === 'abandoned' ? 'MATCH ENDED' : 'GOOD GAME'}
        </Text>
        <Text style={[s.headline, { color: outcome === 'abandoned' ? ui.text : accent }]}>
          {headline}
        </Text>
        <Text style={s.subline}>{subline}</Text>
      </Animated.View>

      {children}

      {stats && (
        <Animated.View entering={rise(220)} style={s.stats}>
          <Stat icon="dice" label="Sixes" value={stats.sixes} />
          <Stat icon="flash" label="Captures" value={stats.captures} />
          <Stat icon="home" label="Home" value={stats.home} />
        </Animated.View>
      )}

      {reward && member ? (
        <Animated.View entering={rise(320)} style={s.rewardCard}>
          <View style={s.rewardRow}>
            <Text style={s.rewardLabel}>REWARDS</Text>
            <RewardChips coins={reward.coins} xp={reward.xp} />
          </View>
          <View style={{ gap: 6 }}>
            <View style={s.rewardRow}>
              <Text style={s.levelText}>Level {after.level}</Text>
              {levelUp ? (
                <View style={s.levelUp}>
                  <Ionicons name="arrow-up-circle" size={14} color="#1f1500" />
                  <Text style={s.levelUpText}>LEVEL UP!</Text>
                </View>
              ) : (
                <Text style={s.xpText}>
                  {after.into}/{after.need} XP
                </Text>
              )}
            </View>
            <ProgressBar
              value={after.into / after.need}
              colors={levelUp ? [ui.gold, '#f59e0b'] : [ui.blueSoft, ui.blue]}
            />
          </View>
        </Animated.View>
      ) : note ? (
        <Text style={[s.subline, { fontSize: 13 }]}>{note}</Text>
      ) : null}
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: 'dice' | 'flash' | 'home';
  label: string;
  value: number;
}) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={18} color={ui.blueSoft} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'stretch', gap: 16 },
  // Room above and below for the halo, which is wider than the medal.
  medalWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 12,
  },
  halo: { position: 'absolute', width: 132, height: 132, borderRadius: 66, opacity: 0.16 },
  medal: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff40',
    boxShadow: '0 10px 30px #00000070',
  },
  kicker: { fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  headline: { fontSize: 34, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  subline: { color: ui.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: ui.surfaceLow,
    borderWidth: 1,
    borderColor: ui.line,
  },
  statValue: { color: ui.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: ui.subtle, fontSize: 11, fontWeight: '700' },
  rewardCard: {
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#0a0f1c',
    borderWidth: 1,
    borderColor: `${ui.gold}35`,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rewardLabel: { color: ui.subtle, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  levelText: { color: ui.text, fontSize: 15, fontWeight: '800' },
  xpText: { color: ui.muted, fontSize: 12, fontWeight: '700' },
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: ui.gold,
  },
  levelUpText: { color: '#1f1500', fontSize: 11, fontWeight: '900' },
});
