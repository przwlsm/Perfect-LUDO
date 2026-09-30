import { Pressable, StyleSheet, View } from 'react-native';
import { displayNameOf, type LobbyPlayer, type PlayerColor } from '@/domain';
import { Text } from '../components/AppText';
import { UserAvatar } from './UserAvatar';
import { ui } from '../theme/themes';

const TEAMS: readonly { label: string; seats: readonly [number, number] }[] = [
  { label: 'Red & Yellow', seats: [0, 2] },
  { label: 'Green & Blue', seats: [1, 3] },
];

/**
 * A 2 v 2 room as two teams of two. Empty seats offer "Sit here" so friends
 * can choose to be partners (or rivals) before the game starts.
 */
export function TeamSeats({
  players,
  myId,
  colors,
  palette,
  canMove,
  onMove,
}: {
  players: readonly LobbyPlayer[];
  myId: string | null;
  colors: readonly PlayerColor[];
  palette: Record<PlayerColor, string>;
  /** Seats can change: the room is waiting and not searching. */
  canMove: boolean;
  onMove(seat: number): void;
}) {
  const bySeat = (seat: number) =>
    players.find((p) => p.seatIndex === seat && p.status === 'JOINED') ?? null;
  const mine = players.find((p) => p.userId === myId && p.status === 'JOINED')?.seatIndex;
  return (
    <View style={s.wrap}>
      {TEAMS.map((team, t) => (
        <View
          key={team.label}
          style={[s.team, mine !== undefined && team.seats.includes(mine) && s.myTeam]}
        >
          <Text style={s.teamLabel}>
            {mine !== undefined && team.seats.includes(mine) ? 'YOUR TEAM' : `TEAM ${t + 1}`}
          </Text>
          <Text style={s.teamName}>{team.label}</Text>
          {team.seats.map((seat) => {
            const player = bySeat(seat);
            const color = palette[colors[seat] ?? 'RED'];
            return (
              <View key={seat} style={[s.slot, { borderLeftColor: color }]}>
                {player ? (
                  <>
                    <UserAvatar
                      id={player.userId}
                      name={displayNameOf(player)}
                      emoji={player.avatar}
                      size={30}
                    />
                    <Text numberOfLines={1} style={s.name}>
                      {displayNameOf(player)}
                      {player.userId === myId ? ' (you)' : ''}
                    </Text>
                  </>
                ) : canMove && mine !== undefined ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Sit in the ${colors[seat]?.toLowerCase()} seat`}
                    onPress={() => onMove(seat)}
                    style={s.sit}
                  >
                    <Text style={s.sitText}>Sit here</Text>
                  </Pressable>
                ) : (
                  <Text style={s.empty}>Open seat</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10 },
  team: {
    flex: 1,
    gap: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: '#ffffff06',
  },
  myTeam: { borderColor: `${ui.gem}88`, backgroundColor: `${ui.gem}10` },
  teamLabel: { color: ui.gem, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  teamName: { color: ui.text, fontWeight: '800', fontSize: 13 },
  slot: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: ui.surfaceLow,
  },
  name: { color: ui.text, fontWeight: '700', fontSize: 13, flex: 1 },
  empty: { color: ui.subtle, fontSize: 12, fontWeight: '700' },
  sit: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${ui.gem}88`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sitText: { color: ui.gem, fontWeight: '800', fontSize: 12 },
});
