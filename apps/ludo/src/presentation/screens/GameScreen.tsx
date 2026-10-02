import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  isGameVariant,
  mayEnterHome,
  coinsHome,
  coinsToWin,
  standings,
  variantOf,
  type GameVariant,
  controlledColor,
  distinctMoves,
  REWARDS,
  type PlayerColor,
  type Reaction,
} from '@/domain';

import { cleanSeatNames } from '@/application/session/MatchRepository';
import { rewardedAds } from '@/config/container';
import { GameTable } from '../game/GameTable';
import { VictoryScreen } from '../game/VictoryScreen';
import { useGameSounds } from '../audio/useGameSounds';
import { useMatch } from '../hooks/useMatch';
import { useBotReactions, useReactionBubbles } from '../hooks/useReactions';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { useAtBoardPresence } from '../state/SocialProvider';
import { useCatalogText } from '../i18n/useCatalogText';
import OnlineMatchScreen from './OnlineMatchScreen';

export default function GameScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    players?: string;
    difficulty?: string;
    resume?: string;
    session?: string;
    lobby?: string;
    names?: string;
    teams?: string;
    variant?: string;
  }>();
  // A lobby id means the board is shared with other people; everything else
  // is a local game this device owns outright.
  if (params.lobby) return <OnlineMatchScreen key={params.lobby} lobbyId={params.lobby} />;
  return (
    <MatchScreen
      key={params.session ?? params.resume ?? 'match'}
      mode={params.mode}
      players={params.players}
      difficulty={params.difficulty}
      names={params.names}
      teams={params.teams === '1'}
      variant={isGameVariant(params.variant) ? params.variant : 'classic'}
      resume={params.resume === '1'}
    />
  );
}

