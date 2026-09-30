import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { ui } from '../theme/themes';

const MAX_ZOOM = 2.6;
const TAP_ZOOM = 1.8;

/**
 * Pinch-to-zoom for the big round tables, where seven or eight arms make
 * every cell small on a phone. Two fingers zoom, one finger pans the zoomed
 * board, and the corner badge zooms in or resets with a tap. Coins keep
 * their own tap targets inside; only a real drag is taken by the pan.
 *
 * Shared values are read and written through get/set (never `.value =`),
 * which is the form the React Compiler accepts inside these closures.
 */
export function ZoomableBoard({ size, children }: { size: number; children: ReactNode }) {
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
      // Never show the space beyond the board's edge.
      const limit = (size * (next - 1)) / 2;
      tx.set(Math.min(limit, Math.max(-limit, tx.get())));
      ty.set(Math.min(limit, Math.max(-limit, ty.get())));
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
      const limit = (size * (scale.get() - 1)) / 2;
      tx.set(Math.min(limit, Math.max(-limit, savedTx.get() + e.translationX)));
      ty.set(Math.min(limit, Math.max(-limit, savedTy.get() + e.translationY)));
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
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: size, height: size }, boardStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={zoomed ? 'Reset zoom' : 'Zoom in on the board'}
        onPress={toggle}
        android_ripple={{ color: '#ffffff20' }}
        style={s.badge}
      >
        <Ionicons name={zoomed ? 'contract' : 'expand'} size={14} color={ui.text} />
        <Text style={s.badgeText}>{zoomed ? 'Reset' : 'Pinch to zoom'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
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
    backgroundColor: '#0e1322cc',
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  badgeText: { color: ui.text, fontSize: 11, fontWeight: '800' },
});
