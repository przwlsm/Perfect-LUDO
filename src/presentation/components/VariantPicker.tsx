import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GAME_VARIANTS, VARIANT_INFO, type GameVariant } from '@/domain';
import { Text } from './AppText';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

const ICONS: Record<GameVariant, keyof typeof Ionicons.glyphMap> = {
  classic: 'grid',
  quick1: 'flash',
  quick2: 'timer',
  kill: 'skull',
};

/** Classic, Quick 1, Quick 2 or Kill & Go, with what the chosen one means. */
export function VariantPicker({
  value,
  onChange,
}: {
  value: GameVariant;
  onChange(variant: GameVariant): void;
}) {
  const { theme } = useProfile();
  return (
    <View style={{ gap: 8 }}>
      <View style={s.grid}>
        {GAME_VARIANTS.map((variant) => {
          const selected = variant === value;
          return (
            <Pressable
              key={variant}
              accessibilityRole="button"
              accessibilityLabel={VARIANT_INFO[variant].title}
              accessibilityHint={VARIANT_INFO[variant].description}
              accessibilityState={{ selected }}
              onPress={() => onChange(variant)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.chip,
                { backgroundColor: theme.surface },
                selected && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
              ]}
            >
              <Ionicons
                name={ICONS[variant]}
                size={16}
                color={selected ? theme.accent : ui.muted}
              />
              <Text style={[s.chipText, selected && { color: theme.accent }]}>
                {VARIANT_INFO[variant].title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.hint}>{VARIANT_INFO[value].description}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: ui.line,
  },
  chipText: { color: ui.text, fontWeight: '800', fontSize: 13 },
  hint: { color: ui.muted, fontSize: 12, lineHeight: 17 },
});
