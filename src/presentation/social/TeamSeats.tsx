import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { displayNameOf, type LobbyPlayer, type PlayerColor } from '@/domain';
import { Text } from '../components/AppText';
import { UserAvatar } from './UserAvatar';
import { makeStyles } from '../theme/AppearanceProvider';

/** Text: online:teamSeats.<id>. */
const TEAMS: readonly { id: 'redYellow' | 'greenBlue'; seats: readonly [number, number] }[] = [
  { id: 'redYellow', seats: [0, 2] },
  { id: 'greenBlue', seats: [1, 3] },
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
  const { t } = useTranslation('online');
  const s = useStyles();
  const bySeat = (seat: number) =>
    players.find((p) => p.seatIndex === seat && p.status === 'JOINED') ?? null;
  const mine = players.find((p) => p.userId === myId && p.status === 'JOINED')?.seatIndex;
  return (
    <View style={s.wrap}>
      {TEAMS.map((team, index) => (
        <View
          key={team.id}
          style={[s.team, mine !== undefined && team.seats.includes(mine) && s.myTeam]}
        >
          <Text style={s.teamLabel}>
            {mine !== undefined && team.seats.includes(mine)
              ? t('teamSeats.yourTeam')
              : t('teamSeats.team', { number: index + 1 })}
          </Text>
          <Text style={s.teamName}>{t(`teamSeats.${team.id}`)}</Text>
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
                      {player.userId === myId
                        ? t('nameYou', { name: displayNameOf(player) })
                        : displayNameOf(player)}
                    </Text>
                  </>
                ) : canMove && mine !== undefined ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('teamSeats.sitA11y', {
                      color: colors[seat] ? t(`colors.${colors[seat]}`).toLowerCase() : '',
                    })}
                    onPress={() => onMove(seat)}
                    style={s.sit}
                  >
                    <Text style={s.sitText}>{t('teamSeats.sitHere')}</Text>
                  </Pressable>
                ) : (
                  <Text style={s.empty}>{t('teamSeats.openSeat')}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((ui) => ({
  wrap: { flexDirection: 'row', gap: 10 },
  team: {
    flex: 1,
    gap: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.fill,
  },
  myTeam: { borderColor: `${ui.gem}88`, backgroundColor: `${ui.gem}10` },
  teamLabel: { color: ui.gem, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  teamName: { color: ui.text, fontWeight: '800', fontSize: 13 },
  slot: {
    minHeight: 48,
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
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${ui.gem}88`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sitText: { color: ui.gem, fontWeight: '800', fontSize: 12 },
}));
