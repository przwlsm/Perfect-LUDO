import { memo } from 'react';
import { View } from 'react-native';
import { PLAYER_COLORS } from '@/domain';
import type { BoardTheme } from '../theme/themes';
import { GRID_SIZE, HOME_COLUMN_CELLS, YARD_BLOCKS, YARD_BLOCK_SIZE } from './boardLayout';
import { keepLtr } from '../i18n/rtl';

/**
 * A still picture of the classic board for store cards: the four yards with
 * their coins, the coloured home lanes and the four-colour centre, from the
 * same layout tables the real board uses. Under fifty plain views and no
 * animation, where a full Board2D is hundreds of cells plus sixteen animated
 * coins — a store tab lists over a dozen of these at once.
 */
export const BoardThumbnail = memo(function BoardThumbnail({
  theme,
  size,
}: {
  theme: BoardTheme;
  size: number;
}) {
  const cell = size / GRID_SIZE;
  const yard = YARD_BLOCK_SIZE * cell;
  const coin = cell * 1.1;
  return (
    <View
      style={{
        ...keepLtr,
        width: size,
        height: size,
        backgroundColor: theme.tile,
        borderWidth: 1,
        borderColor: theme.line,
        overflow: 'hidden',
      }}
    >
      {PLAYER_COLORS.map((color) => {
        const block = YARD_BLOCKS[color];
        return (
          <View
            key={`yard-${color}`}
            style={{
              position: 'absolute',
              left: block.col * cell,
              top: block.row * cell,
              width: yard,
              height: yard,
              backgroundColor: theme.colors[color],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: yard * 0.66,
                height: yard * 0.66,
                borderRadius: cell * 0.6,
                backgroundColor: theme.tile,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignContent: 'space-around',
                justifyContent: 'space-around',
                padding: cell * 0.35,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    width: coin,
                    height: coin,
                    borderRadius: coin,
                    backgroundColor: theme.colors[color],
                  }}
                />
              ))}
            </View>
          </View>
        );
      })}
      {PLAYER_COLORS.flatMap((color) =>
        HOME_COLUMN_CELLS[color].map(([row, col], i) => (
          <View
            key={`lane-${color}-${i}`}
            style={{
              position: 'absolute',
              left: col * cell,
              top: row * cell,
              width: cell,
              height: cell,
              backgroundColor: theme.colors[color],
            }}
          />
        )),
      )}
      {/* One bordered box whose four borders meet as the four home triangles. */}
      <View
        style={{
          position: 'absolute',
          left: 6 * cell,
          top: 6 * cell,
          width: 0,
          height: 0,
          borderTopWidth: 1.5 * cell,
          borderBottomWidth: 1.5 * cell,
          borderLeftWidth: 1.5 * cell,
          borderRightWidth: 1.5 * cell,
          borderTopColor: theme.colors.GREEN,
          borderRightColor: theme.colors.YELLOW,
          borderBottomColor: theme.colors.BLUE,
          borderLeftColor: theme.colors.RED,
        }}
      />
    </View>
  );
});
