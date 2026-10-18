import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CUPS, getCup } from '@/domain';
import { Text } from '../components/AppText';
import { Shine } from '../components/Live';
import { mirrorInRtl } from '../i18n/rtl';
import { ThroneArt } from './ThroneArt';

const GOLD = '#ffd76a';
const INK = '#2b1600';
const KING = getCup('king')!;

/** Twelve rays fanning out from behind the throne, as one path. */
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a0 = ((i * 30 - 4) * Math.PI) / 180;
  const a1 = ((i * 30 + 4) * Math.PI) / 180;
  const r = 260;
  return `M0 0L${(Math.cos(a0) * r).toFixed(1)} ${(Math.sin(a0) * r).toFixed(1)}L${(Math.cos(a1) * r).toFixed(1)} ${(Math.sin(a1) * r).toFixed(1)}Z`;
}).join('');

/** A few fixed stars, so the sky looks the same on every phone. */
const STARS = [
  [18, 14, 1.2],
  [52, 30, 0.9],
  [96, 10, 1.4],
  [140, 26, 0.8],
  [176, 8, 1.1],
  [214, 34, 0.9],
  [30, 52, 0.7],
  [118, 46, 1],
] as const;

/**
 * The night scene behind the card, drawn rather than photographed: a royal
 * sky, a glow and slow rays behind the throne, and the golden Royal Road
 * winding up to a castle on the hill.
 */
export function RoyalRoadScene({ motion }: { motion: boolean }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(spin);
    spin.set(0);
    if (motion)
      spin.set(withRepeat(withTiming(360, { duration: 40000, easing: Easing.linear }), -1));
    return () => cancelAnimation(spin);
  }, [motion, spin]);
  const rays = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#160b3d', '#3a1478', '#6b21a8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[s.rays, rays]}>
        <Svg width={520} height={520} viewBox="-260 -260 520 520">
          <Defs>
            <RadialGradient id="rr-ray" cx="0" cy="0" r="260" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={GOLD} stopOpacity="0.32" />
              <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d={RAYS} fill="url(#rr-ray)" />
        </Svg>
      </Animated.View>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 240 200"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id="rr-glow" cx="190" cy="92" r="90" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#ffe9a8" stopOpacity="0.55" />
            <Stop offset="0.5" stopColor="#f59e0b" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </RadialGradient>
          <SvgGradient id="rr-road" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#ffd76a" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#ffd76a" stopOpacity="0.15" />
          </SvgGradient>
          <SvgGradient id="rr-hill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#24104f" />
            <Stop offset="1" stopColor="#0d0626" />
          </SvgGradient>
        </Defs>
        {STARS.map(([x, y, r]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" opacity={0.7} />
        ))}
        <Rect x="0" y="0" width="240" height="200" fill="url(#rr-glow)" />
        {/* The castle on the far hill, its flags in the players' colours. */}
        <G opacity={0.55} fill="#120830">
          <Path d="M150 128h8v-14h4v-6h4v6h4v14h6v-22h4v-8h4v8h4v22h6v-14h4v-6h4v6h4v14h8v14h-74z" />
        </G>
        <Path d="M164 108v-8l6 3z" fill="#ef4444" opacity={0.8} />
        <Path d="M184 98v-8l6 3z" fill="#10b981" opacity={0.8} />
        <Path d="M204 108v-8l6 3z" fill="#3b82f6" opacity={0.8} />
        <Path d="M0 150Q60 118 120 140T240 128V200H0z" fill="url(#rr-hill)" />
        {/* The Royal Road itself, winding up to the gate. */}
        <Path
          d="M70 200C90 176 150 168 140 156S170 144 186 140L190 141C178 147 156 152 150 160S108 180 104 200Z"
          fill="url(#rr-road)"
        />
        <Path d="M0 176Q80 160 150 184T240 172V200H0z" fill="#0b0520" opacity={0.85} />
      </Svg>
    </View>
  );
}

/**
 * The Royal Road on the online hub: a lit night scene with a throne, what a
 * cup is, and how long it takes. Always drawn in its own dark royal colours,
 * by day and by night, like a poster on the page.
 */
export function RoyalRoadCard({
  gameMinutes,
  cupMinutes,
  measured,
  motion,
  onPress,
}: {
  gameMinutes: number;
  cupMinutes: number;
  /** True when the times are the average of real games, false for our estimate. */
  measured: boolean;
  motion: boolean;
  onPress(): void;
}) {
  const { t } = useTranslation('cups');
  const float = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(float);
    float.set(0);
    if (motion)
      float.set(
        withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    return () => cancelAnimation(float);
  }, [motion, float]);
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * float.get() }] }));
  const game = t('card.gameTime', { minutes: gameMinutes });
  const cup = t('card.cupTime', { minutes: cupMinutes });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('card.a11y')}. ${t('card.mode')}. ${game}. ${cup}.`}
      onPress={onPress}
      android_ripple={{ color: '#ffd76a30' }}
      style={({ pressed }) => [s.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      <RoyalRoadScene motion={motion} />
      <Shine active={motion} every={4200} />
      <View style={s.body}>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={s.label}>
            <Ionicons name="ribbon" size={12} color={GOLD} />
            <Text style={s.labelText}>{t('card.label', { n: CUPS.length })}</Text>
          </View>
          <Text style={s.title}>{t('card.title')}</Text>
          <Text style={s.copy}>{t('card.body')}</Text>
        </View>
        <Animated.View style={[s.throne, lift]}>
          <ThroneArt cup={KING} won size={78} />
        </Animated.View>
      </View>
      <View style={s.chips}>
        <View style={[s.chip, s.chipGold]}>
          <Ionicons name="flash" size={13} color={INK} />
          <Text style={[s.chipText, { color: INK }]}>{t('card.mode')}</Text>
        </View>
        <View style={s.chip}>
          <Ionicons name="time-outline" size={13} color="#fff" />
          <Text style={s.chipText}>{game}</Text>
        </View>
        <View style={s.chip}>
          <Ionicons name="trophy-outline" size={13} color="#fff" />
          <Text style={s.chipText}>{cup}</Text>
        </View>
      </View>
      <View style={s.footer}>
        <Text style={s.source} numberOfLines={2}>
          {measured ? t('card.timeMeasured') : t('card.timeEstimate')}
        </Text>
        <View style={s.cta}>
          <LinearGradient
            colors={['#ffe08a', '#ffc94d', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={s.ctaText}>{t('card.cta')}</Text>
          <Ionicons name="chevron-forward" style={mirrorInRtl} size={16} color={INK} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffd76a55',
    backgroundColor: '#160b3d',
    boxShadow: '0 10px 24px rgba(58, 20, 120, 0.35)',
  },
  rays: { position: 'absolute', right: -170, top: -170, width: 520, height: 520 },
  body: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffd76a66',
    backgroundColor: '#00000033',
  },
  labelText: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: '#00000066',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  copy: { color: '#e9ddff', fontSize: 13, lineHeight: 18 },
  throne: { marginBottom: -4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff1f',
    borderWidth: 1,
    borderColor: '#ffffff2e',
  },
  chipGold: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  source: { flex: 1, color: '#cbb8f5', fontSize: 11 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaText: { color: INK, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
});
