import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { i18n } from '../i18n';
import { Text } from './AppText';
import { CoinIcon, GemIcon } from './Currency';
import { ui } from '../theme/themes';
import { numberLocale } from '../i18n/format';

/** A rounded track with a glossy gradient fill, 0..1. */
export function ProgressBar({
  value,
  colors = [ui.blueSoft, ui.blue],
  height = 10,
}: {
  value: number;
  colors?: readonly [string, string];
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: '#0a0f1c',
        borderWidth: 1,
        borderColor: '#ffffff12',
        overflow: 'hidden',
      }}
    >
      {pct > 0 && (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height }}
        />
      )}
    </View>
  );
}

/** Coins, gems and XP a reward pays, as small chips. Zero amounts are left out. */
export function RewardChips({
  coins = 0,
  gems = 0,
  xp = 0,
  size = 'md',
}: {
  coins?: number;
  gems?: number;
  xp?: number;
  size?: 'sm' | 'md';
}) {
  const icon = size === 'sm' ? 14 : 16;
  const font = size === 'sm' ? 11 : 13;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {coins > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CoinIcon size={icon} />
          <Text style={{ color: ui.gold, fontWeight: '800', fontSize: font }}>
            +{coins.toLocaleString(numberLocale())}
          </Text>
        </View>
      )}
      {gems > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <GemIcon size={icon} />
          <Text style={{ color: ui.gem, fontWeight: '800', fontSize: font }}>+{gems}</Text>
        </View>
      )}
      {xp > 0 && (
        <Text style={{ color: ui.green, fontWeight: '800', fontSize: font }}>+{xp} XP</Text>
      )}
    </View>
  );
}

/** "3d 4h", "5h 12m", "9m": time until an ISO instant, or "now" once passed. */
export function timeLeft(iso: string, now = Date.now()): string {
  const ms = Date.parse(iso) - now;
  // Translated at call time, so every caller follows the current language.
  if (!Number.isFinite(ms) || ms <= 0) return i18n.t('rewards:time.now');
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return i18n.t('rewards:time.daysHours', { days, hours });
  if (hours > 0) return i18n.t('rewards:time.hoursMinutes', { hours, minutes: minutes % 60 });
  return i18n.t('rewards:time.minutes', { minutes: Math.max(1, minutes) });
}
