import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

/** Every player for themselves, or 2 v 2 with the player opposite. Four seats only. */
export function TeamsToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange(teams: boolean): void;
}) {
  const { theme } = useProfile();
  return (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        {([false, true] as const).map((teams) => {
          const selected = teams === value;
          return (
            <Pressable
              key={String(teams)}
              accessibilityRole="button"
              accessibilityLabel={teams ? '2 v 2 teams' : 'Every player for themselves'}
              accessibilityState={{ selected }}
              onPress={() => onChange(teams)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.chip,
                { backgroundColor: theme.surface },
                selected && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
              ]}
            >
              <Ionicons
                name={teams ? 'people' : 'person'}
                size={16}
                color={selected ? theme.accent : ui.muted}
              />
              <Text style={[s.text, selected && { color: theme.accent }]}>
                {teams ? '2 v 2 teams' : 'Every player'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value && (
        <Text style={s.hint}>
          You and the player opposite are partners: you never capture each other, and you win
          together. Both winners share the prize.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: ui.line,
  },
  text: { color: ui.text, fontWeight: '800', fontSize: 13 },
  hint: { color: ui.muted, fontSize: 12, lineHeight: 17 },
});
