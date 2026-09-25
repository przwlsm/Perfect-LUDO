import { useState } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { PLAYED_COINS, WIN_COINS } from '@/domain';
import { Body, Button, Card, Sheet, shared } from '../components/Kit';
import { GameTable, gameTableStyles } from '../game/GameTable';
import { useGameSounds } from '../audio/useGameSounds';
import { useMatch } from '../hooks/useMatch';
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
      resume={params.resume === '1'}
    />
  );
}

function MatchScreen({
  mode,
  players,
  difficulty,
  resume,
}: {
  mode?: string;
  players?: string;
  difficulty?: string;
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
  const motionEnabled = useMotionEnabled(
    profile.reducedMotion,
    focused && !menu && !rules && ready,
  );
  const game = useMatch(options, resume, menu || rules || !focused || !ready, motionEnabled);
  useGameSounds(game.feedback, profile.soundEnabled, focused && !menu && !rules, motionEnabled);
  const { match, current, humanTurn, busy } = game;

  async function finish() {
    if (!match || saving) return;
    setSaving(true);
    try {
      // Reaches the account when it can; otherwise the result is kept on the
      // device and paid the next time the account answers.
      await recordMatch(match.id, match.state.winnerColor === 'RED', match.options.mode === 'ai');
      router.replace('/');
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
          : humanTurn
            ? `${(match?.options.mode ?? options.mode) === 'local' ? (current?.color.toLowerCase() ?? '') + ' player, ' : ''}tap the dice to roll`
            : 'Computer is getting ready…';

  return (
    <GameTable
      game={game}
      label={(match?.options.mode ?? options.mode) === 'local' ? 'PASS & PLAY' : 'SOLO TABLE'}
      statusLine={statusLine}
      seatRotation={(match?.options.mode ?? options.mode) === 'local'}
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
      resultSheet={
        match && (
          <Sheet
            visible={match.state.status === 'FINISHED' && !busy}
            onClose={() => undefined}
            title={
              match.state.winnerColor === 'RED' ? 'A winning kind of day.' : 'That was a good game.'
            }
          >
            <Text style={{ fontSize: 64, textAlign: 'center' }}>🏆</Text>
            <Text
              style={[
                gameTableStyles.winTitle,
                { color: theme.colors[match.state.winnerColor ?? 'RED'] },
              ]}
            >
              {match.state.winnerColor} WINS
            </Text>
            <Body>All four pieces home. Time to enjoy the moment.</Body>
            {match.options.mode === 'ai' &&
              (member ? (
                <Card>
                  <Text
                    style={{
                      color: theme.accent,
                      fontSize: 30,
                      fontWeight: '900',
                      textAlign: 'center',
                    }}
                  >
                    +{match.state.winnerColor === 'RED' ? WIN_COINS : PLAYED_COINS} coins
                  </Text>
                  <Text style={[shared.small, { textAlign: 'center' }]}>
                    For a game well played. Added to your account.
                  </Text>
                </Card>
              ) : (
                <Text style={[shared.small, { textAlign: 'center' }]}>
                  Sign in to earn {WIN_COINS} coins for a solo win and {PLAYED_COINS} for finishing.
                </Text>
              ))}
            {notice && <Text style={shared.error}>{notice}</Text>}
            <Button disabled={saving} onPress={() => void finish()}>
              {saving ? 'Saving result…' : 'Save result & back to club'}
            </Button>
          </Sheet>
        )
      }
    />
  );
}
