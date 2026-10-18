import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CUPS } from '@/domain';
import { Text } from '../components/AppText';
import { Shine } from '../components/Live';
import { ThroneArt } from './ThroneArt';

const GOLD = '#ffd76a';

/**
 * The card's own light: a royal gradient with a soft gold glow from above.
 * Nothing in it is tied to the card's shape, so it fits any size; the
 * arches and floors belong to the thrones themselves (Niche, Stage).
 */
function HallBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#2a1150', '#170a33', '#0b0620']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id="hall-crown" cx="50" cy="0" r="70" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={GOLD} stopOpacity="0.28" />
            <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#hall-crown)" />
      </Svg>
    </View>
  );
}

/** The arched alcove behind one throne, sized to its slot; it glows once the throne is won. */
function Niche({ lit, color }: { lit: boolean; color: string }) {
  return (
    <Svg width={70} height={86} viewBox="0 0 70 86" style={s.niche}>
      <Defs>
        <SvgGradient id={`niche-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lit ? color : '#ffffff'} stopOpacity={lit ? 0.28 : 0.05} />
          <Stop offset="1" stopColor={lit ? color : '#ffffff'} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path
        d="M3 86 V34 Q3 3 35 3 Q67 3 67 34 V86"
        fill={`url(#niche-${color})`}
        stroke={lit ? GOLD : '#ffffff'}
        strokeOpacity={lit ? 0.45 : 0.12}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

/**
 * Every throne on the Royal Road in one card: lit on its pedestal once won,
 * a dim silhouette until then, with how many times each was won.
 */
export function ThroneHallCard({
  wonCount,
  motion,
}: {
  wonCount: (cupId: string) => number;
  motion: boolean;
}) {
  const { t } = useTranslation('collection');
  const won = CUPS.filter((c) => wonCount(c.id) > 0).length;
  return (
    <View style={s.card}>
      <HallBackdrop />
      <Shine active={motion && won > 0} every={5200} strength={0.12} />
      <View style={s.header}>
        <View style={s.label}>
          <Ionicons name="sparkles" size={12} color={GOLD} />
          <Text style={s.labelText}>{t('thrones.label')}</Text>
        </View>
        <Text style={s.count}>{t('thrones.progress', { won, total: CUPS.length })}</Text>
      </View>
      <Text style={s.title}>{t('thrones.title')}</Text>
      <Text style={s.body}>{t('thrones.body')}</Text>
      <View style={s.bar}>
        <LinearGradient
          colors={['#ffe08a', '#f59e0b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.barFill, { width: `${(won / CUPS.length) * 100}%` }]}
        />
      </View>
      {[CUPS.slice(0, 4), CUPS.slice(4)].map((row, r) => (
        <View key={r} style={s.stage}>
          {/* The floor this row of thrones stands on. */}
          <LinearGradient
            pointerEvents="none"
            colors={[`${GOLD}26`, '#00000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={s.floor}
          />
          {row.map((cup) => {
            const count = wonCount(cup.id);
            const lit = count > 0;
            return (
              <View
                key={cup.id}
                accessible
                accessibilityLabel={`${t(`throneNames.${cup.id}`)}. ${
                  lit ? t('thrones.won', { count }) : t('thrones.locked')
                }`}
                style={s.slot}
              >
                <Niche lit={lit} color={cup.throne.gem ?? cup.throne.light} />
                <View style={s.art}>
                  <ThroneArt cup={cup} won={lit} size={58} shine={motion && lit} />
                </View>
                {/* The pedestal: gold-rimmed once the throne is won. */}
                <Svg width={64} height={12} viewBox="0 0 64 12" style={{ marginTop: -6 }}>
                  <Ellipse
                    cx="32"
                    cy="6"
                    rx="30"
                    ry="5"
                    fill={lit ? '#3a2410' : '#1d1530'}
                    stroke={lit ? GOLD : '#ffffff22'}
                    strokeWidth="1.2"
                  />
                </Svg>
                <Text style={[s.name, !lit && s.dim]} numberOfLines={2}>
                  {t(`throneNames.${cup.id}`)}
                </Text>
                {lit ? (
                  <View style={s.wonChip}>
                    <Text style={s.wonText}>×{count}</Text>
                  </View>
                ) : (
                  <Ionicons name="lock-closed" size={11} color="#ffffff55" />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: `${GOLD}66`,
    backgroundColor: '#0b0620',
    boxShadow: '0 10px 26px rgba(58, 20, 120, 0.4)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${GOLD}66`,
    backgroundColor: '#00000040',
  },
  labelText: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  count: { color: GOLD, fontSize: 13, fontWeight: '900' },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: '#00000088',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  body: { color: '#e2d6ff', fontSize: 13, lineHeight: 18 },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff1a',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: '100%', borderRadius: 3 },
  /** One row of four thrones on its own lit floor. */
  stage: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 10,
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#00000033',
    borderWidth: 1,
    borderColor: '#ffffff12',
  },
  /** Starts at the pedestals: 6 of padding plus the 76 of throne art. */
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 79,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: `${GOLD}40`,
  },
  slot: { width: '25%', alignItems: 'center', gap: 3 },
  niche: { position: 'absolute', top: 0 },
  art: { height: 76, justifyContent: 'flex-end' },
  name: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 2,
    minHeight: 26,
  },
  dim: { color: '#ffffff77' },
  wonChip: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  wonText: { color: '#2b1600', fontSize: 10, fontWeight: '900' },
});
