import { View } from 'react-native';
import { displayNameOf, type FriendRequest } from '@/domain';
import { Body, Button, Card } from '../components/Kit';
import { PlayerRow } from './PlayerRow';

/**
 * Serves both the incoming and the sent tab: incoming offers accept plus
 * decline, sent offers cancel alone.
 */
export function RequestList({
  requests,
  empty,
  busyId,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  requests: readonly FriendRequest[];
  empty: string;
  busyId: string | null;
  primaryLabel?: string;
  secondaryLabel: string;
  onPrimary?(requestId: string): void;
  onSecondary(requestId: string): void;
}) {
  if (requests.length === 0) {
    return (
      <Card>
        <Body>{empty}</Body>
      </Card>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {requests.map((request) => (
        <PlayerRow
          key={request.id}
          id={request.user.id}
          name={displayNameOf(request.user)}
          emoji={request.user.avatar}
          presence={request.user.presence}
          publicId={request.user.publicId}
        >
          {primaryLabel && onPrimary && (
            <Button compact disabled={busyId === request.id} onPress={() => onPrimary(request.id)}>
              {primaryLabel}
            </Button>
          )}
          <Button
            compact
            secondary
            disabled={busyId === request.id}
            onPress={() => onSecondary(request.id)}
          >
            {secondaryLabel}
          </Button>
        </PlayerRow>
      ))}
    </View>
  );
}
