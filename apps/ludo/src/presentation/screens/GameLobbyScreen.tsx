import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  countJoined,
  displayNameOf,
  isLobbyPlayerDisconnected,
  seatColors,
  type LobbyPlayer,
  tablePrize,
} from '@/domain';
import { useTranslation } from 'react-i18next';
import { useCatalogText } from '../i18n/useCatalogText';
import { Body, Button, Card, Label, Screen, Sheet, useShared } from '../components/Kit';
import { useLobby } from '../hooks/useLobby';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { UserAvatar } from '../social/UserAvatar';
import { TeamSeats } from '../social/TeamSeats';
import { LiveDot } from '../components/Live';
import { shareInvite } from '../social/inviteLink';
import { LinearGradient } from 'expo-linear-gradient';
import { makeStyles, SchemeScope, useUi } from '../theme/AppearanceProvider';
import { DARK, type Palette } from '../theme/palette';
import { readableOn } from '../theme/color';
import { liftByDay, MARIGOLD, NAVY_HERO } from '../theme/surfaces';
import { numberLocale } from '../i18n/format';
import { LudoSpinner } from '../components/LoaderArt';

type SeatState = {
  /** online:lobby.seat.<label> */
  readonly label:
    'noAnswer' | 'declined' | 'left' | 'disconnected' | 'ready' | 'notReady' | 'waiting';
  readonly color: string;
  readonly muted: boolean;
};

function seatState(player: LobbyPlayer, ui: Palette): SeatState {
  if (player.invitationStatus === 'EXPIRED') {
    return { label: 'noAnswer', color: ui.subtle, muted: true };
  }
  if (player.status === 'DECLINED') return { label: 'declined', color: ui.danger, muted: true };
  if (player.status === 'LEFT') return { label: 'left', color: ui.danger, muted: true };
  if (isLobbyPlayerDisconnected(player)) {
    return { label: 'disconnected', color: ui.danger, muted: false };
  }
  if (player.status === 'JOINED') {
    return {
      label: player.isReady ? 'ready' : 'notReady',
      color: player.isReady ? ui.green : ui.gold,
      muted: false,
    };
  }
  return { label: 'waiting', color: ui.gold, muted: true };
}

