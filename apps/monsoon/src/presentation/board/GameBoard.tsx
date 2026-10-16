import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CanvasRef } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BoardView, type BoardViewProps } from './BoardView';
import { cellAt, cellCentre } from './layout';

interface GameBoardProps extends BoardViewProps {
  readonly onTapCell: (at: number) => void;
  /** Labels for screen readers, one per cell. */
  readonly cellLabel: (at: number) => string;
  readonly disabled?: boolean;
}

/**
 * The playable board: taps turn tiles. A grid of invisible views carries a
 * label and an action per cell for screen readers.
 */
export const GameBoard = forwardRef<CanvasRef, GameBoardProps>(function GameBoard(props, ref) {
  const { level, layout, onTapCell, cellLabel, disabled, ...view } = props;
  const latest = useRef({ onTapCell, layout, level, disabled });
  useEffect(() => {
    latest.current = { onTapCell, layout, level, disabled };
  });
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(600)
        .maxDistance(14)
        .runOnJS(true)
        .onEnd((e, ok) => {
          const p = latest.current;
          if (!ok || p.disabled) return;
          const at = cellAt(p.layout, p.level, e.x, e.y);
          if (at >= 0) p.onTapCell(at);
        }),
    [],
  );
  const c = layout.cell;
  return (
    <GestureDetector gesture={tap}>
      <View style={{ width: layout.width, height: layout.height }} collapsable={false}>
        <BoardView ref={ref} level={level} layout={layout} {...view} />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {level.tiles.map((tile, at) => {
            const { x, y } = cellCentre(layout, level, at);
            return (
              <View
                key={at}
                accessible
                accessibilityRole={tile.kind === 'rock' ? 'image' : 'button'}
                accessibilityLabel={cellLabel(at)}
                accessibilityActions={tile.kind === 'rock' ? undefined : [{ name: 'activate' }]}
                onAccessibilityAction={() => onTapCell(at)}
                pointerEvents="none"
                style={[styles.cell, { left: x - c / 2, top: y - c / 2, width: c, height: c }]}
              />
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute' },
});
