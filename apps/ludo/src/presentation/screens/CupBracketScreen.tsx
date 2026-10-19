import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { cupEntryName, getCup, type CupBracket, type CupEntry, type CupRound } from '@/domain';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { LudoLoader } from '../components/LudoLoader';
import { Pulse } from '../components/Live';
import { ProgressBar } from '../components/Progress';
import { ThroneArt } from '../collection/ThroneArt';
import { UserAvatar } from '../social/UserAvatar';
import { shareCupInvite } from '../social/cupInviteLink';
import { useCupBracket } from '../hooks/useCups';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';
import { numberLocale } from '../i18n/format';

/**
 * One cup bracket: the four seats filling, the two semi-finals and the
 * final with their tables, and the throne at the end. When this player's
 * round has a table, the screen takes them to it.
 */
export default function CupBracketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, theme } = useProfile();
  const { identity } = useSocial();
  const { t } = useTranslation(['cups', 'collection', 'common']);
  const bracket = useCupBracket(id ?? null);
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const [now, setNow] = useState(() => Date.now());
  const me = identity?.id ?? null;
  const data = bracket.data;
  const def = data ? getCup(data.cup) : null;

  // A ticking clock for the wait.
  useEffect(() => {
    if (data?.status !== 'WAITING') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data?.status]);

  // My round's table: once it exists and is not over, go and sit down.
  const myRound = data?.rounds.find(
    (r) => (r.a === me || r.b === me) && r.winner === null && r.lobbyId !== null,
  );
  const sentTo = useRef<string | null>(null);
  useEffect(() => {
    if (
      !myRound?.lobbyId ||
      myRound.matchStatus === 'FINISHED' ||
      myRound.matchStatus === 'ABANDONED'
    )
      return;
    if (sentTo.current === myRound.lobbyId) return;
    sentTo.current = myRound.lobbyId;
    const lobby = myRound.lobbyId;
    const timer = setTimeout(
      () => router.push({ pathname: '/lobby/[id]', params: { id: lobby } }),
      900,
    );
    return () => clearTimeout(timer);
  }, [myRound?.lobbyId, myRound?.matchStatus]);

  const title = def ? t(`collection:halls.${def.id}`) : t('bracket.title');
  if (!data || !def)
    return (
      <Screen back title={title} subtitle={t('subtitle')}>
        {bracket.error ? (
          <Card>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {bracket.error}
            </Text>
            <Button secondary compact onPress={() => router.replace('/cups')}>
              {t('bracket.backToCups')}
            </Button>
          </Card>
        ) : (
          <LudoLoader motionEnabled={motion} label={t('bracket.loading')} />
        )}
      </Screen>
    );

  const entryOf = (uid: string | null) => data.entries.find((e) => e.userId === uid);
  const nameOf = (uid: string | null) =>
    uid === me ? t('bracket.you') : (cupEntryName(entryOf(uid)) ?? t('common:defaultPlayerName'));
  const semis = data.rounds.filter((r) => r.round === 1);
  const final = data.rounds.find((r) => r.round === 2) ?? null;
  const fillMs = Math.max(0, new Date(data.fillAt).getTime() - now);
  const iAmIn = data.entries.some((e) => e.userId === me);
  const iWon = data.winner === me;
  const iAmRunnerUp = data.runnerUp === me;
  const fmt = (n: number) => n.toLocaleString(numberLocale());

  return (
    <Screen back title={title} subtitle={t(`collection:throneNames.${def.id}`)}>
      {/* ---- Waiting for seats ---- */}
      {data.status === 'WAITING' && (
        <Card style={{ borderColor: `${theme.accent}55` }}>
          <Label color={theme.accentText}>
            {data.isPrivate ? t('private.waitingTitle') : t('bracket.waitingTitle')}
          </Label>
          {data.isPrivate && data.inviteCode && (
            <>
              <Text
                accessibilityLabel={t('private.code', {
                  code: data.inviteCode.split('').join(' '),
                })}
                style={[s.code, { color: theme.accentText }]}
              >
                {data.inviteCode}
              </Text>
              <Button compact onPress={() => void shareCupInvite(data.inviteCode!)}>
                {t('private.share')}
              </Button>
            </>
          )}
          <View style={s.seats}>
            {[0, 1, 2, 3].map((seat) => (
              <SeatChip key={seat} entry={data.entries.find((e) => e.seat === seat)} me={me} />
            ))}
          </View>
          <ProgressBar value={data.entries.length / 4} height={8} tone="blue" />
          <Body>{data.isPrivate ? t('private.waitingBody') : t('bracket.waitingBody')}</Body>
          {data.isPrivate ? (
            data.host === me ? (
              <Button
                disabled={bracket.busy || data.entries.length < 2}
                onPress={() => void bracket.startPrivate()}
              >
                {t('private.start', { count: data.entries.length })}
              </Button>
            ) : (
              <Text style={shared.small}>{t('private.hostStarts')}</Text>
            )
          ) : (
            <Text style={shared.small}>
              {t('bracket.fillIn', { time: `${Math.ceil(fillMs / 1000)}s` })}
            </Text>
          )}
          {iAmIn && (
            <Button
              secondary
              compact
              disabled={bracket.busy}
              onPress={() => void bracket.leave().then((left) => left && router.replace('/cups'))}
            >
              {data.isPrivate && data.host === me ? t('private.cancel') : t('bracket.leave')}
            </Button>
          )}
        </Card>
      )}

      {/* ---- The result ---- */}
      {data.status === 'FINISHED' && (
        <Card style={{ ...s.result, borderColor: `${ui.gold}66` }}>
          <ThroneArt cup={def} won size={110} shine={motion} />
          <Text style={[shared.sectionTitle, { textAlign: 'center' }]}>
            {iWon
              ? t('bracket.youWon', { throne: t(`collection:throneNames.${def.id}`) })
              : t('bracket.champion', { name: nameOf(data.winner) })}
          </Text>
          {iWon && (
            <Text style={[s.prize, { color: ui.gold }]}>
              {data.isPrivate
                ? t('bracket.prize', { coins: fmt(data.pot) })
                : data.prizePaid
                  ? t('bracket.prize', { coins: fmt(def.prize) })
                  : t('bracket.capReached')}
            </Text>
          )}
          {iWon && !data.isPrivate && data.prizePaid && def.gems > 0 && (
            <Text style={[s.prize, { color: ui.scheme === 'dark' ? '#e9d5ff' : ui.violet }]}>
              {t('bracket.gemsPrize', { gems: def.gems })}
            </Text>
          )}
          {iAmRunnerUp && <Text style={shared.small}>{t('bracket.runnerUpPrize')}</Text>}
          {iAmIn && !iWon && !iAmRunnerUp && <Body>{t('bracket.knockedOut')}</Body>}
          {iWon && (
            <Button onPress={() => router.replace('/collection')}>{t('bracket.seeRoom')}</Button>
          )}
          <Button secondary onPress={() => router.replace('/cups')}>
            {t('bracket.backToCups')}
          </Button>
        </Card>
      )}

      {/* ---- My table is ready ---- */}
      {data.status === 'PLAYING' && myRound?.lobbyId && (
        <Pulse active={motion}>
          <Card style={{ borderColor: theme.accent }}>
            <Text style={shared.sectionTitle}>{t('bracket.tableReady')}</Text>
            <Button
              onPress={() =>
                router.push({ pathname: '/lobby/[id]', params: { id: myRound.lobbyId! } })
              }
            >
              {t('bracket.goToTable')}
            </Button>
          </Card>
        </Pulse>
      )}

      {/* ---- The tree ---- */}
      {data.status !== 'WAITING' && (
        <>
          <Label color={theme.accentText}>{t('bracket.semis')}</Label>
          {semis.map((r) => (
            <RoundCard key={`${r.round}-${r.slot}`} round={r} data={data} me={me} nameOf={nameOf} />
          ))}
          <Label color={theme.accentText}>{t('bracket.final')}</Label>
          {final ? (
            <RoundCard round={final} data={data} me={me} nameOf={nameOf} />
          ) : (
            <Card>
              <Body>{t('bracket.pending')}</Body>
            </Card>
          )}
        </>
      )}
      {bracket.error && (
        <Text accessibilityLiveRegion="polite" style={shared.error}>
          {bracket.error}
        </Text>
      )}
    </Screen>
  );
}

