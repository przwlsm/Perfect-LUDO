import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import {
  isGameVariant,
  mayEnterHome,
  VARIANT_INFO,
  coinsHome,
  coinsToWin,
  standings,
  variantOf,
  winLine,
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
  useAtBoardPresence();
  const { width, height } = useWindowDimensions();
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [tableArea, setTableArea] = useState({ width: 0, height: 0 });
  const [notice, setNotice] = useState<string | null>(null);
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
  const seatName = (color: PlayerColor) =>
    match?.options.names?.[color] ?? color.charAt(0) + color.slice(1).toLowerCase();
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
      setNotice('Could not save your result. Tap again to retry.');
    } finally {
      setSaving(false);
    }
  }

  const statusLine = !match
    ? ''
    : match.state.status === 'FINISHED'
      ? 'A good game, well played.'
      : busy
        ? game.activity === 'rolling'
          ? 'Rolling the dice...'
          : 'Moving the coins...'
        : match.state.lastRoll !== null
          ? distinctMoves(game.moves).length > 1
            ? `${distinctMoves(game.moves).length} playable coins - tap a bouncing coin`
            : distinctMoves(game.moves).length === 1
              ? 'Only one move - playing it for you...'
              : humanTurn
                ? match.state.consecutiveSixes === 3
                  ? 'Three sixes! Your turn passes.'
                  : 'No moves this time. Passing the dice…'
                : 'Computer is choosing a move…'
          : humanTurn &&
              teamGame &&
              current &&
              match &&
              controlledColor(match.state) !== current.color
            ? 'Your coins are home - roll for your partner!'
            : humanTurn &&
                current &&
                match &&
                match.state.lastRoll === null &&
                !mayEnterHome(match.state, controlledColor(match.state))
              ? `${match.options.mode === 'local' ? `${seatName(current.color)}, ` : ''}roll - capture a coin to open your home path`
              : humanTurn
                ? `${(match?.options.mode ?? options.mode) === 'local' && current ? (match?.options.names?.[current.color] ?? current.color.toLowerCase() + ' player') + ', ' : ''}tap the dice to roll`
                : 'Computer is getting ready…';

  function labelFor(color: PlayerColor): string {
    if ((match?.options.mode ?? options.mode) === 'local')
      return match?.options.names?.[color] ?? color.charAt(0) + color.slice(1).toLowerCase();
    if (color === 'RED') return 'You';
    if (teamGame) return color === 'YELLOW' ? 'Partner' : color === 'GREEN' ? 'Rival 1' : 'Rival 2';
    const index = match?.state.players.findIndex((p) => p.color === color) ?? -1;
    // One opponent is just "Computer"; several are numbered in turn order.
    return (match?.state.players.length ?? 0) > 2 && index > 0 ? `Computer ${index}` : 'Computer';
  }

  const finished = match?.state.status === 'FINISHED';
  const variantName = match ? VARIANT_INFO[variantOf(match.state)] : null;

  return (
    <GameTable
      game={game}
      label={
        (match && variantOf(match.state) !== 'classic'
          ? `${VARIANT_INFO[variantOf(match.state)].short} · `
          : '') +
        (teamGame ? '2 V 2 · ' : '') +
        ((match?.options.mode ?? options.mode) === 'local' ? 'PASS & PLAY' : 'SOLO TABLE')
      }
      prize={
        (match?.options.mode ?? options.mode) === 'ai'
          ? `Win: +${REWARDS.bot.win.coins} coins`
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
      pauseBody="Your game is paused and saved on this device. Your table will be here when you get back."
      exitLabel="Save & return to lobby"
      onExit={() => router.replace('/')}
      reactions={againstBots ? { bubbles: reactionBubbles.bubbles, send: sendReaction } : undefined}
      resultSheet={
        match && (
          <VictoryScreen
            visible={finished && !busy}
            outcome={match.options.mode === 'local' || redWon ? 'win' : 'loss'}
            banner={
              match.options.mode === 'local'
                ? `${seatName(match.state.winnerColor ?? 'RED')} wins!`.toUpperCase()
                : redWon
                  ? teamGame
                    ? 'TEAM VICTORY!'
                    : 'VICTORY!'
                  : 'GOOD GAME'
            }
            subtitle={(match.options.mode === 'ai' && !redWon
              ? `So close · ${variantName?.title ?? ''}`
              : `${variantName?.short ?? ''} · ${winLine(match.state)}`
            ).toUpperCase()}
            standings={standings(match.state).map((color) => ({
              key: color,
              name: labelFor(color) === 'You' ? profile.name : labelFor(color),
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
                  ? `+${REWARDS.bot.win.coins} coins are in your vault — sign in any time to claim everything in it.`
                  : `Win to add ${REWARDS.bot.win.coins} coins to your vault, or ${REWARDS.online.win.coins} online.`
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
                    label: adBusy ? 'Loading ad…' : 'Watch an ad · Rematch',
                    busy: saving || adBusy,
                    onPress: () => {
                      if (adBusy) return;
                      setAdBusy(true);
                      void rewardedAds
                        .show()
                        .then((earned) => {
                          if (earned) void finish(true);
                          else setNotice('The ad did not finish. Try again, or head home.');
                        })
                        .finally(() => setAdBusy(false));
                    },
                  }
                : { label: 'Play again', busy: saving, onPress: () => void finish(true) }
            }
            secondary={{
              label: !member && match.options.mode === 'ai' && !redWon ? 'Go home' : 'Lobby',
              onPress: () => void finish(false),
            }}
            shareMessage={
              redWon || match.options.mode === 'local'
                ? `${match.options.mode === 'local' ? `${seatName(match.state.winnerColor ?? 'RED')} just won` : 'I just won'} a ${variantName?.title ?? 'Classic'} game of Ludo Rumble! 🎲🏆`
                : undefined
            }
            error={notice}
            motionEnabled={motionEnabled}
          />
        )
      }
    />
  );
}
