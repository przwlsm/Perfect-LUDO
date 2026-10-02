import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SPIN_SLOTS } from '@/domain';
import { Text } from './AppText';
import { CoinIcon, GemIcon } from './Currency';
import { useUi } from '../theme/AppearanceProvider';
import { DARK } from '../theme/palette';
import { liftByDay } from '../theme/surfaces';

/**
 * The wheel itself (disc, slots and their labels) is game art, the same in
 * both modes; only its rim, glow and pointer follow the appearance.
 */
const SLOT_COLORS = ['#232d4b', '#2f2a4a'];
const DISC = ['#3b2f63', '#1a1f2f'] as const;

/**
 * The lucky wheel: the prizes sit round a ring under a fixed pointer at the
 * top. Handing it a `landOn` slot spins the ring several turns and eases it
 * to a stop with that prize under the pointer; `onLanded` fires when it
 * stops, so the prize is only revealed once the wheel has settled.
 */
export function LuckyWheel({
  size,
  landOn,
  spinKey,
  motionEnabled,
  onLanded,
}: {
  size: number;
  /** Server-chosen slot to stop on; null while idle. */
  landOn: number | null;
  /** Changes on every spin, so the same slot twice still spins. */
  spinKey: number;
  motionEnabled: boolean;
  onLanded(): void;
}) {
  const { t } = useTranslation('rewards');
  const ui = useUi();
  const night = ui.scheme === 'dark';
  const rotation = useSharedValue(0);
  const count = SPIN_SLOTS.length;
  const step = 360 / count;

  useEffect(() => {
    if (landOn === null) return;
    // Slot i sits at i*step clockwise from the top; turning the ring back by
    // that much brings it under the pointer. Whole extra turns for drama.
    const current = rotation.value % 360;
    const target = rotation.value - current + 360 * 5 + (360 - landOn * step);
    if (!motionEnabled) {
      rotation.value = target;
      onLanded();
      return;
    }
    rotation.value = withTiming(
      target,
      { duration: 3400, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onLanded)();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const tile = size * 0.24;
  const radius = size / 2 - tile * 0.72;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={DISC}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          // By day the rim is the bright marigold of the game art (the 10%)
          // over a soft navy lift; the deep gold text token would read brown.
          borderColor: night ? ui.gold : DARK.gold,
          boxShadow: night ? `0 0 28px ${ui.gold}55` : `0 0 22px ${DARK.gold}66, ${liftByDay(ui)}`,
        }}
      />
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, ring]}>
        {SPIN_SLOTS.map((slot, i) => {
          const angle = (i * step * Math.PI) / 180;
          const x = size / 2 + Math.sin(angle) * radius - tile / 2;
          const y = size / 2 - Math.cos(angle) * radius - tile / 2;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: tile,
                height: tile,
                borderRadius: tile * 0.28,
                backgroundColor: SLOT_COLORS[i % 2],
                borderWidth: 1.5,
                borderColor: '#ffffff26',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transform: [{ rotate: `${i * step}deg` }],
              }}
            >
              {slot.kind === 'coins' ? (
                <CoinIcon size={tile * 0.36} />
              ) : slot.kind === 'gems' ? (
                <GemIcon size={tile * 0.4} />
              ) : (
                <Text style={{ fontSize: tile * 0.26, color: DARK.green, fontWeight: '900' }}>
                  XP
                </Text>
              )}
              <Text style={{ color: DARK.text, fontWeight: '800', fontSize: tile * 0.2 }}>
                {slot.amount >= 1000 ? `${slot.amount / 1000}K` : slot.amount}
              </Text>
            </View>
          );
        })}
      </Animated.View>
      {/* Hub and pointer stay still while the ring turns. */}
      <LinearGradient
        colors={['#fde68a', '#f59e0b']}
        style={{
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size,
          borderWidth: 3,
          borderColor: '#92400e',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.07, color: '#472a00', fontWeight: '900' }}>
          {t('spin.hub')}
        </Text>
      </LinearGradient>
      <View
        style={{
          position: 'absolute',
          top: -6,
          width: 0,
          height: 0,
          borderLeftWidth: 14,
          borderRightWidth: 14,
          borderTopWidth: 26,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: ui.danger,
        }}
      />
    </View>
  );
}
