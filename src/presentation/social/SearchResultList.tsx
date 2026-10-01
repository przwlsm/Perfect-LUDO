import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import {
  displayNameOf,
  type FriendRelationship,
  type FriendRequest,
  type UserSearchResult,
} from '@/domain';
import { Body, Button, Card, shared } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { PlayerRow } from './PlayerRow';

/**
 * The server tells us how the caller already relates to each hit, so the row
 * can offer the one action that makes sense without a second round trip.
 * Adding a relationship later means adding a branch here and nothing else.
 */
function Action({
  relationship,
  userId,
  pendingRequestId,
  busyId,
  onAdd,
  onAccept,
  onChallenge,
}: {
  relationship: FriendRelationship;
  userId: string;
  pendingRequestId: string | null;
  busyId: string | null;
  onAdd(id: string): void;
  onAccept(requestId: string): void;
  onChallenge(id: string): void;
}) {
  const { t } = useTranslation('social');
  switch (relationship) {
    case 'SELF':
      return <Text style={shared.small}>{t('search.self')}</Text>;
    case 'FRIEND':
      return (
        <Button compact disabled={busyId === userId} onPress={() => onChallenge(userId)}>
          {t('search.challenge')}
        </Button>
      );
    case 'REQUEST_SENT':
      return <Text style={shared.small}>{t('search.requestSent')}</Text>;
    case 'REQUEST_RECEIVED':
      return (
        <Button
          compact
          disabled={!pendingRequestId || busyId === pendingRequestId}
          onPress={() => pendingRequestId && onAccept(pendingRequestId)}
        >
          {t('requests.accept')}
        </Button>
      );
    default:
      return (
        <Button compact disabled={busyId === userId} onPress={() => onAdd(userId)}>
          {t('search.addFriend')}
        </Button>
      );
  }
}

export function SearchResultList({
  results,
  searching,
  busyId,
  incoming,
  onAdd,
  onAccept,
  onChallenge,
}: {
  results: readonly UserSearchResult[];
  searching: boolean;
  busyId: string | null;
  incoming: readonly FriendRequest[];
  onAdd(id: string): void;
  onAccept(requestId: string): void;
  onChallenge(id: string): void;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation('social');
  if (searching && results.length === 0) {
    return <ActivityIndicator color={theme.accent} style={{ marginVertical: 30 }} />;
  }
  if (results.length === 0) {
    return (
      <Card>
        <Body>{t('search.noResults')}</Body>
      </Card>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {results.map((result) => (
        <PlayerRow
          key={result.id}
          id={result.id}
          name={displayNameOf(result)}
          emoji={result.avatar}
          presence={result.presence}
          publicId={result.publicId}
        >
          <Action
            relationship={result.relationship}
            userId={result.id}
            pendingRequestId={incoming.find((r) => r.user.id === result.id)?.id ?? null}
            busyId={busyId}
            onAdd={onAdd}
            onAccept={onAccept}
            onChallenge={onChallenge}
          />
        </PlayerRow>
      ))}
    </View>
  );
}
