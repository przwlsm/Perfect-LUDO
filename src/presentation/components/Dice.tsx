import { StyleSheet, Text, View } from 'react-native';
import type { DieValue } from '@/domain';
import { DICE_FINISHES } from '../theme/themes';

const PIP_LAYOUTS: Record<DieValue, readonly (readonly [number, number])[]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

export interface DiceProps {
  readonly value: DieValue | null;
  readonly finish?: string;
}

export function Dice({ value, finish = 'ivory' }: DiceProps): React.JSX.Element {
  const colors = DICE_FINISHES[finish] ?? DICE_FINISHES.ivory!;
  return (
    <View
      style={[
        styles.face,
        {
          backgroundColor: colors.face,
          borderWidth: 1,
          borderColor: '#ffffff50',
          borderBottomWidth: 4,
        },
      ]}
      accessibilityLabel={value ? `Dice showing ${value}` : 'Dice not rolled'}
    >
      {value === null ? (
        <Text style={styles.placeholder}>?</Text>
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: 9 }, (_, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const isPip = PIP_LAYOUTS[value].some(([r, c]) => r === row && c === col);
            return (
              <View key={index} style={styles.cell}>
                {isPip && <View style={[styles.pip, { backgroundColor: colors.pip }]} />}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  placeholder: {
    fontSize: 24,
    fontWeight: '700',
    color: '#94a3b8',
  },
  grid: {
    width: SIZE - 12,
    height: SIZE - 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: (SIZE - 12) / 3,
    height: (SIZE - 12) / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f172a',
  },
});
