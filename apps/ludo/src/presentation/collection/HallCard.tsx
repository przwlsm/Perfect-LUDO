import { StyleSheet, View } from 'react-native';
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
import { CUPS, type CupDef, type CupHall, type getCup } from '@/domain';
import { Text } from '../components/AppText';
import { CoinIcon } from '../components/Currency';
import { Button } from '../components/Kit';
import { Shine } from '../components/Live';
import { numberLocale } from '../i18n/format';
import { SchemeScope } from '../theme/AppearanceProvider';
import { mix } from '../theme/color';
import { throneRadiance, ThroneArt } from './ThroneArt';

/** One of the eight halls, with its id narrowed so its names can be looked up. */
type Hall = NonNullable<ReturnType<typeof getCup>>;

const NIGHT = '#07040f';
const GOLD = '#ffd76a';

/**
 * Inside the hall, drawn rather than photographed: an arched window glowing
 * behind the throne, pillars, two banners in the hall's colours and a tiled
 * floor running away into the dark. The grander the hall, the brighter.
 */
function HallScene({ cup, radiance }: { cup: CupDef; radiance: number }) {
  const { base, light, gem } = cup.throne;
  const id = `hall-${cup.id}`;
  const glow = gem ?? light;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[mix(base, NIGHT, 0.35), mix(base, NIGHT, 0.72), NIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 240"
        preserveAspectRatio="xMinYMin meet"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id={`${id}-glow`} cx="56" cy="64" r="130" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={glow} stopOpacity={0.35 + radiance * 0.4} />
            <Stop offset="0.45" stopColor={glow} stopOpacity={0.08 + radiance * 0.12} />
            <Stop offset="1" stopColor={glow} stopOpacity="0" />
          </RadialGradient>
          <SvgGradient id={`${id}-window`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} stopOpacity={0.3 + radiance * 0.25} />
            <Stop offset="1" stopColor={light} stopOpacity="0.02" />
          </SvgGradient>
          <SvgGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} stopOpacity="0.16" />
            <Stop offset="1" stopColor={light} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        {/* The arched window behind the throne, with its glazing bars. */}
        <Path
          d="M14 150 V60 Q14 12 56 12 Q98 12 98 60 V150 Z"
          fill={`url(#${id}-window)`}
          stroke={light}
          strokeOpacity={0.35 + radiance * 0.3}
          strokeWidth="2"
        />
        <Path
          d="M56 14 V150 M14 76 H98 M24 40 Q56 54 88 40"
          stroke={light}
          strokeOpacity="0.18"
          strokeWidth="1.5"
          fill="none"
        />
        <Rect x="0" y="0" width="320" height="240" fill={`url(#${id}-glow)`} />
        {/* Pillars down the far side of the hall. */}
        <G fill={light} opacity={0.07 + radiance * 0.05}>
          <Rect x="300" y="20" width="16" height="140" rx="3" />
          <Rect x="294" y="14" width="28" height="8" rx="2" />
        </G>
        {/* Two banners in the hall's colours, hanging from the top. */}
        <Path d="M262 0 H282 V36 L272 29 L262 36 Z" fill={base} opacity="0.85" />
        <Path d="M262 0 H282 V5 H262 Z" fill={light} opacity="0.7" />
        <Path d="M290 0 H310 V26 L300 20 L290 26 Z" fill={gem ?? light} opacity="0.7" />
        <Circle cx="272" cy="16" r="3.5" fill={light} opacity="0.8" />
        {/* The tiled floor, its lines running to a point behind the throne. */}
        <Path d="M0 150 H320 V240 H0 Z" fill={`url(#${id}-floor)`} />
        <Path
          d="M0 150 H320 M0 172 H320 M0 200 H320 M56 150 L-50 240 M56 150 L30 240 M56 150 L120 240 M56 150 L220 240 M56 150 L330 240"
          stroke={light}
          strokeOpacity="0.07"
          strokeWidth="1"
        />
        {/* Dust in the light. */}
        {[
          [130, 60, 1.4],
          [170, 96, 1],
          [210, 50, 1.2],
          [118, 128, 0.9],
          [262, 110, 1.1],
          [196, 140, 0.8],
        ].map(([x, y, r]) => (
          <Circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill="#ffffff"
            opacity={0.3 + radiance * 0.4}
          />
        ))}
      </Svg>
    </View>
  );
}

/**
 * One hall of the Royal Road: its throne lit as the prize on offer in a
 * hall of its own colours, what it costs and pays, and the ways in. Always
 * drawn in the night palette, by day and by night, so the art reads the same.
 */