export default function GameLobbyScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lobbyId = typeof params.id === 'string' ? params.id : null;
  const { theme } = useProfile();
  const { t } = useTranslation(['online', 'common']);
  const { signedIn, identity, member } = useSocial();
  const lobby = useLobby(signedIn ? lobbyId : null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const snapshot = lobby.snapshot;
  // Quick-play and link tables, and guests, all belong to the online hub, not the friends list.
  const quick = snapshot?.challenge.kind === 'QUICK';
  const link = snapshot?.challenge.kind === 'LINK';
  const home = quick || link || !member ? '/online' : '/friends';
  const homeLabel = quick
    ? t('lobby.findAnother')
    : member && !link
      ? t('lobby.backToFriends')
      : t('backToOnline');
  const [copied, setCopied] = useState(false);
  const ui = useUi();
  const s = useStyles();
  const shared = useShared();

  async function leaveAndExit() {
    if (await lobby.leave()) router.replace(home);
  }

  // Every client leaves for the board the moment the server says STARTED, so
  // the transition is driven by one shared decision rather than N timers.
  useEffect(() => {
    if (snapshot?.lobby.status !== 'STARTED') return;
    const timer = setTimeout(
      () =>
        router.replace({
          pathname: '/game',
          // The lobby id is what makes it a shared board rather than a local one.
          params: { lobby: snapshot.lobby.id },
        }),
      700,
    );
    return () => clearTimeout(timer);
  }, [snapshot?.lobby.status, snapshot?.lobby.id, snapshot?.lobby.maxPlayers]);

  // A searching pair matched with another pair plays at the other table.
  const movedTo = snapshot?.lobby.movedTo ?? null;
  useEffect(() => {
    if (!movedTo) return;
    router.replace({ pathname: '/lobby/[id]', params: { id: movedTo } });
  }, [movedTo]);

  if (!signedIn) {
    return (
      <Screen nav={false} back title={t('lobby.title')}>
        <Card>
          <Body>{t('lobby.signInToJoin')}</Body>
          <Button onPress={() => router.replace('/login')}>{t('lobby.signIn')}</Button>
        </Card>
      </Screen>
    );
  }

  if (lobby.fatal) {
    return (
      <Screen nav={false} back title={t('lobby.unavailable')}>
        <Card>
          <Body>{lobby.fatal}</Body>
          <Button onPress={() => void lobby.refresh()}>{t('lobby.retryConnection')}</Button>
          <Button onPress={() => router.replace(home)}>{homeLabel}</Button>
        </Card>
      </Screen>
    );
  }

  if (!snapshot) {
    return (
      <Screen nav={false} back title={t('lobby.title')}>
        <LudoSpinner style={{ marginVertical: 40 }} />
      </Screen>
    );
  }

  const { lobby: room, challenge, players } = snapshot;
  const joined = countJoined(players);
  const closed = (room.status === 'CANCELLED' || challenge.status === 'EXPIRED') && !room.movedTo;
  const teamRoom = room.teams && room.maxPlayers === 4;
  const seatTaken = (seat: number) =>
    players.some((p) => p.seatIndex === seat && p.status === 'JOINED');
  const canSeek =
    link &&
    teamRoom &&
    identity?.id === room.hostId &&
    room.status === 'WAITING' &&
    !room.seeking &&
    seatTaken(0) &&
    seatTaken(2) &&
    !seatTaken(1) &&
    !seatTaken(3);
  const me = players.find((player) => player.userId === identity?.id) ?? null;
  const isHost = identity?.id === room.hostId;
  const day = ui.scheme === 'light';
  const roomCard = (
    <RoomCard
      room={room}
      players={players}
      lobby={lobby}
      myId={identity?.id ?? null}
      onNavy={day}
    />
  );

  return (
    <Screen
      nav={false}
      back
      title={closed ? t('lobby.closedTitle') : t('lobby.title')}
      subtitle={
        quick
          ? t('lobby.subtitle.quick')
          : link
            ? t('lobby.subtitle.link')
            : t('lobby.subtitle.private')
      }
    >
      {closed ? (
        <Card>
          <Label color={ui.danger}>
            {challenge.status === 'EXPIRED'
              ? link
                ? t('lobby.closed.linkExpired')
                : t('lobby.closed.invitationExpired')
              : quick
                ? t('lobby.closed.tableBrokeUp')
                : link
                  ? t('lobby.closed.gameClosed')
                  : t('lobby.closed.challengeCancelled')}
          </Label>
          <Text style={shared.sectionTitle}>
            {challenge.status === 'EXPIRED'
              ? link
                ? t('lobby.closed.nobodyJoined')
                : t('lobby.closed.nobodyAnswered')
              : link
                ? t('lobby.closed.hostClosed')
                : quick
                  ? t('lobby.closed.someoneLeft')
                  : t('lobby.closed.calledOff')}
          </Text>
          <Body>
            {link
              ? t('lobby.closed.linkBody')
              : challenge.status === 'EXPIRED'
                ? t('lobby.closed.expiredBody')
                : quick
                  ? t('lobby.closed.quickBody')
                  : t('lobby.closed.cancelledBody')}
          </Body>
          <Button onPress={() => router.replace(home)}>{homeLabel}</Button>
        </Card>
      ) : (
        <>
          {link && room.inviteCode && room.status === 'WAITING' && (
            <Card style={{ borderColor: day ? ui.line : `${theme.accent}60`, gap: 12 }}>
              <Label color={theme.accentText}>{t('lobby.invite.label')}</Label>
              <Text
                accessibilityLabel={t('lobby.invite.codeA11y', {
                  code: room.inviteCode.split('').join(' '),
                })}
                selectable
                style={[s.inviteCode, { color: theme.accentText }]}
              >
                {room.inviteCode}
              </Text>
              <Body>
                {room.maxPlayers - joined > 0
                  ? t('lobby.invite.waitingMore', { count: room.maxPlayers - joined })
                  : t('lobby.invite.everyoneHere')}
              </Body>
              <View style={shared.row}>
                <View style={{ flex: 1 }}>
                  <Button compact onPress={() => void shareInvite(room.inviteCode!)}>
                    {t('lobby.invite.share')}
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    compact
                    secondary
                    onPress={() =>
                      void Clipboard.setStringAsync(room.inviteCode!).then(() => setCopied(true))
                    }
                  >
                    {copied ? t('lobby.invite.copied') : t('lobby.invite.copy')}
                  </Button>
                </View>
              </View>
            </Card>
          )}
          {day ? (
            // The page's navy hero (the 30%): the table itself, in night tokens.
            <LinearGradient
              colors={NAVY_HERO}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.hero}
            >
              <SchemeScope scheme="dark">{roomCard}</SchemeScope>
            </LinearGradient>
          ) : (
            <Card style={{ borderColor: `${theme.accent}40`, gap: 16 }}>{roomCard}</Card>
          )}

          <CountdownBanner
            visible={room.status === 'COUNTDOWN'}
            seconds={lobby.countdown}
            accent={theme.accent}
            accentText={theme.accentText}
          />

          {canSeek && (
            <Button disabled={lobby.busy} onPress={() => void lobby.seekOpponents(true)}>
              {t('lobby.findOpponents')}
            </Button>
          )}
          {link && teamRoom && isHost && room.status === 'WAITING' && !room.seeking && !canSeek && (
            <Text style={[shared.small, { textAlign: 'center' }]}>
              {seatTaken(2) ? t('lobby.hostHint.inviteMore') : t('lobby.hostHint.whenJoins')}
            </Text>
          )}

          {room.status === 'WAITING' && me?.status === 'JOINED' && !me.isReady && (
            <Button disabled={lobby.busy} onPress={() => void lobby.setReady(true)}>
              {t('lobby.imReady')}
            </Button>
          )}

          {lobby.error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {lobby.error}
            </Text>
          )}

          {room.status !== 'STARTED' && (
            <Button
              secondary
              disabled={lobby.busy}
              onPress={() => (isHost ? setConfirmCancel(true) : void leaveAndExit())}
            >
              {isHost ? t('lobby.cancelGame') : t('lobby.leaveGame')}
            </Button>
          )}
        </>
      )}

      <Sheet
        visible={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={t('lobby.cancelSheet.title')}
      >
        <Body>{t('lobby.cancelSheet.body')}</Body>
        <Button
          disabled={lobby.busy}
          onPress={() => {
            setConfirmCancel(false);
            void lobby.cancel();
          }}
        >
          {t('lobby.cancelGame')}
        </Button>
        <Button secondary onPress={() => setConfirmCancel(false)}>
          {t('lobby.cancelSheet.keepWaiting')}
        </Button>
      </Sheet>
    </Screen>
  );
}

