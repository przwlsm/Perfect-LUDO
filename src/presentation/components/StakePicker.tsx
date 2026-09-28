import { Pressable, StyleSheet, View } from 'react-native';
import { STAKES, tablePrize, type Stake } from '@/domain';
import { Text } from './AppText';
import { CoinIcon } from './Currency';
import { formatCount } from './Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

/**
 * Entry stake chips for an online table, with what the winner takes.
 * Stakes need an account with enough coins; those chips are locked
 * otherwise, and a locked choice falls back to a free table.
 */
export function StakePicker({
  value,
  players,
  onChange,
}: {
  value: Stake;
  players: number;
  onChange(stake: Stake): void;
}) {
  const { theme, member, wallet, profile } = useProfile();
  const canPay = (stake: Stake) =>
    stake === 0 || (member && wallet === 'ready' && profile.coins >= stake);
  return (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        {STAKES.map((stake) => {
          const allowed = canPay(stake);
          const selected = stake === value;
          return (
            <Pressable
              key={stake}
              accessibilityRole="button"
              accessibilityLabel={
                stake === 0
                  ? 'Free table'
                  : `${stake} coin table${allowed ? '' : ', not enough coins or no account'}`
              }
              accessibilityState={{ selected, disabled: !allowed }}
              disabled={!allowed}
              onPress={() => onChange(stake)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.chip,
                { backgroundColor: theme.surface },
                selected && { borderColor: ui.gold, backgroundColor: '#2a2210' },
                !allowed && { opacity: 0.4 },
              ]}
            >
              {stake === 0 ? (
                <Text style={[s.chipText, selected && { color: ui.gold }]}>FREE</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CoinIcon size={14} />
                  <Text style={[s.chipText, selected && { color: ui.gold }]}>
                    {stake >= 1000 ? `${stake / 1000}K` : stake}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={s.hint}>
        {value === 0
          ? member
            ? 'Free table: play for XP, coins and tournament points.'
            : 'Guests play free tables. Create an account to play for coins.'
          : `Everyone pays ${formatCount(value)} when the game starts. Winner takes ${formatCount(
              tablePrize(value, players),
            )} coins.`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: ui.text, fontWeight: '900', fontSize: 14 },
  hint: { color: ui.muted, fontSize: 12, lineHeight: 17 },
});
