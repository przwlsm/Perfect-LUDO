import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  LEAGUE_DIVISIONS,
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

/** Text: online:tournament.tiers.<id>. */
const PRIZE_TIERS: readonly {
  readonly id: 'first' | 'second' | 'fourth' | 'eleventh' | 'everyone';
  readonly rank: number;
}[] = [
  { id: 'first', rank: 1 },
  { id: 'second', rank: 2 },
  { id: 'fourth', rank: 4 },
  { id: 'eleventh', rank: 11 },
  { id: 'everyone', rank: 51 },
];

const MEDALS = ['#fbbf24', '#cbd5e1', '#d97706'];
/** Badge colour per division, Bronze to Legend. */
const DIVISION_COLORS = ['#d99a5b', '#cbd5e1', '#fbbf24', '#7dd3fc', '#c084fc'];

export default function TournamentScreen() {
  const { theme, member } = useProfile();
  const { identity } = useSocial();
  const { t } = useTranslation(['online', 'common']);
  const tournament = useTournament();
  const league = useLeague();
  /** A division's name in the current language, Bronze to Legend. */
  const division = (n: number) =>
    t(`tournament.divisions.${leagueName(n) as (typeof LEAGUE_DIVISIONS)[number]}`);

  if (!member)
    return (
      <Screen title={t('tournament.title')} subtitle={t('tournament.subtitle')}>
        <Card>
          <Text style={shared.sectionTitle}>{t('tournament.climb')}</Text>
          <Body>{t('tournament.signInBody')}</Body>
          <Button onPress={() => router.push('/login')}>{t('tournament.signIn')}</Button>
        </Card>
      </Screen>
    );

  const data = tournament.data;
  const lg = league.data;
  const divisionColor = lg ? DIVISION_COLORS[lg.division - 1]! : ui.muted;
  return (
    <Screen title={t('tournament.title')} subtitle={t('tournament.subtitle')}>
      {tournament.error && <Text style={shared.error}>{tournament.error}</Text>}

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
                ? t(lg.lastResult.gems > 0 ? 'tournament.promotedGems' : 'tournament.promoted', {
                    from: division(lg.lastResult.from),
                    to: division(lg.lastResult.to),
                    gems: lg.lastResult.gems,
                  })
                : t('tournament.relegated', { league: division(lg.lastResult.to) })}
            </Text>
          )}
          <View style={shared.between}>
            <View style={{ gap: 4 }}>
              <Label color={divisionColor}>{t('tournament.yourLeague')}</Label>
              <Text style={s.rank}>{division(lg.division)}</Text>
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
                {t('tournament.progress', {
                  points: lg.points,
                  target: lg.promoteAt,
                  league: division(lg.division + 1),
                })}
                {lg.demoteBelow !== null && lg.points < lg.demoteBelow
                  ? ` ${t('tournament.demoteWarning', {
                      below: lg.demoteBelow,
                      league: division(lg.division - 1),
                    })}`
                  : ''}
              </Text>
            </>
          ) : (
            <Text style={shared.small}>
              {lg.demoteBelow !== null
                ? t('tournament.topDemote', {
                    bonus: LEGEND_BONUS_POINTS,
                    gems: LEGEND_WEEKLY_GEMS,
                    below: lg.demoteBelow,
                    league: division(lg.division - 1),
                  })
                : t('tournament.top', { bonus: LEGEND_BONUS_POINTS, gems: LEGEND_WEEKLY_GEMS })}
            </Text>
          )}
        </Card>
      )}

      {data?.lastWeek && !data.lastWeek.claimed && (
        <Card style={{ borderColor: `${ui.gold}80`, backgroundColor: '#2a2210' }}>
          <Label color={ui.gold}>{t('tournament.lastWeek')}</Label>
          <Text style={shared.sectionTitle}>
            {t('tournament.finished', { rank: data.lastWeek.rank })}
          </Text>
          <RewardChips coins={data.lastWeek.prize.coins} gems={data.lastWeek.prize.gems} />
          <Button disabled={tournament.busy} onPress={() => void tournament.claim()}>
            {tournament.busy ? t('tournament.collecting') : t('tournament.collect')}
          </Button>
        </Card>
      )}

      <Card style={{ borderColor: `${theme.accent}40` }}>
        <View style={shared.between}>
          <View style={{ gap: 4 }}>
            <Label color={theme.accent}>{t('tournament.thisWeek')}</Label>
            <Text style={s.rank}>
              {data?.me.rank ? `#${data.me.rank}` : t('tournament.unranked')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={shared.small}>{t('tournament.endsIn')}</Text>
            <Text style={{ color: ui.text, fontWeight: '800', fontSize: 18 }}>
              {data ? timeLeft(data.endsAt) : '—'}
            </Text>
          </View>
        </View>
        <View style={s.stats}>
          <Stat label={t('tournament.points')} value={data?.me.points ?? 0} />
          <Stat label={t('tournament.wins')} value={data?.me.wins ?? 0} />
          <Stat label={t('tournament.games')} value={data?.me.games ?? 0} />
        </View>
        <Text style={shared.small}>
          {t('tournament.scoring', {
            win: TOURNAMENT_WIN_POINTS,
            played: TOURNAMENT_PLAYED_POINTS,
          })}
        </Text>
        <Button onPress={() => router.push('/online')}>{t('tournament.playNow')}</Button>
      </Card>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>{t('tournament.prizes')}</Text>
        <Card style={{ gap: 10 }}>
          {PRIZE_TIERS.map((tier) => {
            const prize = tournamentPrize(tier.rank);
            return (
              <View key={tier.id} style={shared.between}>
                <Text style={{ color: ui.text, fontWeight: '700', flexShrink: 1 }}>
                  {t(`tournament.tiers.${tier.id}`)}
                </Text>
                <RewardChips coins={prize.coins} gems={prize.gems} size="sm" />
              </View>
            );
          })}
        </Card>
      </View>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>{t('tournament.leaderboard')}</Text>
        {data && data.top.length === 0 && (
          <Card>
            <Body>{t('tournament.empty')}</Body>
          </Card>
        )}
        {data?.top.map((entry) => {
          const me = entry.userId === identity?.id;
          const name = entry.displayName || entry.username || t('common:defaultPlayerName');
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
                  {me ? t('nameYou', { name }) : name}
                </Text>
                <Text style={shared.small}>{t('tournament.entryWins', { count: entry.wins })}</Text>
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