function MatchScreen({
  mode,
  players,
  difficulty,
  names,
  teams,
  variant,
  resume,
}: {
  mode?: string;
  players?: string;
  difficulty?: string;
  /** JSON from the lobby: pass & play seat names. */
  names?: string;
  /** 2 v 2 partnerships (four seats only). */
  teams: boolean;
  /** Classic, Quick or Kill & Go. */
  variant: GameVariant;
  resume: boolean;
}) {
  const { profile, theme, recordMatch, member, ready } = useProfile();
  const { t } = useTranslation('game');
  const catalog = useCatalogText();
  useAtBoardPresence();
  const { width, height } = useWindowDimensions();
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [tableArea, setTableArea] = useState({ width: 0, height: 0 });
  const [notice, setNotice] = useState<'saveFailed' | 'adIncomplete' | null>(null);
  const [saving, setSaving] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const focused = useIsFocused();
  const seats = Number(players);
  const options = {
    mode: mode === 'local' ? ('local' as const) : ('ai' as const),
    players: ([2, 3, 4, 5, 6, 7, 8] as const).find((n) => n === seats) ?? (4 as const),
    difficulty: difficulty === 'easy' ? ('easy' as const) : ('smart' as const),
  };
  const wantTeams = teams && options.players === 4;
  const seatNames = (() => {
    if (options.mode !== 'local' || !names) return undefined;
    try {
      return cleanSeatNames(JSON.parse(names), options.players);
    } catch {
      return undefined;
    }
  })();
  const motionEnabled = useMotionEnabled(
    profile.reducedMotion,
    focused && !menu && !rules && ready,
  );
  const game = useMatch(
    {
      ...options,
      names: seatNames,
      ...(wantTeams ? { teams: true } : {}),
      ...(variant !== 'classic' ? { variant } : {}),
    },
    resume,
    menu || rules || !focused || !ready,
    motionEnabled,
  );
  useGameSounds(game.feedback, profile.soundEnabled, focused && !menu && !rules, motionEnabled);
  const { match, current, humanTurn, busy } = game;
  const teamGame = match?.state.teams === true;
  // Red is the player against the computer; in 2 v 2 yellow is their partner.
  const redWon = Boolean(
    match &&
    (match.state.winnerColor === 'RED' || (teamGame && match.state.winnerColor === 'YELLOW')),
  );
  // How long this sitting lasted, for the results screen.
  const startedAt = useRef<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const matchState = match?.state.status;
  useEffect(() => {
    if (matchState === 'IN_PROGRESS' && startedAt.current === null) startedAt.current = Date.now();
    if (matchState === 'FINISHED' && startedAt.current !== null)
      setDurationMs(Date.now() - startedAt.current);
  }, [matchState]);
  const seatName = (color: PlayerColor) => match?.options.names?.[color] ?? t(`colors.${color}`);
  const reactionBubbles = useReactionBubbles();
  const againstBots = (match?.options.mode ?? options.mode) === 'ai';
  const isBot = useCallback((color: PlayerColor) => color !== 'RED', []);
  const botAnswer = useBotReactions(match?.state ?? null, isBot, reactionBubbles.show, againstBots);
  const sendReaction = (emoji: Reaction) => {
    reactionBubbles.show('RED', emoji);
    botAnswer(emoji);
  };

  async function finish(again: boolean) {
    if (!match || saving) return;
    setSaving(true);
    try {
      // Reaches the account when it can; otherwise the result is kept on the
      // device and paid the next time the account answers.
      await recordMatch(match.id, redWon, match.options.mode === 'ai', game.getStats());
      if (again)
        router.replace({
          pathname: '/game',
          params: {
            mode: match.options.mode,
            players: String(match.options.players),
            difficulty: match.options.difficulty,
            session: String(Date.now()),
            ...(match.options.names ? { names: JSON.stringify(match.options.names) } : {}),
            ...(match.state.teams ? { teams: '1' } : {}),
            ...(variantOf(match.state) !== 'classic' ? { variant: variantOf(match.state) } : {}),
          },
        });
      else router.replace('/');
    } catch {
      setNotice('saveFailed');
    } finally {
      setSaving(false);
    }
  }

  const playable = distinctMoves(game.moves).length;
  const localTurn = (match?.options.mode ?? options.mode) === 'local' && current;
  const statusLine = !match
    ? ''
    : match.state.status === 'FINISHED'
      ? t('status.finished')
      : busy
        ? game.activity === 'rolling'
          ? t('status.rolling')
          : t('status.moving')
        : match.state.lastRoll !== null
          ? playable > 1
            ? t('status.playableCoins', { count: playable })
            : playable === 1
              ? t('status.onlyOne')
              : humanTurn
                ? match.state.consecutiveSixes === 3
                  ? t('status.threeSixes')
                  : t('status.noMoves')
                : t('status.computerChoosing')
          : humanTurn &&
              teamGame &&
              current &&
              match &&
              controlledColor(match.state) !== current.color
            ? t('status.rollForPartner')
            : humanTurn &&
                current &&
                match &&
                match.state.lastRoll === null &&
                !mayEnterHome(match.state, controlledColor(match.state))
              ? match.options.mode === 'local'
                ? t('status.killFirstNamed', { name: seatName(current.color) })
                : t('status.killFirst')
              : humanTurn
                ? localTurn
                  ? t('status.tapToRollNamed', {
                      name:
                        match?.options.names?.[localTurn.color] ??
                        t(`colorPlayer.${localTurn.color}`),
                    })
                  : t('status.tapToRoll')
                : t('status.computerReady');

  const localGame = (match?.options.mode ?? options.mode) === 'local';
  /** The seat shown as "You": the human's red seat against the computer. */
  const isYou = (color: PlayerColor) => !localGame && color === 'RED';
  function labelFor(color: PlayerColor): string {
    if (localGame) return match?.options.names?.[color] ?? t(`colors.${color}`);
    if (color === 'RED') return t('seat.you');
    if (teamGame)
      return color === 'YELLOW'
        ? t('seat.partner')
        : color === 'GREEN'
          ? t('seat.rival1')
          : t('seat.rival2');
    const index = match?.state.players.findIndex((p) => p.color === color) ?? -1;
    // One opponent is just "Computer"; several are numbered in turn order.
    return (match?.state.players.length ?? 0) > 2 && index > 0
      ? t('seat.computerNumbered', { index })
      : t('seat.computer');
  }

  /** How the board was won, e.g. "All four coins home" (the domain's winLine, translated). */
  function winLineText(state: Parameters<typeof coinsToWin>[0] & { teams?: boolean }): string {
    const goal = coinsToWin(state);
    if (state.teams) return goal === 4 ? t('winLine.allEight') : t('winLine.partners', { goal });
    return goal === 1 ? t('winLine.first') : goal === 2 ? t('winLine.two') : t('winLine.allFour');
  }

  const finished = match?.state.status === 'FINISHED';
  const tableVariant = match ? variantOf(match.state) : null;

  return (
    <GameTable
      game={game}
      label={[
        ...(tableVariant && tableVariant !== 'classic' ? [catalog.variantShort(tableVariant)] : []),
        ...(teamGame ? [t('label.teams')] : []),
        localGame ? t('label.passAndPlay') : t('label.solo'),
      ].join(' · ')}
      prize={
        (match?.options.mode ?? options.mode) === 'ai'
          ? t('prize.win', { count: REWARDS.bot.win.coins })
          : undefined
      }
      statusLine={statusLine}
      seatRotation={(match?.options.mode ?? options.mode) === 'local'}
      seatLabel={labelFor}
      motionEnabled={motionEnabled}
      tableArea={{
        width: tableArea.width || width,
        height: tableArea.height || Math.max(1, height - 128),
      }}
      onTableLayout={setTableArea}
      menu={menu}
      setMenu={setMenu}
      rules={rules}
      setRules={setRules}
      pauseBody={t('pause.body')}
      exitLabel={t('pause.exit')}
      onExit={() => router.replace('/')}
      reactions={againstBots ? { bubbles: reactionBubbles.bubbles, send: sendReaction } : undefined}
      resultSheet={
        match && (
          <VictoryScreen
            visible={finished && !busy}
            outcome={match.options.mode === 'local' || redWon ? 'win' : 'loss'}
            banner={
              match.options.mode === 'local'
                ? t('result.playerWins', {
                    name: seatName(match.state.winnerColor ?? 'RED'),
                  }).toUpperCase()
                : redWon
                  ? teamGame
                    ? t('result.teamVictory')
                    : t('result.victory')
                  : t('result.goodGame')
            }
            subtitle={(match.options.mode === 'ai' && !redWon
              ? t('result.soClose', { mode: catalog.variantTitle(variantOf(match.state)) })
              : t('result.subtitle', {
                  mode: catalog.variantShort(variantOf(match.state)),
                  how: winLineText(match.state),
                })
            ).toUpperCase()}
            standings={standings(match.state).map((color) => ({
              key: color,
              name: isYou(color) ? profile.name : labelFor(color),
              color: theme.colors[color],
              you: match.options.mode === 'ai' && color === 'RED',
              coinsHome: coinsHome(match.state, color),
            }))}
            reward={
              match.options.mode === 'ai' && member
                ? redWon
                  ? REWARDS.bot.win
                  : REWARDS.bot.played
                : null
            }
            note={
              match.options.mode === 'ai' && !member
                ? redWon
                  ? t('result.guestWonNote', { count: REWARDS.bot.win.coins })
                  : t('result.guestLostNote', {
                      count: REWARDS.bot.win.coins,
                      online: REWARDS.online.win.coins,
                    })
                : undefined
            }
            stats={match.options.mode === 'ai' ? game.getStats() : null}
            durationMs={durationMs}
            goal={coinsToWin(match.state)}
            primary={
              // A guest who lost to the computer earns the instant rematch by
              // watching an ad; going home is always free.
              !member && match.options.mode === 'ai' && !redWon && rewardedAds.supported()
                ? {
                    label: adBusy ? t('result.loadingAd') : t('result.watchAdRematch'),
                    busy: saving || adBusy,
                    onPress: () => {
                      if (adBusy) return;
                      setAdBusy(true);
                      void rewardedAds
                        .show()
                        .then((earned) => {
                          if (earned) void finish(true);
                          else setNotice('adIncomplete');
                        })
                        .finally(() => setAdBusy(false));
                    },
                  }
                : { label: t('result.playAgain'), busy: saving, onPress: () => void finish(true) }
            }
            secondary={{
              label:
                !member && match.options.mode === 'ai' && !redWon
                  ? t('result.goHome')
                  : t('result.lobby'),
              onPress: () => void finish(false),
            }}
            shareMessage={
              redWon || match.options.mode === 'local'
                ? match.options.mode === 'local'
                  ? t('result.sharePlayer', {
                      name: seatName(match.state.winnerColor ?? 'RED'),
                      mode: catalog.variantTitle(variantOf(match.state)),
                    })
                  : t('result.shareMine', { mode: catalog.variantTitle(variantOf(match.state)) })
                : undefined
            }
            error={notice && t(`result.${notice}`)}
            motionEnabled={motionEnabled}
          />
        )
      }
    />
  );
}
