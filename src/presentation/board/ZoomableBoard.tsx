import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

const MAX_ZOOM = 2.6;
const TAP_ZOOM = 1.8;

/**
 * Pinch-to-zoom for the big round tables, where seven or eight arms make
 * every cell small on a phone. Two fingers zoom, one finger pans the zoomed
 * board, and the corner badge zooms in or resets with a tap. Coins keep
 * their own tap targets inside; only a real drag is taken by the pan.
 *
 * The board is a square sized by the short side, but the zoom window is the
 * whole table area (`viewport`): at 1x the board sits centred as before, and
 * zoomed in it spreads into the full height of the screen rather than staying
 * clipped to its square. Pinching works anywhere in that area.
 *
 * Shared values are read and written through get/set (never `.value =`),
 * which is the form the React Compiler accepts inside these closures.
 */
export function ZoomableBoard({
  size,
  viewport,
  children,
}: {
  size: number;
  /** The space the zoomed board may fill; the board's own square when absent. */
  viewport?: { width: number; height: number };
  children: ReactNode;
}) {
  const width = Math.max(size, viewport?.width ?? size);
  const height = Math.max(size, viewport?.height ?? size);
  const { t } = useTranslation('game');
  const s = useStyles();
  const ui = useUi();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.set(scale.get());
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_ZOOM, Math.max(1, savedScale.get() * e.scale));
      scale.set(next);
      // Never pan past the board's edge, on either axis of the window.
      const limitX = Math.max(0, (size * next - width) / 2);
      const limitY = Math.max(0, (size * next - height) / 2);
      tx.set(Math.min(limitX, Math.max(-limitX, tx.get())));
      ty.set(Math.min(limitY, Math.max(-limitY, ty.get())));
    })
    .onEnd(() => {
      runOnJS(setZoomed)(scale.get() > 1.02);
    });

  const pan = Gesture.Pan()
    .minDistance(12)
    .maxPointers(2)
    .onStart(() => {
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    })
    .onUpdate((e) => {
      const limitX = Math.max(0, (size * scale.get() - width) / 2);
      const limitY = Math.max(0, (size * scale.get() - height) / 2);
      tx.set(Math.min(limitX, Math.max(-limitX, savedTx.get() + e.translationX)));
      ty.set(Math.min(limitY, Math.max(-limitY, savedTy.get() + e.translationY)));
    });

  const gesture = Gesture.Simultaneous(pinch, pan);
  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  // The badge animates through state; the tick re-runs a repeated target.
  const [target, setTarget] = useState<{ scale: number; tick: number } | null>(null);
  useEffect(() => {
    if (!target) return;
    scale.set(withTiming(target.scale, { duration: 220 }));
    tx.set(withTiming(0, { duration: 220 }));
    ty.set(withTiming(0, { duration: 220 }));
  }, [target, scale, tx, ty]);
  function toggle() {
    setTarget((t) => ({ scale: zoomed ? 1 : TAP_ZOOM, tick: (t?.tick ?? 0) + 1 }));
    setZoomed(!zoomed);
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <GestureDetector gesture={gesture}>
        {/* The whole window takes the gesture; the board sits in its centre. */}
        <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ width: size, height: size }, boardStyle]}>
            {children}
          </Animated.View>
        </View>
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={zoomed ? t('zoom.resetA11y') : t('zoom.zoomA11y')}
        onPress={toggle}
        android_ripple={{ color: ui.ripple }}
        // A slim overlay so the board stays visible; the slop lifts its touch area to 48 high.
        hitSlop={{ top: 9, bottom: 9 }}
        style={s.badge}
      >
        <Ionicons name={zoomed ? 'contract' : 'expand'} size={14} color={ui.text} />
        <Text style={s.badgeText}>{zoomed ? t('zoom.reset') : t('zoom.pinch')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((ui) => ({
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${ui.background}cc`,
    borderWidth: 1,
    borderColor: ui.border,
    boxShadow: liftByDay(ui),
  },
  badgeText: { color: ui.text, fontSize: 11, fontWeight: '800' },
}));