/**
 * The table: who is seated and what is being played. By day it is drawn
 * inside the navy hero under `SchemeScope scheme="dark"`, so its hooks read
 * the night tokens.
 */
function RoomCard({
  room,
  players,
  lobby,
  myId,
  onNavy,
}: {
  room: NonNullable<ReturnType<typeof useLobby>['snapshot']>['lobby'];
  players: readonly LobbyPlayer[];
  lobby: ReturnType<typeof useLobby>;
  myId: string | null;
  /** Drawn on the day navy hero, whose royal-blue corner is lighter than the night card. */
  onNavy: boolean;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation(['online', 'common']);
  const { variantTitle, variantDescription } = useCatalogText();
  const ui = useUi();
  const s = useStyles();
  const shared = useShared();
  const joined = countJoined(players);
  const teamRoom = room.teams && room.maxPlayers === 4;
  const isHost = myId === room.hostId;
  const waitingFor = players.filter((player) => player.status === 'INVITED');
  const colors = seatColors(room.maxPlayers);
  // The notes' accent colours, kept at 4.5:1 across the whole navy gradient by day.
  const note = (color: string) => (onNavy ? readableOn(color, NAVY_HERO) : color);
  return (
    <>
      <View style={shared.between}>
        <View style={{ gap: 5 }}>
          <Label color={theme.accentText}>
            {room.status === 'STARTED'
              ? t('lobby.state.started')
              : room.status === 'COUNTDOWN'
                ? t('lobby.state.countdown')
                : t('lobby.state.waiting')}
          </Label>
          <Text style={s.count}>{t('lobby.count', { joined, max: room.maxPlayers })}</Text>
          {room.teams && (
            <Text style={{ color: note(ui.gem), fontWeight: '800', fontSize: 13 }}>
              {t('lobby.teamsNote')}
            </Text>
          )}
          {room.variant !== 'classic' && (
            <Text style={{ color: note(ui.blueSoft), fontWeight: '800', fontSize: 13 }}>
              {t('lobby.modeNote', {
                mode: variantTitle(room.variant),
                description: variantDescription(room.variant),
              })}
            </Text>
          )}
          {room.stake > 0 && (
            <Text style={{ color: note(ui.gold), fontWeight: '800', fontSize: 13 }}>
              {t('lobby.stakeNote', {
                stake: room.stake.toLocaleString(numberLocale()),
                prize: tablePrize(room.stake, room.maxPlayers).toLocaleString(numberLocale()),
              })}
            </Text>
          )}
        </View>
        {room.status === 'COUNTDOWN' || room.status === 'STARTED' ? (
          <View style={[s.countdown, { borderColor: theme.accent }]}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[s.countdownText, { color: theme.accentText }]}
            >
              {room.status === 'STARTED' ? '▶' : lobby.countdown || t('lobby.go')}
            </Text>
          </View>
        ) : (
          <LudoSpinner />
        )}
      </View>

      {teamRoom && (
        <TeamSeats
          players={players}
          myId={myId}
          colors={colors}
          palette={theme.colors}
          canMove={room.status === 'WAITING' && !room.seeking && !lobby.busy}
          onMove={(seat) => void lobby.moveSeat(seat)}
        />
      )}
      {teamRoom && room.seeking && (
        <View style={s.seeking}>
          <LiveDot color={ui.green} active />
          <Text style={{ color: ui.green, fontWeight: '800', flex: 1 }}>{t('lobby.seeking')}</Text>
          {isHost && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void lobby.seekOpponents(false)}
              disabled={lobby.busy}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: ui.muted, fontWeight: '800' }}>{t('lobby.stop')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {!teamRoom && (
        <View style={{ gap: 10 }}>
          {players.map((player) => {
            const state = seatState(player, ui);
            const color = theme.colors[colors[player.seatIndex] ?? 'RED'];
            return (
              <View
                key={player.userId}
                style={[s.seat, { opacity: state.muted ? 0.62 : 1, borderLeftColor: color }]}
              >
                <UserAvatar
                  id={player.userId}
                  name={displayNameOf(player)}
                  emoji={player.avatar}
                  presence={player.presence}
                  size={42}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>
                      {displayNameOf(player)}
                    </Text>
                    {player.isHost && (
                      <View style={[s.hostTag, { borderColor: `${theme.accent}55` }]}>
                        <Text style={[s.hostText, { color: theme.accentText }]}>
                          {t('lobby.host')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.status, { color: state.color }]}>
                    {t(`lobby.seat.${state.label}`)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={shared.small}>
        {room.status === 'STARTED'
          ? t('lobby.footer.opening')
          : room.status === 'COUNTDOWN'
            ? t('lobby.footer.starting')
            : waitingFor.length > 0
              ? t('lobby.footer.waitingFor', {
                  names: waitingFor.map(displayNameOf).join(t('lobby.nameJoiner')),
                })
              : t('lobby.footer.waitingReady')}
      </Text>
    </>
  );
}

function CountdownBanner({
  visible,
  seconds,
  accent,
  accentText,
}: {
  visible: boolean;
  seconds: number;
  accent: string;
  /** The accent as readable text on the page. */
  accentText: string;
}) {
  const { t } = useTranslation('online');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const day = ui.scheme === 'light';
  if (!visible) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('lobby.banner.a11y', { seconds })}
      style={[
        s.banner,
        day ? s.bannerDay : { borderColor: `${accent}55`, backgroundColor: `${accent}12` },
      ]}
    >
      {/* By day the countdown is the page's one marigold card, with navy text. */}
      {day && (
        <LinearGradient
          colors={MARIGOLD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.fill}
        />
      )}
      <Text style={[s.bannerNumber, { color: day ? ui.text : accentText }]}>
        {seconds || t('lobby.go')}
      </Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.bannerTitle}>{t('lobby.banner.title')}</Text>
        <Text style={shared.small}>{t('lobby.banner.body')}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((ui) => ({
  hero: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: DARK.border,
    gap: 16,
    boxShadow: liftByDay(ui),
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bannerDay: {
    borderColor: `${ui.gold}55`,
    overflow: 'hidden',
    boxShadow: liftByDay(ui),
  },
  inviteCode: { fontSize: 40, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  count: { color: ui.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
  countdown: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: { fontSize: 22, fontWeight: '900' },
  seeking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10b98155',
    backgroundColor: '#10b98114',
  },
  seat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: ui.line,
    borderLeftWidth: 4,
    backgroundColor: ui.scheme === 'dark' ? '#00000020' : ui.fill,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: ui.text, fontSize: 15.5, fontWeight: '700', flexShrink: 1 },
  hostTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  hostText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  status: { fontSize: 12, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  bannerNumber: { fontSize: 40, fontWeight: '900', minWidth: 46, textAlign: 'center' },
  bannerTitle: { color: ui.text, fontSize: 17, fontWeight: '800' },
}));