export function HallCard({
  cup,
  hall,
  coins,
  busy,
  locked,
  motion,
  onEnter,
  onFriends,
}: {
  cup: Hall;
  hall: CupHall;
  /** The player's coins, to say how many more an entry needs. */
  coins: number;
  /** Which action is running on the screen, if any: the hall id, `private:<id>` or another key. */
  busy: string | null;
  /** True while the player is already in a bracket. */
  locked: boolean;
  motion: boolean;
  onEnter(): void;
  onFriends(): void;
}) {
  const { t } = useTranslation(['cups', 'collection']);
  const radiance = throneRadiance(cup);
  const tier = CUPS.findIndex((c) => c.id === cup.id) + 1;
  const { light, gem } = cup.throne;
  const accent = mix(light, '#ffffff', 0.25);
  const fmt = (n: number) => n.toLocaleString(numberLocale());
  const short = coins < hall.entry;
  const grand = tier >= 7;
  return (
    <View
      style={[
        s.card,
        {
          borderColor: grand ? `${GOLD}aa` : `${light}66`,
          boxShadow: `0 10px 26px ${mix(gem ?? light, '#000000', 0.4)}${grand ? '88' : '55'}`,
        },
      ]}
    >
      <HallScene cup={cup} radiance={radiance} />
      <Shine
        active={motion}
        every={Math.round(5200 - radiance * 2800)}
        strength={0.1 + radiance * 0.16}
      />
      <View style={s.top}>
        <View style={s.throne}>
          <ThroneArt cup={cup} won size={92} shine={motion} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[s.tierChip, { borderColor: `${accent}77` }]}>
            <Text style={[s.tierText, { color: accent }]}>
              {t('hall.tier', { n: tier, total: CUPS.length })}
            </Text>
          </View>
          <Text style={[s.hallName, { color: accent }]} numberOfLines={1}>
            {t(`collection:halls.${cup.id}`)}
          </Text>
          <Text style={s.throneName}>{t(`collection:throneNames.${cup.id}`)}</Text>
          <View style={s.mode}>
            <Ionicons name="flash" size={12} color={GOLD} />
            <Text style={s.modeText}>{t(`hall.mode.${cup.variant}`)}</Text>
          </View>
        </View>
      </View>

      <View style={s.prizeRow}>
        <CoinIcon size={26} />
        <View style={{ flex: 1 }}>
          <Text style={s.prizeLabel}>{t('hall.winnerTakes')}</Text>
          <Text style={s.prize}>{fmt(hall.prize)}</Text>
        </View>
        {hall.won > 0 && (
          <View style={s.wonBadge}>
            <Ionicons name="trophy" size={13} color="#2b1600" />
            <Text style={s.wonText}>{t('hall.won', { count: hall.won })}</Text>
          </View>
        )}
      </View>

      <View style={s.pills}>
        <View style={s.pill}>
          <Ionicons name="enter-outline" size={13} color="#e9ddff" />
          <Text style={s.pillText}>
            {hall.entry === 0 ? t('hall.free') : t('hall.entry', { coins: fmt(hall.entry) })}
          </Text>
        </View>
        <View style={s.pill}>
          <Ionicons name="medal-outline" size={13} color="#e9ddff" />
          <Text style={s.pillText}>{t('hall.runnerUp', { coins: fmt(hall.runnerUp) })}</Text>
        </View>
        {hall.waiting > 0 && (
          <View style={[s.pill, { borderColor: '#34d39966' }]}>
            <Ionicons name="people" size={13} color="#34d399" />
            <Text style={[s.pillText, { color: '#34d399' }]}>
              {t('hall.waiting', { count: hall.waiting })}
            </Text>
          </View>
        )}
      </View>

      {/* The buttons take the night palette, like the rest of the card. */}
      <SchemeScope scheme="dark">
        <View style={s.actions}>
          <View style={{ flex: 1 }}>
            <Button disabled={short || busy !== null || locked} onPress={onEnter}>
              {busy === hall.id
                ? t('hall.entering')
                : short
                  ? t('hall.short', { coins: fmt(hall.entry - coins) })
                  : t('hall.enter')}
            </Button>
          </View>
          {cup.friends && (
            <Button secondary fit disabled={short || busy !== null || locked} onPress={onFriends}>
              {busy === `private:${hall.id}` ? t('hall.entering') : t('private.button')}
            </Button>
          )}
        </View>
      </SchemeScope>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    backgroundColor: NIGHT,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  throne: { width: 100, alignItems: 'center' },
  tierChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#00000040',
  },
  tierText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  hallName: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  throneName: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    textShadowColor: '#00000088',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeText: { color: '#f3e8ff', fontSize: 12, fontWeight: '700' },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#00000059',
    borderWidth: 1,
    borderColor: `${GOLD}40`,
  },
  prizeLabel: { color: '#f5d68a', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  prize: { color: GOLD, fontSize: 24, fontWeight: '900' },
  wonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  wonText: { color: '#2b1600', fontSize: 12, fontWeight: '900' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff2e',
    backgroundColor: '#ffffff14',
  },
  pillText: { color: '#e9ddff', fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
