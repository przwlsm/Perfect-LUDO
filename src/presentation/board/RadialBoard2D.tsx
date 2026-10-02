import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { ALL_PLAYER_COLORS, isSafeSquare } from '@/domain';
import type { Board2DProps } from './Board2D';
import { getBoardTheme } from '../theme/themes';
import { AnimatedPiece2D } from './AnimatedPiece2D';
import { TurnGlow, TurnGlowTriangle, turnColorOf } from './TurnGlow';
import {
  radialGrid,
  radialHome,
  radialHomeTriangle,
  radialShift,
  radialTrack,
  radialYard,
  radialPoint,
} from './radialLayout';
import { getCellForPiece } from './getCellForPiece';
import { keepLtr } from '../i18n/rtl';
export function RadialBoard2D({
  state,
  validMoves,
  size,
  theme = getBoardTheme('classic'),
  motionEnabled = false,
  homeStyle = 'triangle',
  showTurn = false,
  onSelectMove,
}: Board2DProps) {
  const { t } = useTranslation('game');
  const count = state.players.length,
    grid = radialGrid(count),
    cell = size / grid,
    // Bigger tables push the arms out; the hub grows by the same amount.
    hub = 3.15 + radialShift(count);
  const colors = ALL_PLAYER_COLORS.slice(0, count),
    track = radialTrack(count);
  const pieces = state.players.flatMap((p) =>
    p.pieces.map((piece, slot) => ({ piece, slot, cell: getCellForPiece(piece, slot, count) })),
  );
  const occupied = new Map<string, number>();
  const round = homeStyle === 'round';
  const turnColor = showTurn ? turnColorOf(state) : null;
  // Triangle homes light up their whole triangle; round homes get a halo around the yard.
  const glow = (() => {
    if (!turnColor) return null;
    if (!round) {
      const { apex, left, right } = radialHomeTriangle(turnColor, count);
      const px = ([r, c]: readonly number[]) => ({ x: (c! + 0.5) * cell, y: (r! + 0.5) * cell });
      return { kind: 'triangle' as const, apex: px(apex), left: px(left), right: px(right) };
    }
    const [r, c] = radialYard(turnColor, count);
    const radius = 1.95 * cell;
    return {
      kind: 'circle' as const,
      left: (c + 0.5) * cell - radius,
      top: (r + 0.5) * cell - radius,
      radius,
    };
  })();
  return (
    <View
      style={{
        ...keepLtr,
        width: size,
        height: size,
        borderWidth: 0,
        // Round homes sit on a round table; triangle homes, arms and centre
        // together already form the board's outline, so nothing is drawn behind.
        ...(round
          ? { borderRadius: size / 2, overflow: 'hidden', backgroundColor: theme.surface }
          : null),
      }}
    >
      {colors.map((color, seat) => (
        <View
          key={`finish-${color}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: [{ rotate: `${(seat * 360) / count - 180}deg` }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: size / 2,
              left: size / 2 - hub * Math.tan(Math.PI / count) * cell,
              width: 0,
              height: 0,
              borderLeftWidth: hub * Math.tan(Math.PI / count) * cell,
              borderRightWidth: hub * Math.tan(Math.PI / count) * cell,
              borderBottomWidth: hub * cell,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: theme.colors[color],
            }}
          />
        </View>
      ))}
      {colors.map((color, seat) => {
        const [r, c] = radialPoint(seat, count, 5.5 + radialShift(count));
        return (
          <View
            key={`arm-${color}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (c + 0.5 - 1.55) * cell,
              top: (r + 0.5 - 3) * cell,
              width: 3.1 * cell,
              height: 6 * cell,
              backgroundColor: theme.tile,
              transform: [{ rotate: `${(seat * 360) / count}deg` }],
            }}
          />
        );
      })}
      {!round &&
        colors.map((color) => {
          const { apex, left, right } = radialHomeTriangle(color, count);
          const px = ([r, c]: readonly number[]) => ({
            x: (c! + 0.5) * cell,
            y: (r! + 0.5) * cell,
          });
          const a = px(apex);
          const l = px(left);
          const b = px(right);
          const mid = { x: (l.x + b.x) / 2, y: (l.y + b.y) / 2 };
          const base = Math.hypot(b.x - l.x, b.y - l.y);
          const height = Math.hypot(a.x - mid.x, a.y - mid.y);
          // Drawn apex-up from borders, then turned so the apex faces the centre.
          const turn = (Math.atan2(a.y - mid.y, a.x - mid.x) * 180) / Math.PI + 90;
          const [yr, yc] = radialYard(color, count);
          return (
            <View
              key={color}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, top: 0 }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: (a.x + mid.x) / 2 - base / 2,
                  top: (a.y + mid.y) / 2 - height / 2,
                  width: 0,
                  height: 0,
                  borderLeftWidth: base / 2,
                  borderRightWidth: base / 2,
                  borderBottomWidth: height,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: theme.colors[color],
                  transform: [{ rotate: `${turn}deg` }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: (yc + 0.5 - 1.45) * cell,
                  top: (yr + 0.5 - 1.45) * cell,
                  width: cell * 2.9,
                  height: cell * 2.9,
                  borderRadius: cell * 1.45,
                  backgroundColor: theme.tile,
                  borderWidth: cell * 0.12,
                  borderColor: '#00000018',
                }}
              />
            </View>
          );
        })}
      {/* Under the track, so only the visible part of the triangle glows. */}
      {turnColor && glow?.kind === 'triangle' && (
        <TurnGlowTriangle
          color={theme.colors[turnColor]}
          apex={glow.apex}
          left={glow.left}
          right={glow.right}
          ring={Math.max(2, cell * 0.14)}
          motionEnabled={motionEnabled}
        />
      )}
      {round &&
        colors.map((color) => {
          const [r, c] = radialYard(color, count);
          return (
            <View
              key={color}
              style={{
                position: 'absolute',
                left: (c - 1.35) * cell,
                top: (r - 1.35) * cell,
                width: cell * 3.7,
                height: cell * 3.7,
                borderRadius: cell * 2,
                backgroundColor: theme.tile,
                borderColor: theme.colors[color],
                borderWidth: cell * 0.3,
              }}
            />
          );
        })}
      {track.map(([r, c], index) => {
        const [nr, nc] = track[(index + 1) % track.length]!;
        const length = Math.hypot(nr - r, nc - c) * cell;
        if (length < cell * 1.1) return null;
        return (
          <View
            key={`bridge-${index}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: ((c + nc) / 2 + 0.5) * cell - length / 2,
              top: ((r + nr) / 2 + 0.5) * cell - cell * 0.08,
              width: length,
              height: cell * 0.16,
              backgroundColor: theme.tile + '90',
              transform: [{ rotateZ: `${Math.atan2(nr - r, nc - c)}rad` }],
            }}
          />
        );
      })}
      {track.map(([r, c], index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: c * cell,
            top: r * cell,
            width: cell,
            height: cell,
            borderRadius: 0,
            transform: [
              {
                rotateZ: `${((Math.floor(index / 13) + (index % 13 >= 5 ? 1 : 0)) * 360) / count}deg`,
              },
            ],
            backgroundColor:
              index % 13 === 0 ? theme.colors[colors[Math.floor(index / 13)]!] : theme.tile,
            borderWidth: 1,
            borderColor: theme.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: cell * 0.58, color: index % 13 === 0 ? '#ffffff' : '#596271' }}>
            {index % 13 === 0 ? '\u2193' : isSafeSquare(index, count) ? '\u2606' : ''}
          </Text>
        </View>
      ))}
      {colors.flatMap((color) =>
        radialHome(color, count).map(([r, c], index) => (
          <View
            key={`${color}-${index}`}
            style={{
              position: 'absolute',
              left: c * cell,
              top: r * cell,
              width: cell,
              height: cell,
              borderRadius: 0,
              transform: [{ rotateZ: `${(colors.indexOf(color) * 360) / count}deg` }],
              backgroundColor: theme.colors[color],
              borderWidth: 1,
              borderColor: theme.line,
            }}
          />
        )),
      )}
      <View
        style={{
          position: 'absolute',
          left: size / 2 - cell * 0.8,
          top: size / 2 - cell * 0.8,
          width: cell * 1.6,
          height: cell * 1.6,
          borderRadius: cell,
          backgroundColor: theme.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: cell * 0.6, color: theme.background }}>{t('board.home')}</Text>
      </View>
      {turnColor && glow?.kind === 'circle' && (
        <TurnGlow
          color={theme.colors[turnColor]}
          left={glow.left}
          top={glow.top}
          width={glow.radius * 2}
          height={glow.radius * 2}
          radius={glow.radius}
          ring={Math.max(2, cell * 0.14)}
          motionEnabled={motionEnabled}
        />
      )}
      {pieces.map(({ piece, slot, cell: location }) => {
        const key = location.join(','),
          stackIndex = occupied.get(key) ?? 0;
        occupied.set(key, stackIndex + 1);
        const stackCount = pieces.filter((p) => p.cell.join(',') === key).length;
        return (
          <AnimatedPiece2D
            key={piece.id}
            piece={piece}
            playerCount={count}
            yardSlot={slot}
            cellSize={cell}
            fill={theme.colors[piece.color]}
            pieceStyle={theme.pieceStyle}
            stackIndex={stackIndex}
            stackCount={stackCount}
            move={validMoves?.find((m) => m.pieceId === piece.id)}
            motionEnabled={motionEnabled}
            onSelectMove={onSelectMove}
          />
        );
      })}
    </View>
  );
}
