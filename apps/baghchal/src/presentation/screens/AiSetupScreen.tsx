import { useState } from 'react';
import { router } from 'expo-router';
import { goBackOrHome } from '../platform/navigation';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { opponent, type AiLevel, type Side } from 'baghchal-engine';
import { colors } from '../theme/colors';

const SIDES: readonly { value: Side; label: string; hint: string }[] = [
  { value: 'goat', label: 'Goats', hint: 'Place twenty, then close the net' },
  { value: 'tiger', label: 'Tigers', hint: 'Hunt five goats' },
];

const LEVELS: readonly { value: AiLevel; label: string; hint: string }[] = [
  { value: 'novice', label: 'Novice', hint: 'Makes mistakes' },
  { value: 'tactician', label: 'Tactician', hint: 'Sees a few moves ahead' },
  { value: 'grandmaster', label: 'Grandmaster', hint: 'Searches deep' },
];

export function AiSetupScreen() {
  const [side, setSide] = useState<Side>('goat');
  const [level, setLevel] = useState<AiLevel>('tactician');

  const start = () =>
    router.replace({ pathname: '/game', params: { ai: level, aiSide: opponent(side) } });

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={() => goBackOrHome()} accessibilityRole="button" hitSlop={12}>
        <Text style={styles.back}>‹ Menu</Text>
      </Pressable>
      <Text style={styles.title}>Play the AI</Text>

      <Text style={styles.heading}>You play</Text>
      <Choices options={SIDES} value={side} onChange={setSide} />

      <Text style={styles.heading}>Opponent</Text>
      <Choices options={LEVELS} value={level} onChange={setLevel} />

      <View style={styles.footer}>
        <Pressable onPress={start} accessibilityRole="button" style={styles.primary}>
          <Text style={styles.primaryText}>Start</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface ChoicesProps<T extends string> {
  readonly options: readonly { value: T; label: string; hint: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

function Choices<T extends string>({ options, value, onChange }: ChoicesProps<T>) {
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen }}
            style={[styles.choice, chosen && styles.choiceChosen]}
          >
            <Text style={[styles.choiceLabel, chosen && styles.choiceLabelChosen]}>
              {option.label}
            </Text>
            <Text style={styles.choiceHint}>{option.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  back: { color: colors.accent, fontSize: 17, fontWeight: '600', paddingVertical: 12 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginBottom: 8 },
  heading: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  choices: { gap: 10 },
  choice: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  choiceChosen: { borderColor: colors.accent },
  choiceLabel: { color: colors.text, fontSize: 17, fontWeight: '700' },
  choiceLabelChosen: { color: colors.accent },
  choiceHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  footer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 32 },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryText: { color: colors.onAccent, fontSize: 18, fontWeight: '800' },
});
