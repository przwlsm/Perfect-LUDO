import { useEffect, useLayoutEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

const ICON = require('../../../assets/brand/splash-icon.png');
const COINS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
/** Same size as the native splash image, so the hand-over is seamless. */
const LOGO = 288;

/**
 * The branded intro that follows the native splash. It starts on exactly
 * the native splash's picture (same logo, size and background), so hiding
 * the native one is invisible; then the logo bounces, the name rises in,
 * four coins hop, and the whole thing fades into the app. Short, and
 * shorter still with reduce motion on.
 */
export function AppIntro({ onDone }: { onDone(): void }) {
  const { t } = useTranslation();
  const s = useStyles();
  const ui = useUi();
  const [reduced, setReduced] = useState<boolean | null>(null);
  const logo = useSharedValue(1);
  const title = useSharedValue(0);
  const coins = useSharedValue(0);
  const veil = useSharedValue(1);

  // The native splash can go as soon as this identical picture is on screen.
  useLayoutEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduced(value))
      .catch(() => alive && setReduced(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced === null) return;
    const finish = () => onDone();
    if (reduced) {
      title.value = 1;
      veil.value = withDelay(
        500,
        withTiming(0, { duration: 250 }, (ok) => ok && runOnJS(finish)()),
      );
      return;
    }
    logo.value = withSequence(
      withTiming(0.86, { duration: 180, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 180 }),
    );
    title.value = withDelay(
      250,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    coins.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
        ),
        3,
      ),
    );
    veil.value = withDelay(
      1900,
      withTiming(
        0,
        { duration: 380, easing: Easing.in(Easing.quad) },
        (ok) => ok && runOnJS(finish)(),
      ),
    );
  }, [reduced, logo, title, coins, veil, onDone]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logo.value }, { translateY: interpolate(title.value, [0, 1], [0, -40]) }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ translateY: interpolate(title.value, [0, 1], [24, -30]) }],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.screen, veilStyle]}>
      <Animated.View style={logoStyle}>
        <Image
          source={ICON}
          style={{ width: LOGO, height: LOGO }}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      <Animated.View style={[s.titleBox, titleStyle]}>
        <Text style={s.title}>
          LUDO<Text style={{ color: ui.gold }}> CLUB</Text>
        </Text>
        <Text style={s.tagline}>{t('brand.tagline')}</Text>
        <View style={s.coins}>
          {COINS.map((color, i) => (
            <Coin key={color} color={color} index={i} t={coins} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Coin({ color, index, t }: { color: string; index: number; t: SharedValue<number> }) {
  const s = useStyles();
  const style = useAnimatedStyle(() => {
    // Each coin hops a beat after the one before.
    const phase = Math.max(0, Math.min(1, t.value * 1.6 - index * 0.2));
    return { transform: [{ translateY: -12 * Math.sin(phase * Math.PI) }] };
  });
  return <Animated.View style={[s.coin, { backgroundColor: color }, style]} />;
}

const useStyles = makeStyles((ui) => ({
  screen: {
    // The day or night splash colour, so the hand-over is seamless.
    backgroundColor: ui.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  titleBox: {
    position: 'absolute',
    top: '50%', // The board fills about 60% of the padded image.
    marginTop: LOGO * 0.36,
    alignItems: 'center',
    gap: 6,
  },
  title: { color: ui.text, fontSize: 38, fontWeight: '900', letterSpacing: 1.5 },
  tagline: { color: ui.subtle, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  coins: { flexDirection: 'row', gap: 12, marginTop: 14, height: 30, alignItems: 'flex-end' },
  coin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffffdd',
  },
}));
