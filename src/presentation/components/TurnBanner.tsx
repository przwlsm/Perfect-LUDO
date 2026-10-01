import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import type { GameState, PlayerColor } from '@/domain';
import { PLAYER_COLOR_HEX } from './PlayerColorPalette';

export interface TurnBannerProps {
  readonly state: GameState;
  readonly humanColor: PlayerColor;
}

export function TurnBanner({ state, humanColor }: TurnBannerProps): React.JSX.Element {
  const { t } = useTranslation('game');
  // The colour as an id ("RED") in English, its name in other languages.
  const colorName = (color: PlayerColor) => t(`colors.${color}`).toUpperCase();
  if (state.status === 'FINISHED') {
    const won = state.winnerColor === humanColor;
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          {won
            ? t('turnBanner.youWon')
            : t('turnBanner.wins', {
                color: state.winnerColor ? colorName(state.winnerColor) : '',
              })}
        </Text>
      </View>
    );
  }

  const current = state.players[state.currentPlayerIndex]!.color;
  const isYou = current === humanColor;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: PLAYER_COLOR_HEX[current] }]} />
      <Text style={styles.text}>
        {isYou ? t('turnBanner.yourTurn') : t('turnBanner.turn', { color: colorName(current) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  text: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
});
