import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { displayNameOf, requiredFriendCount, toggleSelection, type Friend } from '@/domain';
import { Body, Button, Label, shared, Sheet } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';
import { PresenceText } from './PresenceDot';
import { UserAvatar } from './UserAvatar';

const PLAYER_COUNTS = [2, 3] as const;

export function ChallengeSheet({
  visible,
  friends,
  seedFriendId,
  busy,
  error,
  onClose,
  onCreate,
}: {
  visible: boolean;
  friends: readonly Friend[];
  /** Pre-selected when the sheet was opened from a specific friend's row. */
  seedFriendId?: string | null;
  busy: boolean;
  error: string | null;
  onClose(): void;
  onCreate(friendIds: readonly string[]): void;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation('social');
  const [playerCount, setPlayerCount] = useState<2 | 3>(2);
  // Seeded from whoever's Challenge button opened the sheet. The parent
  // remounts this component per opening, so there is nothing to reset.
  const [selected, setSelected] = useState<readonly string[]>(() =>
    seedFriendId ? [seedFriendId] : [],
  );

  const required = requiredFriendCount(playerCount);
  // Shrinking the table must not leave more friends picked than there are seats.
  const picked = useMemo(() => selected.slice(0, required), [selected, required]);
  const ready = picked.length === required;

  function choosePlayerCount(next: 2 | 3) {
    setPlayerCount(next);
    setSelected((current) => current.slice(0, requiredFriendCount(next)));
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('challenge.title')}>
      <Label>{t('challenge.howMany')}</Label>
      <View style={shared.row}>
        {PLAYER_COUNTS.map((count) => {
          const active = count === playerCount;
          return (
            <Pressable
              key={count}
              accessibilityRole="button"
              accessibilityLabel={t('challenge.playersA11y', { count })}
              accessibilityState={{ selected: active }}
              onPress={() => choosePlayerCount(count)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.countCard,
                { backgroundColor: theme.surface },
                active && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
              ]}
            >
              <Text style={[s.countNumber, active && { color: theme.accent }]}>{count}</Text>
              <Text style={s.countLabel}>{t('challenge.players')}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={shared.between}>
        <Label>{t('challenge.selectFriends', { count: required })}</Label>
        <Text style={[s.counter, ready && { color: theme.accent }]}>
          {t('challenge.selected', { picked: picked.length, required })}
        </Text>
      </View>

      {friends.length === 0 ? (
        <Body>{t('challenge.noFriends')}</Body>
      ) : (
        <View style={{ gap: 8 }}>
          {friends.map((friend) => {
            const isPicked = picked.includes(friend.id);
            const full = !isPicked && picked.length >= required;
            const name = displayNameOf(friend);
            return (
              <Pressable
                key={friend.id}
                accessibilityRole="checkbox"
                accessibilityLabel={t('challenge.selectA11y', { name })}
                accessibilityState={{ checked: isPicked, disabled: full }}
                disabled={full || busy}
                onPress={() => setSelected(toggleSelection(picked, friend.id, required))}
                android_ripple={{ color: `${theme.accent}25` }}
                style={[
                  s.friendRow,
                  { backgroundColor: theme.surface, opacity: full ? 0.45 : 1 },
                  isPicked && { borderColor: theme.accent, backgroundColor: `${theme.accent}14` },
                ]}
              >
                <UserAvatar
                  id={friend.id}
                  name={name}
                  emoji={friend.avatar}
                  presence={friend.presence}
                  size={40}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.friendName} numberOfLines={1}>
                    {name}
                  </Text>
                  <PresenceText status={friend.presence} />
                </View>
                <View
                  style={[
                    s.check,
                    isPicked && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                >
                  {isPicked && <Text style={s.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {error && (
        <Text accessibilityLiveRegion="polite" style={shared.error}>
          {error}
        </Text>
      )}

      <Button disabled={!ready || busy} onPress={() => onCreate(picked)}>
        {busy ? t('challenge.creating') : t('challenge.start', { count: playerCount })}
      </Button>
      <Text style={[shared.small, { textAlign: 'center' }]}>{t('challenge.footnote')}</Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  countCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ui.line,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 2,
  },
  countNumber: { color: ui.text, fontSize: 28, fontWeight: '900' },
  countLabel: { color: ui.subtle, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  counter: { color: ui.muted, fontSize: 12, fontWeight: '700' },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ui.line,
  },
  friendName: { color: ui.text, fontSize: 15, fontWeight: '700' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#251b13', fontSize: 14, fontWeight: '900' },
});
