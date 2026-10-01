import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { describeConnection } from '@/domain';
import { useConnectivity } from '../state/ConnectivityProvider';
import { ui } from '../theme/themes';

const TONE = { good: ui.green, warn: ui.gold, bad: ui.danger } as const;

/** The 🟢 / 🟡 / 🔴 status the spec asks for, in the app's own colours. */
export function ConnectionPill({ large = false }: { large?: boolean }) {
  const { available, state } = useConnectivity();
  const { t } = useTranslation();
  const shown = available
    ? { label: t(`connection.${state}`), tone: describeConnection(state).tone }
    : { label: t('connection.offlineBuild'), tone: 'bad' as const };
  const color = TONE[shown.tone];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('connection.a11y', { label: shown.label })}
      accessibilityLiveRegion="polite"
      style={[s.pill, large && { borderColor: `${color}40`, backgroundColor: `${color}12` }]}
    >
      <View style={[s.dot, { backgroundColor: color }, large && { width: 8, height: 8 }]} />
      <Text style={[s.text, { color }, large && s.textLarge]}>{shown.label.toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 8,
    minHeight: 26,
  },
  dot: { width: 5, height: 5, borderRadius: 4 },
  text: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  textLarge: { fontSize: 10, letterSpacing: 0.9 },
});
