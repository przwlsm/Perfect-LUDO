import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MAX_PRIVATE_STAKE,
  parseInviteCode,
  REWARDS,
  type QuickMatchPlayerCount,
  type Stake,
  type GameVariant,
} from '@/domain';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCatalogText } from '../i18n/useCatalogText';
import { challengeRepository } from '@/config/container';
import { ConnectionPill } from '../components/ConnectionPill';
import { Body, Button, Card, Label, Screen, Sheet, useShared } from '../components/Kit';
import { useQuickMatch } from '../hooks/useQuickMatch';
import { StakePicker } from '../components/StakePicker';
import { MatchmakingOverlay } from '../social/MatchmakingOverlay';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { VariantPicker } from '../components/VariantPicker';
import { TeamsToggle } from '../components/TeamsToggle';
import { AccountGateSheet, LOGIN_HREF, SIGN_UP_HREF } from '../social/AccountGate';
import { UserAvatar } from '../social/UserAvatar';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { useAuthSession } from '../state/useAuthSession';
import { LinearGradient } from 'expo-linear-gradient';
import { makeStyles, SchemeScope, useUi } from '../theme/AppearanceProvider';
import { DARK, type Palette } from '../theme/palette';
import { iconTile, liftByDay, MARIGOLD, NAVY_HERO } from '../theme/surfaces';
import { mirrorInRtl } from '../i18n/rtl';
import { LudoSpinner } from '../components/LoaderArt';

const SEATS: readonly QuickMatchPlayerCount[] = [2, 3, 4];

/** The periwinkle of the "more ways to play" icons; by day, a blue that reads on white. */
const periwinkle = (ui: Palette) => (ui.scheme === 'dark' ? '#a7beff' : ui.blueSoft);

/** Our own message (as a key, so it follows the language) or the server's, as written. */
type Problem =
  | { readonly key: 'teamRoomFailed' | 'createFailed' | 'badCode' | 'joinFailed' }
  | { readonly text: string };
const problemFrom = (e: unknown, key: Extract<Problem, { key: unknown }>['key']): Problem =>
  e instanceof Error ? { text: e.message } : { key };

/**
 * The hub for everything that needs a server: quick play for anyone with a
 * connection, friend challenges for members, and the guest/login choice in
 * between. Offline play never comes through here.
 */