function SeatChip({ entry, me }: { entry: CupEntry | undefined; me: string | null }) {
  const { t } = useTranslation(['cups', 'common']);
  const s = useStyles();
  const ui = useUi();
  if (!entry)
    return (
      <View style={[s.seat, s.seatOpen]}>
        <Ionicons name="person-add" size={18} color={ui.subtle} />
        <Text style={s.seatName}>{t('bracket.openSeat')}</Text>
      </View>
    );
  const name =
    entry.userId === me ? t('bracket.you') : (cupEntryName(entry) ?? t('common:defaultPlayerName'));
  return (
    <View style={s.seat}>
      <UserAvatar id={entry.userId} name={name} emoji={entry.avatar} size={36} />
      <Text style={s.seatName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function RoundCard({
  round,
  data,
  me,
  nameOf,
}: {
  round: CupRound;
  data: CupBracket;
  me: string | null;
  nameOf: (uid: string | null) => string;
}) {
  const { t } = useTranslation('cups');
  const { theme } = useProfile();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const mine = round.a === me || round.b === me;
  const status =
    round.winner !== null
      ? null
      : round.matchStatus === 'IN_PROGRESS' || round.lobbyId
        ? t('bracket.playing')
        : t('bracket.pending');
  const side = (uid: string) => {
    const entry = data.entries.find((e) => e.userId === uid);
    const won = round.winner === uid;
    const lost = round.winner !== null && !won;
    return (
      <View style={[s.side, lost && { opacity: 0.45 }]}>
        <UserAvatar id={uid} name={nameOf(uid)} emoji={entry?.avatar ?? null} size={40} />
        <Text style={[s.sideName, uid === me && { color: theme.accentText }]} numberOfLines={1}>
          {nameOf(uid)}
        </Text>
        {won && (
          <View style={[s.tag, { backgroundColor: ui.gold }]}>
            <Text style={s.tagText}>{t('bracket.won')}</Text>
          </View>
        )}
      </View>
    );
  };
  // Any live table of my cup that I am not playing at can be watched.
  const watchable =
    !mine &&
    round.winner === null &&
    round.lobbyId !== null &&
    round.matchStatus === 'IN_PROGRESS' &&
    data.entries.some((e) => e.userId === me);
  return (
    <Card style={StyleSheet.flatten([s.roundCard, mine && { borderColor: `${theme.accent}66` }])}>
      <View style={s.round}>
        {side(round.a)}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={s.vs}>{t('bracket.vs')}</Text>
          {status && <Text style={shared.small}>{status}</Text>}
        </View>
        {side(round.b)}
      </View>
      {watchable && (
        <Button
          secondary
          compact
          onPress={() =>
            router.push({
              pathname: '/cups/watch/[lobby]',
              params: { lobby: round.lobbyId!, bracket: data.id },
            })
          }
        >
          {t('watch.button')}
        </Button>
      )}
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  seats: { flexDirection: 'row', gap: 8 },
  seat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.fill,
  },
  seatOpen: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  seatName: { color: ui.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  roundCard: { gap: 10, boxShadow: liftByDay(ui) },
  round: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  sideName: { color: ui.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  vs: { color: ui.subtle, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  tag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { color: '#1f1500', fontSize: 10, fontWeight: '900' },
  result: { alignItems: 'center', gap: 12 },
  code: { fontSize: 34, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  prize: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
}));
