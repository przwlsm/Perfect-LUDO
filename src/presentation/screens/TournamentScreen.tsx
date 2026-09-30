import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  LEGEND_BONUS_POINTS,
  LEGEND_WEEKLY_GEMS,
  leagueName,
  TOURNAMENT_PLAYED_POINTS,
  TOURNAMENT_WIN_POINTS,
  tournamentPrize,
} from '@/domain';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { ProgressBar, RewardChips, timeLeft } from '../components/Progress';
import { UserAvatar } from '../social/UserAvatar';
import { useLeague, useTournament } from '../hooks/useRewards';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { ui } from '../theme/themes';

const PRIZE_TIERS: readonly { readonly label: string; readonly rank: number }[] = [
  { label: '1st', rank: 1 },
  { label: '2nd – 3rd', rank: 2 },
  { label: '4th – 10th', rank: 4 },
  { label: '11th – 50th', rank: 11 },
  { label: 'Everyone who plays', rank: 51 },
];

const MEDALS = ['#fbbf24', '#cbd5e1', '#d97706'];
/** Badge colour per division, Bronze to Legend. */
const DIVISION_COLORS = ['#d99a5b', '#cbd5e1', '#fbbf24', '#7dd3fc', '#c084fc'];

export default function TournamentScreen() {
  const { theme, member } = useProfile();
  const { identity } = useSocial();
  const t = useTournament();
  const league = useLeague();

  if (!member)
    return (
      <Screen title="Weekly Tournament" subtitle="ONLINE LEAGUE">
        <Card>
          <Text style={shared.sectionTitle}>Climb the weekly leaderboard</Text>
          <Body>
            Every online match scores points. Sign in to take part and win coins and gems when the
            week ends.
          </Body>
          <Button onPress={() => router.push('/login')}>Sign in to compete</Button>
        </Card>
      </Screen>
    );

  const data = t.data;
  const lg = league.data;
  const divisionColor = lg ? DIVISION_COLORS[lg.division - 1]! : ui.muted;
  return (
    <Screen title="Weekly Tournament" subtitle="ONLINE LEAGUE">
      {t.error && <Text style={shared.error}>{t.error}</Text>}

      {/* ---- Your league division ---- */}
      {lg && (
        <Card style={{ borderColor: `${divisionColor}55` }}>
          {lg.lastResult && lg.lastResult.to !== lg.lastResult.from && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: lg.lastResult.to > lg.lastResult.from ? ui.green : ui.danger,
                fontWeight: '800',
              }}
            >
              {lg.lastResult.to > lg.lastResult.from
                ? `Promoted! ${leagueName(lg.lastResult.from)} → ${leagueName(lg.lastResult.to)}${
                    lg.lastResult.gems > 0 ? ` · +${lg.lastResult.gems} gems` : ''
                  }`
                : `Relegated to ${leagueName(lg.lastResult.to)}. This week is the comeback.`}
            </Text>
          )}
          <View style={shared.between}>
            <View style={{ gap: 4 }}>
              <Label color={divisionColor}>YOUR LEAGUE</Label>
              <Text style={s.rank}>{leagueName(lg.division)}</Text>
            </View>
            <Ionicons name="shield" size={44} color={divisionColor} />
          </View>
          {lg.promoteAt !== null ? (
            <>
              <ProgressBar
                value={Math.min(1, lg.points / lg.promoteAt)}
                colors={[divisionColor, divisionColor]}
              />
              <Text style={shared.small}>
                {lg.points} / {lg.promoteAt} points to {leagueName(lg.division + 1)} this week.
                {lg.demoteBelow !== null && lg.points < lg.demoteBelow
                  ? ` Under ${lg.demoteBelow} drops you to ${leagueName(lg.division - 1)}.`
                  : ''}
              </Text>
            </>
          ) : (
            <Text style={shared.small}>
              The top of the ladder. {LEGEND_BONUS_POINTS}+ points this week pays{' '}
              {LEGEND_WEEKLY_GEMS} gems
              {lg.demoteBelow !== null
                ? `; under ${lg.demoteBelow} drops you to ${leagueName(lg.division - 1)}`
                : ''}
              .
            </Text>
          )}
        </Card>
      )}

      {data?.lastWeek && !data.lastWeek.claimed && (
        <Card style={{ borderColor: `${ui.gold}80`, backgroundColor: '#2a2210' }}>
          <Label color={ui.gold}>LAST WEEK&apos;S RESULT</Label>
          <Text style={shared.sectionTitle}>You finished #{data.lastWeek.rank}</Text>
          <RewardChips coins={data.lastWeek.prize.coins} gems={data.lastWeek.prize.gems} />
          <Button disabled={t.busy} onPress={() => void t.claim()}>
            {t.busy ? 'Collecting…' : 'Collect prize'}
          </Button>
        </Card>
      )}

      <Card style={{ borderColor: `${theme.accent}40` }}>
        <View style={shared.between}>
          <View style={{ gap: 4 }}>
            <Label color={theme.accent}>THIS WEEK</Label>
            <Text style={s.rank}>{data?.me.rank ? `#${data.me.rank}` : 'Unranked'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={shared.small}>Ends in</Text>
            <Text style={{ color: ui.text, fontWeight: '800', fontSize: 18 }}>
              {data ? timeLeft(data.endsAt) : '—'}
            </Text>
          </View>
        </View>
        <View style={s.stats}>
          <Stat label="Points" value={data?.me.points ?? 0} />
          <Stat label="Wins" value={data?.me.wins ?? 0} />
          <Stat label="Games" value={data?.me.games ?? 0} />
        </View>
        <Text style={shared.small}>
          Online matches score {TOURNAMENT_WIN_POINTS} points for a win and{' '}
          {TOURNAMENT_PLAYED_POINTS} for finishing. Prizes are paid when the week closes.
        </Text>
        <Button onPress={() => router.push('/online')}>Play online now</Button>
      </Card>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>Prizes</Text>
        <Card style={{ gap: 10 }}>
          {PRIZE_TIERS.map((tier) => {
            const prize = tournamentPrize(tier.rank);
            return (
              <View key={tier.label} style={shared.between}>
                <Text style={{ color: ui.text, fontWeight: '700' }}>{tier.label}</Text>
                <RewardChips coins={prize.coins} gems={prize.gems} size="sm" />
              </View>
            );
          })}
        </Card>
      </View>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>Leaderboard</Text>
        {data && data.top.length === 0 && (
          <Card>
            <Body>Nobody has scored yet this week. Win an online match to take first place.</Body>
          </Card>
        )}
        {data?.top.map((entry) => {
          const me = entry.userId === identity?.id;
          const name = entry.displayName || entry.username || 'Player';
          return (
            <View
              key={entry.userId}
              style={[
                s.row,
                me && { borderColor: theme.accent, backgroundColor: `${theme.accent}14` },
              ]}
            >
              <View
                style={[s.place, entry.rank <= 3 && { backgroundColor: MEDALS[entry.rank - 1] }]}
              >
                {entry.rank <= 3 ? (
                  <Ionicons name="trophy" size={14} color="#1f1500" />
                ) : (
                  <Text style={{ color: ui.text, fontWeight: '800', fontSize: 12 }}>
                    {entry.rank}
                  </Text>
                )}
              </View>
              <UserAvatar id={entry.userId} name={name} emoji={entry.avatar} size={34} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: ui.text, fontWeight: '700' }}>
                  {name}
                  {me ? ' (you)' : ''}
                </Text>
                <Text style={shared.small}>{entry.wins} wins</Text>
              </View>
              <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 16 }}>
                {entry.points}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.stat}>
      <Text style={{ color: ui.text, fontWeight: '900', fontSize: 22 }}>{value}</Text>
      <Text style={shared.small}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  rank: { color: ui.text, fontSize: 34, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff08',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.surfaceLow,
  },
  place: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff12',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