export default function OnlinePlayScreen() {
  const { theme, profile } = useProfile();
  const { t } = useTranslation(['online', 'common']);
  const { variantTitle } = useCatalogText();
  const connectivity = useConnectivity();
  const { enabled, signedIn, account, identity } = useSocial();
  const auth = useAuthSession();
  const quick = useQuickMatch();
  const searchMotion = useMotionEnabled(profile.reducedMotion, quick.phase === 'searching');
  const ui = useUi();
  const s = useStyles();
  const shared = useShared();
  // The home screen can open this with a table size, or straight to a private room.
  const params = useLocalSearchParams<{
    seats?: string;
    private?: string;
    teams?: string;
    teamup?: string;
  }>();
  const [seats, setSeats] = useState<QuickMatchPlayerCount>(
    params.seats === '4' ? 4 : params.seats === '3' ? 3 : 2,
  );
  const [stake, setStake] = useState<Stake>(0);
  const [privateStake, setPrivateStake] = useState<Stake>(0);
  const [variant, setVariant] = useState<GameVariant>('classic');
  const [privateVariant, setPrivateVariant] = useState<GameVariant>('classic');
  const [teams, setTeams] = useState(params.teams === '1');
  const [teamUpBusy, setTeamUpBusy] = useState(false);
  const [teamUpError, setTeamUpError] = useState<Problem | null>(null);
  const teamUpStarted = useRef(false);
  const [privateTeams, setPrivateTeams] = useState(false);
  const [gate, setGate] = useState<'challenges' | null>(null);
  // Private game by invite link: pick a table size and share, or join by code.
  const [privateOpen, setPrivateOpen] = useState(params.private === '1');
  const [privateSeats, setPrivateSeats] = useState<QuickMatchPlayerCount>(2);
  const [codeInput, setCodeInput] = useState('');
  const [privateBusy, setPrivateBusy] = useState(false);
  const [privateError, setPrivateError] = useState<Problem | null>(null);
  const problemText = (p: Problem) => ('key' in p ? t(`errors.${p.key}`) : p.text);

  /**
   * Closes the sheet first and moves on once it has gone: an Android dialog
   * still closing when the next screen opens can be left showing on return.
   */
  function openRoom(lobbyId: string) {
    setPrivateOpen(false);
    setTimeout(() => router.push({ pathname: '/lobby/[id]', params: { id: lobbyId } }), 250);
  }

  /** 2 v 2 with a friend: a team room with an invite code, ready to search together. */
  async function teamUp() {
    if (!challengeRepository || teamUpBusy) return;
    setTeamUpBusy(true);
    setTeamUpError(null);
    try {
      const room = await challengeRepository.createLinkRoom(4, stake, variant, true);
      openRoom(room.lobbyId);
    } catch (e) {
      setTeamUpError(problemFrom(e, 'teamRoomFailed'));
    } finally {
      setTeamUpBusy(false);
    }
  }

  async function createPrivate() {
    if (!challengeRepository || privateBusy) return;
    setPrivateBusy(true);
    setPrivateError(null);
    try {
      const room = await challengeRepository.createLinkRoom(
        privateSeats,
        privateStake,
        privateVariant,
        privateTeams && privateSeats === 4,
      );
      openRoom(room.lobbyId);
    } catch (e) {
      setPrivateError(problemFrom(e, 'createFailed'));
    } finally {
      setPrivateBusy(false);
    }
  }

  async function joinByCode() {
    if (!challengeRepository || privateBusy) return;
    const code = parseInviteCode(codeInput);
    if (!code) {
      setPrivateError({ key: 'badCode' });
      return;
    }
    setPrivateBusy(true);
    setPrivateError(null);
    try {
      const lobbyId = await challengeRepository.joinLinkRoom(code);
      setCodeInput('');
      openRoom(lobbyId);
    } catch (e) {
      setPrivateError(problemFrom(e, 'joinFailed'));
    } finally {
      setPrivateBusy(false);
    }
  }

  // The home screen's "2 v 2 with a friend" opens straight into a team room.
  useEffect(() => {
    if (params.teamup !== '1' || teamUpStarted.current) return;
    if (!signedIn || !connectivity.online || !challengeRepository) return;
    teamUpStarted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arriving from the home shortcut is the trigger
    void teamUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.teamup, signedIn, connectivity.online]);

  const lobbyId = quick.phase === 'matched' ? quick.ticket?.lobbyId : null;
  useEffect(() => {
    if (!lobbyId) return;
    router.replace({ pathname: '/lobby/[id]', params: { id: lobbyId } });
  }, [lobbyId]);

  if (!enabled || !connectivity.available) {
    return (
      <Screen title={t('play.title')} subtitle={t('play.subtitle')}>
        <Card>
          <Body>{t('play.noServer')}</Body>
          <Button onPress={() => router.replace('/')}>{t('backToGame')}</Button>
        </Card>
      </Screen>
    );
  }

  if (!connectivity.online) {
    return (
      <Screen title={t('play.title')} subtitle={t('play.subtitle')}>
        <Card>
          <ConnectionPill large />
          <Text style={shared.sectionTitle}>{t('play.unavailable.title')}</Text>
          <Body>
            {connectivity.state === 'OFFLINE'
              ? t('play.unavailable.offline')
              : connectivity.state === 'SERVER_UNAVAILABLE'
                ? t('play.unavailable.server')
                : t('play.unavailable.connecting', {
                    status: t(`common:connection.${connectivity.state}`),
                  })}
          </Body>
          <Button secondary onPress={() => void connectivity.refresh()}>
            {t('tryAgain')}
          </Button>
          <Button onPress={() => router.replace('/')}>{t('play.unavailable.playOffline')}</Button>
        </Card>
      </Screen>
    );
  }

  if (!signedIn) {
    return (
      <Screen title={t('play.choose.title')} subtitle={t('play.choose.subtitle')}>
        <Card style={{ borderColor: `${theme.accent}40` }}>
          <ConnectionPill large />
          <Text style={shared.sectionTitle}>{t('play.choose.heading')}</Text>
          <Body>{t('play.choose.body')}</Body>
          <Button disabled={auth.busy} onPress={() => void auth.continueAsGuest()}>
            {auth.busy ? t('settingUpSeat') : t('continueAsGuest')}
          </Button>
          <Button secondary disabled={auth.busy} onPress={() => router.push(LOGIN_HREF)}>
            {t('loginSignUp')}
          </Button>
          {auth.error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {auth.error}
            </Text>
          )}
        </Card>
      </Screen>
    );
  }

  const name = identity?.displayName?.trim() || profile.name;
  const searching = quick.phase === 'searching';
  const day = ui.scheme === 'light';
  // By day the "more ways to play" glyphs and team options sit on solid game-colour tiles.
  const moreTile = iconTile(DARK.blue, ui);
  const inviteTile = iconTile(DARK.green, ui);
  const teamTile = iconTile(DARK.gem, ui);
  const searchLine = () => {
    const values = {
      count: seats,
      mode: variantTitle(variant),
      stake,
      waiting: quick.ticket?.waiting ?? 1,
    };
    if (variant !== 'classic')
      return stake > 0 ? t('play.quick.tableModeStake', values) : t('play.quick.tableMode', values);
    return stake > 0 ? t('play.quick.tableStake', values) : t('play.quick.table', values);
  };
  const quickPlay = (
    <QuickPlayBody
      quick={quick}
      searchLine={searchLine}
      seats={seats}
      onSeats={setSeats}
      variant={variant}
      onVariant={setVariant}
      teams={teams}
      onTeams={setTeams}
      stake={stake}
      onStake={setStake}
    />
  );

  return (
    <Screen title={t('play.title')} subtitle={t('play.subtitle')}>
      <Card>
        <View style={shared.between}>
          <View style={[shared.row, { flex: 1 }]}>
            <UserAvatar
              id={identity?.id ?? 'me'}
              name={name}
              emoji={identity?.avatar ?? null}
              size={44}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.welcome} numberOfLines={1}>
                {t('play.welcome', { name })}
              </Text>
              <Text style={shared.small}>
                {account === 'guest'
                  ? t('play.guestHandle', { username: identity?.username ?? 'guest' })
                  : identity
                    ? identity.publicId
                      ? t('play.handleWithId', {
                          username: identity.username,
                          id: identity.publicId,
                        })
                      : t('play.handle', { username: identity.username })
                    : t('play.settingUpProfile')}
              </Text>
            </View>
          </View>
          <ConnectionPill large />
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('play.tournament.a11y')}
        onPress={() => router.push('/tournament')}
        android_ripple={{ color: `${theme.accent}30` }}
        style={[s.tourney, { borderColor: day ? `${ui.gold}55` : `${theme.accent}55` }]}
      >
        {/* By day the tournament is the page's one marigold card, with navy text. */}
        {day && (
          <LinearGradient
            colors={MARIGOLD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fill}
          />
        )}
        <View style={[s.tourneyIcon, day ? s.well : { backgroundColor: `${theme.accent}22` }]}>
          <Ionicons name="trophy" size={22} color={day ? ui.text : theme.accentText} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.tourneyTitle}>{t('play.tournament.title')}</Text>
          <Text style={shared.small}>
            {t('play.tournament.body', { coins: REWARDS.online.win.coins })}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          style={mirrorInRtl}
          size={20}
          color={day ? ui.text : ui.subtle}
        />
      </Pressable>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>{t('play.quick.title')}</Text>
        {day ? (
          // The page's navy hero (the 30%): its content takes the night tokens.
          <LinearGradient
            colors={NAVY_HERO}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <SchemeScope scheme="dark">{quickPlay}</SchemeScope>
          </LinearGradient>
        ) : (
          <Card style={{ borderColor: `${theme.accent}40` }}>{quickPlay}</Card>
        )}
      </View>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>{t('play.teams.title')}</Text>
        <Card style={{ gap: 12, borderColor: day ? ui.line : `${ui.gem}55` }}>
          <Text style={shared.small}>{t('play.teams.body')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('play.teams.random')}
            accessibilityHint={t('play.teams.randomHint')}
            disabled={!quick.available || searching}
            onPress={() => {
              setSeats(4);
              setTeams(true);
              void quick.start(4, stake, variant, true);
            }}
            android_ripple={{ color: `${ui.gem}30` }}
            style={({ pressed }) => [
              s.option,
              { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {day ? (
              <View style={[s.tile, { backgroundColor: teamTile.background }]}>
                <Ionicons name="shuffle" size={22} color={teamTile.icon} />
              </View>
            ) : (
              <Ionicons name="shuffle" size={26} color={ui.gem} />
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.optionTitle}>{t('play.teams.random')}</Text>
              <Text style={shared.small}>{t('play.teams.randomBody')}</Text>
            </View>
            <Text style={[s.arrow, { color: ui.gem }]}>↗</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('play.teams.friend')}
            accessibilityHint={t('play.teams.friendHint')}
            disabled={teamUpBusy}
            onPress={() => void teamUp()}
            android_ripple={{ color: `${ui.gem}30` }}
            style={({ pressed }) => [
              s.option,
              { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {day ? (
              <View style={[s.tile, { backgroundColor: teamTile.background }]}>
                <Ionicons name="people" size={22} color={teamTile.icon} />
              </View>
            ) : (
              <Ionicons name="people" size={26} color={ui.gem} />
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.optionTitle}>
                {teamUpBusy ? t('play.teams.creating') : t('play.teams.friend')}
              </Text>
              <Text style={shared.small}>{t('play.teams.friendBody')}</Text>
            </View>
            <Text style={[s.arrow, { color: ui.gem }]}>↗</Text>
          </Pressable>
          {teamUpError && <Text style={shared.error}>{problemText(teamUpError)}</Text>}
          <Text style={shared.small}>{t('play.teams.usesAbove')}</Text>
        </Card>
      </View>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>{t('play.more.title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            account === 'guest' ? t('play.more.challengeA11yGuest') : t('play.more.challengeA11y')
          }
          onPress={() => (account === 'member' ? router.push('/friends') : setGate('challenges'))}
          android_ripple={{ color: `${periwinkle(ui)}30` }}
          style={({ pressed }) => [
            s.option,
            s.optionLift,
            { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {day ? (
            <View style={[s.tile, { backgroundColor: moreTile.background }]}>
              <Text style={[s.tileGlyph, { color: moreTile.icon }]}>⚈⚈</Text>
            </View>
          ) : (
            <Text style={s.optionIcon}>⚈⚈</Text>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.optionTitle}>
              {t('play.more.challenge')} {account === 'guest' ? '🔒' : ''}
            </Text>
            <Text style={shared.small}>
              {account === 'guest' ? t('play.more.challengeGuest') : t('play.more.challengeMember')}
            </Text>
          </View>
          <Text style={[s.arrow, { color: theme.accentText }]}>↗</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('play.more.privateA11y')}
          onPress={() => {
            setPrivateError(null);
            setPrivateOpen(true);
          }}
          android_ripple={{ color: `${theme.accent}30` }}
          style={({ pressed }) => [
            s.option,
            s.optionLift,
            { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {day ? (
            <View style={[s.tile, { backgroundColor: inviteTile.background }]}>
              <Text style={[s.tileGlyph, { color: inviteTile.icon }]}>✉</Text>
            </View>
          ) : (
            <Text style={s.optionIcon}>✉</Text>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.optionTitle}>{t('play.more.private')}</Text>
            <Text style={shared.small}>{t('play.more.privateBody')}</Text>
          </View>
          <Text style={[s.arrow, { color: theme.accentText }]}>↗</Text>
        </Pressable>
      </View>

      {account === 'guest' && (
        <Card>
          <Label color={theme.accentText}>{t('play.guest.label')}</Label>
          <Text style={shared.sectionTitle}>
            {profile.games > 0
              ? t('play.guest.played', { count: profile.games })
              : t('play.guest.likeIt')}
          </Text>
          <Body>{t('play.guest.body')}</Body>
          <Button onPress={() => router.push(SIGN_UP_HREF)}>{t('play.guest.signUp')}</Button>
          <Button secondary compact onPress={() => router.push(LOGIN_HREF)}>
            {t('play.guest.login')}
          </Button>
        </Card>
      )}

      <MatchmakingOverlay
        visible={searching || quick.phase === 'matched'}
        matched={quick.phase === 'matched'}
        seats={seats}
        variant={variant}
        teams={teams && seats === 4}
        stake={stake}
        waiting={quick.ticket?.waiting ?? null}
        you={{ id: identity?.id ?? 'me', name, avatar: identity?.avatar ?? null }}
        error={quick.error}
        motionEnabled={searchMotion}
        onCancel={() => void quick.cancel()}
      />
      <AccountGateSheet
        feature={gate === null ? null : t('play.more.challengeFeature')}
        visible={gate !== null}
        onClose={() => setGate(null)}
      />
      <Sheet
        visible={privateOpen}
        onClose={() => {
          if (!privateBusy) setPrivateOpen(false);
        }}
        title={t('play.private.title')}
      >
        <Label color={theme.accentText}>{t('play.private.startLabel')}</Label>
        <Body>{t('play.private.body')}</Body>
        <View style={shared.row}>
          {SEATS.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={t('play.seatsA11y', { count: n })}
              accessibilityState={{ selected: n === privateSeats }}
              onPress={() => setPrivateSeats(n)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.choice,
                { backgroundColor: theme.surface },
                n === privateSeats && { borderColor: theme.accent },
              ]}
            >
              <Text style={s.choiceText}>{n}</Text>
              <Text style={{ color: ui.muted, fontSize: 9 }}>{t('play.playersUnit')}</Text>
            </Pressable>
          ))}
        </View>
        <VariantPicker value={privateVariant} onChange={setPrivateVariant} />
        {privateSeats === 4 && <TeamsToggle value={privateTeams} onChange={setPrivateTeams} />}
        <StakePicker
          value={privateStake}
          players={privateSeats}
          maxStake={MAX_PRIVATE_STAKE}
          onChange={setPrivateStake}
        />
        <Button disabled={privateBusy} onPress={() => void createPrivate()}>
          {privateBusy ? t('play.private.working') : t('play.private.create')}
        </Button>
        <Label color={theme.accentText}>{t('play.private.haveCode')}</Label>
        <Text style={shared.small}>{t('play.private.codeHint')}</Text>
        <TextInput
          accessibilityLabel={t('play.private.codeA11y')}
          value={codeInput}
          onChangeText={(text) => {
            setCodeInput(text);
            setPrivateError(null);
          }}
          editable={!privateBusy}
          placeholder={t('play.private.codePlaceholder')}
          placeholderTextColor={ui.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void joinByCode()}
          style={s.codeInput}
        />
        <Button
          secondary
          disabled={privateBusy || !codeInput.trim()}
          onPress={() => void joinByCode()}
        >
          {t('play.private.join')}
        </Button>
        {privateError && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {problemText(privateError)}
          </Text>
        )}
      </Sheet>
    </Screen>
  );
}

/**
 * Quick play: the table picker, or the running search. By day it is drawn
 * inside a navy hero under `SchemeScope scheme="dark"`, so its hooks read
 * the night tokens; by night it sits in a plain card as before.
 */
function QuickPlayBody({
  quick,
  searchLine,
  seats,
  onSeats,
  variant,
  onVariant,
  teams,
  onTeams,
  stake,
  onStake,
}: {
  quick: ReturnType<typeof useQuickMatch>;
  searchLine(): string;
  seats: QuickMatchPlayerCount;
  onSeats(seats: QuickMatchPlayerCount): void;
  variant: GameVariant;
  onVariant(variant: GameVariant): void;
  teams: boolean;
  onTeams(teams: boolean): void;
  stake: Stake;
  onStake(stake: Stake): void;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation(['online', 'common']);
  const ui = useUi();
  const s = useStyles();
  const shared = useShared();
  if (quick.phase === 'searching' || quick.phase === 'matched')
    return (
      <>
        <View style={shared.row}>
          <LudoSpinner />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={shared.sectionTitle}>
              {quick.phase === 'matched' ? t('play.quick.found') : t('play.quick.finding')}
            </Text>
            <Text style={shared.small}>
              {quick.phase === 'matched' ? t('play.quick.taking') : searchLine()}
            </Text>
          </View>
        </View>
        <Body>{t('play.quick.keepOpen')}</Body>
        {quick.error && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {quick.error}
          </Text>
        )}
        <Button secondary onPress={() => void quick.cancel()}>
          {t('cancelSearch')}
        </Button>
      </>
    );
  return (
    <>
      <Label color={theme.accentText}>{t('play.quick.noFriendsNeeded')}</Label>
      <Text style={shared.sectionTitle}>{t('play.quick.findNow')}</Text>
      <Body>{t('play.quick.seatedWith')}</Body>
      <Label>{t('play.tableSize')}</Label>
      <View style={shared.row}>
        {SEATS.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={t('play.seatsA11y', { count: n })}
            accessibilityState={{ selected: n === seats }}
            onPress={() => onSeats(n)}
            android_ripple={{ color: `${theme.accent}30` }}
            style={[
              s.choice,
              { backgroundColor: theme.surface },
              n === seats && { borderColor: theme.accent },
            ]}
          >
            <Text style={s.choiceText}>{n}</Text>
            <Text style={{ color: ui.muted, fontSize: 9 }}>{t('play.playersUnit')}</Text>
          </Pressable>
        ))}
      </View>
      <Label>{t('play.gameMode')}</Label>
      <VariantPicker value={variant} onChange={onVariant} />
      {seats === 4 && <TeamsToggle value={teams} onChange={onTeams} />}
      <Label>{t('play.entry')}</Label>
      <StakePicker value={stake} players={seats} onChange={onStake} />
      {quick.error && (
        <Text accessibilityLiveRegion="polite" style={shared.error}>
          {quick.error}
        </Text>
      )}
      <Button
        disabled={!quick.available}
        onPress={() => void quick.start(seats, stake, variant, teams && seats === 4)}
      >
        {t('play.quick.start')}
      </Button>
    </>
  );
}

const useStyles = makeStyles((ui) => ({
  tourney: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: ui.scheme === 'dark' ? 'visible' : 'hidden',
    // Night: a warm gold wash. Day: marigold, drawn by a gradient behind the content.
    backgroundColor: ui.scheme === 'dark' ? '#2a2210' : MARIGOLD[1],
    boxShadow: liftByDay(ui),
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  /** A frosted well on the marigold card. */
  well: { backgroundColor: `${ui.background}b3` },
  hero: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: DARK.border,
    gap: 14,
    boxShadow: liftByDay(ui),
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGlyph: { fontSize: 18, fontWeight: '800' },
  optionLift: { boxShadow: liftByDay(ui) },
  tourneyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourneyTitle: { color: ui.text, fontSize: 16, fontWeight: '800' },
  codeInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    backgroundColor: ui.scheme === 'dark' ? '#00000020' : ui.fill,
    color: ui.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: 14,
  },
  welcome: { color: ui.text, fontSize: 19, fontWeight: '800' },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },
  choiceText: { color: ui.text, fontSize: 15, fontWeight: '800' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.line,
  },
  optionIcon: { fontSize: 22, color: periwinkle(ui), width: 34, textAlign: 'center' },
  optionTitle: { color: ui.text, fontSize: 16, fontWeight: '800' },
  arrow: { fontSize: 22 },
}));
