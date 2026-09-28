import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { controlledColor, REWARDS, type PlayerColor, type Reaction } from '@/domain';
import { cleanSeatNames } from '@/application/session/MatchRepository';
import { Button, Sheet, shared } from '../components/Kit';
import { GameTable } from '../game/GameTable';
import { ResultPanel } from '../game/ResultPanel';
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
  resume,
}: {
  mode?: string;
  players?: string;
  difficulty?: string;
  /** JSON from the lobby: pass & play seat names. */
  names?: string;
  /** 2 v 2 partnerships (four seats only). */
  teams: boolean;
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
  const focused = useIsFocused();
  const options = {
    mode: mode === 'local' ? ('local' as const) : ('ai' as const),
    players:
      mode === 'local' && players === '6'
        ? (6 as const)
        : mode === 'local' && players === '5'
          ? (5 as const)
          : players === '2'
            ? (2 as const)
            : players === '3'
              ? (3 as const)
              : (4 as const),
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
    { ...options, names: seatNames, ...(wantTeams ? { teams: true } : {}) },
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
          ? game.moves.length > 1
            ? `${game.moves.length} playable coins - tap a bouncing coin`
            : game.moves.length === 1
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
            : humanTurn
              ? `${(match?.options.mode ?? options.mode) === 'local' && current ? (match?.options.names?.[current.color] ?? current.color.toLowerCase() + ' player') + ', ' : ''}tap the dice to roll`
              : 'Computer is getting ready…';

  return (
    <GameTable
      game={game}
      label={
        (teamGame ? '2 V 2 · ' : '') +
        ((match?.options.mode ?? options.mode) === 'local' ? 'PASS & PLAY' : 'SOLO TABLE')
      }
      statusLine={statusLine}
      seatRotation={(match?.options.mode ?? options.mode) === 'local'}
      seatLabel={(color) => {
        if ((match?.options.mode ?? options.mode) === 'local')
          return match?.options.names?.[color] ?? color.charAt(0) + color.slice(1).toLowerCase();
        if (color === 'RED') return 'You';
        if (teamGame)
          return color === 'YELLOW' ? 'Partner' : color === 'GREEN' ? 'Rival 1' : 'Rival 2';
        const index = match?.state.players.findIndex((p) => p.color === color) ?? -1;
        // One opponent is just "Computer"; several are numbered in turn order.
        return (match?.state.players.length ?? 0) > 2 && index > 0
          ? `Computer ${index}`
          : 'Computer';
      }}
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
          <Sheet
            visible={match.state.status === 'FINISHED' && !busy}
            onClose={() => undefined}
            title={redWon ? 'A winning kind of day.' : 'That was a good game.'}
          >
            <ResultPanel
              outcome={match.options.mode === 'local' || redWon ? 'win' : 'loss'}
              headline={
                match.options.mode === 'ai'
                  ? teamGame
                    ? redWon
                      ? 'YOUR TEAM WINS'
                      : 'RIVALS WIN'
                    : redWon
                      ? 'YOU WIN'
                      : 'COMPUTER WINS'
                  : teamGame && match.state.winnerColor
                    ? `${seatName(match.state.winnerColor)} & ${seatName(
                        match.state.players[
                          (match.state.players.findIndex(
                            (p) => p.color === match.state.winnerColor,
                          ) +
                            2) %
                            4
                        ]!.color,
                      )} WIN`.toUpperCase()
                    : `${(
                        (match.state.winnerColor &&
                          match.options.names?.[match.state.winnerColor]) ??
                        match.state.winnerColor ??
                        ''
                      ).toUpperCase()} WINS`
              }
              accent={theme.colors[match.state.winnerColor ?? 'RED']}
              subline={
                teamGame
                  ? 'All eight coins home. That is teamwork.'
                  : match.options.mode === 'local'
                    ? 'All four coins home. Time to enjoy the moment.'
                    : redWon
                      ? 'All four coins home. Beautifully played.'
                      : 'So close. Your next win is one roll away.'
              }
              stats={match.options.mode === 'ai' ? game.getStats() : null}
              reward={
                match.options.mode === 'ai' && member
                  ? redWon
                    ? REWARDS.bot.win
                    : REWARDS.bot.played
                  : null
              }
              note={
                match.options.mode === 'ai' && !member
                  ? `Sign in to earn ${REWARDS.bot.win.coins} coins a win here, and ${REWARDS.online.win.coins} online.`
                  : undefined
              }
              motionEnabled={motionEnabled}
            />
            {notice && <Text style={shared.error}>{notice}</Text>}
            <Button disabled={saving} onPress={() => void finish(true)}>
              {saving ? 'Saving result…' : 'Play again'}
            </Button>
            <Button secondary disabled={saving} onPress={() => void finish(false)}>
              Back to the club
            </Button>
          </Sheet>
        )
      }
    />
  );
}
