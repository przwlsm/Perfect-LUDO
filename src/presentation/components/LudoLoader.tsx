import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { DiceBoard } from './LoaderArt';
import { makeStyles } from '../theme/AppearanceProvider';

/** Little Ludo tips to read while the table is being set (keys under common:loader.tips). */
export const LOADING_TIPS = [
  'sixOut',
  'sixAgain',
  'starSafe',
  'block',
  'captureBonus',
  'threeSixes',
  'exactRoll',
  'onlinePays',
  'dailyWheel',
  'killAndGo',
] as const;

/**
 * The Ludo-themed loading state: a die rolling through its faces, four
 * coins hopping in turn, and a rotating tip. Holds still (showing a six)
 * when motion is off.
 */
/**
 * The Ludo-themed loading state: a die tumbling on a little Ludo board with
 * coins racing round it, a label, and a rotating tip. `compact` drops the
 * tip (for the space where a board is about to appear). Holds still when
 * motion is off.
 */
export function LudoLoader({
  motionEnabled,
  label: labelOverride,
  size = 150,
  compact = false,
}: {
  motionEnabled: boolean;
  label?: string;
  /** Width of the little board. */
  size?: number;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const s = useStyles();
  const label = labelOverride ?? t('loader.settingUp');
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (compact) return;
    const next = setInterval(() => setTip((t) => (t + 1) % LOADING_TIPS.length), 2800);
    return () => clearInterval(next);
  }, [compact]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        compact ? label : `${label} ${t(`loader.tips.${LOADING_TIPS[tip] ?? 'sixOut'}`)}`
      }
      style={s.wrap}
    >
      <DiceBoard size={size} motionEnabled={motionEnabled} />
      <Text style={s.label}>{label}</Text>
      {!compact && (
        <Animated.View
          key={tip}
          entering={motionEnabled ? FadeIn.duration(300) : undefined}
          exiting={motionEnabled ? FadeOut.duration(200) : undefined}
          style={s.tipBox}
        >
          <Text style={s.tipTitle}>{t('loader.tipTitle')}</Text>
          <Text style={s.tip}>{t(`loader.tips.${LOADING_TIPS[tip] ?? 'sixOut'}`)}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles((ui) => ({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 28 },
  label: { color: ui.text, fontSize: 17, fontWeight: '800' },
  tipBox: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: ui.fill,
    maxWidth: 320,
  },
  tipTitle: { color: ui.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  tip: { color: ui.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
}));
