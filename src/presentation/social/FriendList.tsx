import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { displayNameOf, type Friend } from '@/domain';
import { Body, Button, Card, useShared } from '../components/Kit';
import { useUi } from '../theme/AppearanceProvider';
import { PlayerRow } from './PlayerRow';

export function FriendList({
  friends,
  busyId,
  onChallenge,
  onRemove,
}: {
  friends: readonly Friend[];
  busyId: string | null;
  onChallenge(id: string): void;
  onRemove(id: string): void;
}) {
  const { t } = useTranslation('social');
  const ui = useUi();
  const shared = useShared();
  if (friends.length === 0) {
    return (
      <Card>
        <Text style={shared.sectionTitle}>{t('friends.empty.title')}</Text>
        <Body>{t('friends.empty.body')}</Body>
      </Card>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {friends.map((friend) => {
        const name = displayNameOf(friend);
        return (
          <PlayerRow
            key={friend.id}
            id={friend.id}
            name={name}
            emoji={friend.avatar}
            presence={friend.presence}
            publicId={friend.publicId}
          >
            {/* Friends mid-game stay challengeable: the invite simply waits
                for them as a notification. */}
            <Button compact disabled={busyId === friend.id} onPress={() => onChallenge(friend.id)}>
              {t('search.challenge')}
            </Button>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('friends.remove', { name })}
              disabled={busyId === friend.id}
              onPress={() => onRemove(friend.id)}
              android_ripple={{ color: ui.ripple }}
              // Kept narrow so the name has room; the slop reaches 48 wide within the row gap.
              hitSlop={{ left: 7, right: 7 }}
              style={s.remove}
            >
              <Text style={{ color: ui.subtle, fontSize: 17 }}>×</Text>
            </Pressable>
          </PlayerRow>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  remove: { width: 34, height: 48, alignItems: 'center', justifyContent: 'center' },
});
