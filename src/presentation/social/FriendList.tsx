import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { displayNameOf, type Friend } from '@/domain';
import { Body, Button, Card, shared } from '../components/Kit';
import { ui } from '../theme/themes';
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
  if (friends.length === 0) {
    return (
      <Card>
        <Text style={shared.sectionTitle}>No friends yet</Text>
        <Body>Search for a username above and send a request to start playing together.</Body>
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
              Challenge
            </Button>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name}`}
              disabled={busyId === friend.id}
              onPress={() => onRemove(friend.id)}
              android_ripple={{ color: '#ffffff20' }}
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
  remove: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
});
