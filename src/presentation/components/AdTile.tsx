import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { CoinIcon, GemIcon } from './Currency';
import { ui } from '../theme/themes';

/**
 * The one look every "watch an ad" offer wears: a gold play badge on a warm
 * gradient, the reward spelled out, and the whole tile tappable. While the
 * ad loads, the badge becomes a spinner so the tap always visibly lands.
 */
export function AdTile({
  title,
  reward,
  icon,
  caption,
  busy = false,
  disabled = false,
  left,
  total,
  compact = false,
  onPress,
}: {
  title: string;
  /** What the viewer gets, e.g. "+150 to your vault". */
  reward: string;
  icon?: 'coin' | 'gem';
  caption?: string;
  busy?: boolean;
  disabled?: boolean;
  /** Remaining/total today; shown as dots when provided. */
  left?: number;
  total?: number;
  compact?: boolean;
  onPress(): void;
}) {
  const { t } = useTranslation('home');
  const off = disabled && !busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('ad.a11y', { title, reward })}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      android_ripple={{ color: `${ui.gold}30` }}
      style={({ pressed }) => [
        s.tile,
        off && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <LinearGradient
        colors={['#3a2d10', '#241d10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.inner, compact && { padding: 12, gap: 12 }]}
      >
        <View style={[s.play, compact && { width: 44, height: 44, borderRadius: 22 }]}>
          {busy ? (
            <ActivityIndicator color="#3b2400" />
          ) : (
            <Ionicons
              name="play"
              size={compact ? 20 : 26}
              color="#3b2400"
              style={{ marginLeft: 3 }}
            />
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[s.title, compact && { fontSize: 15 }]}>
            {busy ? t('ad.loading') : title}
          </Text>
          <View style={s.rewardRow}>
            {icon === 'coin' && <CoinIcon size={compact ? 13 : 15} />}
            {icon === 'gem' && <GemIcon size={compact ? 13 : 15} />}
            <Text style={[s.reward, compact && { fontSize: 13 }]}>{reward}</Text>
          </View>
          {(busy || caption) && (
            <Text style={s.caption} numberOfLines={2}>
              {busy ? t('ad.hangTight') : caption}
            </Text>
          )}
        </View>
        {left !== undefined && total !== undefined && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={s.dots}>
              {Array.from({ length: total }, (_, i) => (
                <View key={i} style={[s.dot, i < left && { backgroundColor: ui.gold }]} />
              ))}
            </View>
            <Text style={s.dotsText}>{t('ad.left', { left })}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: `${ui.gold}55`,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  play: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: ui.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#b77739',
  },
  title: { color: ui.text, fontWeight: '900', fontSize: 17 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reward: { color: ui.gold, fontWeight: '900', fontSize: 15 },
  caption: { color: ui.subtle, fontSize: 12, lineHeight: 16 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff22' },
  dotsText: { color: ui.subtle, fontSize: 10, fontWeight: '800' },
});
