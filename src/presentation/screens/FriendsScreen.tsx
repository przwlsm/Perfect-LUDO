import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import { challengeRepository } from '@/config/container';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { useFriends } from '../hooks/useFriends';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { AccountGateCard } from '../social/AccountGate';
import { ChallengeSheet } from '../social/ChallengeSheet';
import { FriendList } from '../social/FriendList';
import { RequestList } from '../social/RequestList';
import { SearchResultList } from '../social/SearchResultList';
import { ui } from '../theme/themes';

type Tab = 'friends' | 'requests' | 'sent';

export default function FriendsScreen() {
  const { enabled, signedIn, account } = useSocial();
  const friends = useFriends();
  const [tab, setTab] = useState<Tab>('friends');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [seedFriendId, setSeedFriendId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function createChallenge(friendIds: readonly string[]) {
    if (!challengeRepository) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { lobbyId } = await challengeRepository.createChallenge(friendIds);
      setSheetOpen(false);
      router.push({ pathname: '/lobby/[id]', params: { id: lobbyId } });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'The game could not be created.');
    } finally {
      setCreating(false);
    }
  }

  function openChallenge(friendId: string | null) {
    setCreateError(null);
    setSeedFriendId(friendId);
    setSheetOpen(true);
  }

  if (!enabled) return <NoBackend />;
  if (!signedIn) return <SignedOut />;
  if (account === 'guest') return <GuestLocked />;

  return (
    <Screen title="Friends" subtitle="PLAY WITH PEOPLE YOU KNOW">
      <FriendsHeader count={friends.friends.length} online={friends.onlineCount} />
      <SearchField value={friends.query} onChange={friends.setQuery} />

      {(friends.error || friends.notice) && (
        <Text
          accessibilityLiveRegion="polite"
          style={friends.error ? shared.error : [shared.small, { color: ui.green }]}
        >
          {friends.error ?? friends.notice}
        </Text>
      )}

      {friends.isSearching ? (
        <SearchResultList
          results={friends.results}
          searching={friends.searching}
          busyId={friends.busyId}
          incoming={friends.incoming}
          onAdd={friends.sendRequest}
          onAccept={friends.acceptRequest}
          onChallenge={openChallenge}
        />
      ) : (
        <>
          <Tabs
            tab={tab}
            onChange={setTab}
            counts={{
              friends: friends.friends.length,
              requests: friends.incoming.length,
              sent: friends.sent.length,
            }}
          />
          {friends.loading ? (
            <Loading />
          ) : tab === 'friends' ? (
            <FriendList
              friends={friends.friends}
              busyId={friends.busyId}
              onChallenge={openChallenge}
              onRemove={friends.removeFriend}
            />
          ) : tab === 'requests' ? (
            <RequestList
              requests={friends.incoming}
              empty="No friend requests right now."
              busyId={friends.busyId}
              primaryLabel="Accept"
              secondaryLabel="Decline"
              onPrimary={friends.acceptRequest}
              onSecondary={friends.declineRequest}
            />
          ) : (
            <RequestList
              requests={friends.sent}
              empty="You haven’t sent any requests."
              busyId={friends.busyId}
              secondaryLabel="Cancel"
              onSecondary={friends.cancelRequest}
            />
          )}
          {friends.friends.length > 0 && (
            <Button onPress={() => openChallenge(null)}>Create a challenge →</Button>
          )}
        </>
      )}

      <ChallengeSheet
        // Remounting per opening is what resets the picks, without an effect.
        key={sheetOpen ? `challenge-${seedFriendId ?? 'any'}` : 'challenge-closed'}
        visible={sheetOpen}
        friends={friends.friends}
        seedFriendId={seedFriendId}
        busy={creating}
        error={createError}
        onClose={() => setSheetOpen(false)}
        onCreate={(ids) => void createChallenge(ids)}
      />
    </Screen>
  );
}

function Loading() {
  const { theme } = useProfile();
  return <ActivityIndicator color={theme.accent} style={{ marginVertical: 30 }} />;
}

function FriendsHeader({ count, online }: { count: number; online: number }) {
  const { identity } = useSocial();
  return (
    <View style={shared.between}>
      <View style={{ gap: 4 }}>
        <Text style={s.headline}>
          {count} {count === 1 ? 'friend' : 'friends'}
        </Text>
        {identity && (
          <Text style={shared.small}>
            You are @{identity.username}
            {identity.publicId ? ` · ID ${identity.publicId}` : ''}
          </Text>
        )}
      </View>
      <View style={s.onlinePill}>
        <View style={s.onlineDot} />
        <Text style={s.onlineText}>{online} ONLINE</Text>
      </View>
    </View>
  );
}

function SearchField({ value, onChange }: { value: string; onChange(next: string): void }) {
  const { theme } = useProfile();
  return (
    <View
      style={[s.searchBox, { borderColor: `${theme.accent}40`, backgroundColor: theme.surface }]}
    >
      <Text style={s.searchIcon}>⌕</Text>
      <TextInput
        accessibilityLabel="Search username or user ID"
        value={value}
        onChangeText={onChange}
        placeholder="Search username or user ID…"
        placeholderTextColor={ui.subtle}
        autoCapitalize="none"
        autoCorrect={false}
        style={s.searchInput}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange('')}
          android_ripple={{ color: '#ffffff25' }}
          style={s.clear}
        >
          <Text style={{ color: ui.muted, fontSize: 18 }}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

function Tabs({
  tab,
  counts,
  onChange,
}: {
  tab: Tab;
  counts: Record<Tab, number>;
  onChange(next: Tab): void;
}) {
  const { theme } = useProfile();
  const entries: readonly (readonly [Tab, string])[] = [
    ['friends', 'Friends'],
    ['requests', 'Requests'],
    ['sent', 'Sent'],
  ];
  return (
    <View style={s.tabs}>
      {entries.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === key }}
          onPress={() => onChange(key)}
          android_ripple={{ color: `${theme.accent}25` }}
          style={[
            s.tab,
            tab === key && { backgroundColor: `${theme.accent}1c`, borderColor: theme.accent },
          ]}
        >
          <Text style={[s.tabText, tab === key && { color: theme.accent }]}>{label}</Text>
          {counts[key] > 0 && (
            <View style={[s.badge, { backgroundColor: key === 'requests' ? ui.green : ui.line }]}>
              <Text style={[s.badgeText, key === 'requests' && { color: '#0b2019' }]}>
                {counts[key]}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function NoBackend() {
  return (
    <Screen title="Friends" subtitle="PLAY WITH PEOPLE YOU KNOW">
      <Card>
        <Body>
          Playing with friends needs an account, and this build has no account service configured.
          Everything else still works offline.
        </Body>
        <Button onPress={() => router.replace('/')}>Back to the game</Button>
      </Card>
    </Screen>
  );
}

/** Guests see why, not a failure: the offer to sign up, and the way back to play. */
function GuestLocked() {
  return (
    <Screen title="Friends" subtitle="PLAY WITH PEOPLE YOU KNOW">
      <AccountGateCard feature="Friends" onContinueAsGuest={() => router.replace('/online')} />
      <Text style={shared.small}>
        As a guest you can still play online right now: Quick Play seats you with the next players
        looking for a game.
      </Text>
    </Screen>
  );
}

function SignedOut() {
  const { theme } = useProfile();
  return (
    <Screen title="Friends" subtitle="PLAY WITH PEOPLE YOU KNOW">
      <Card>
        <Label color={theme.accent}>ONE ACCOUNT, EVERY GAME NIGHT</Label>
        <Text style={shared.sectionTitle}>Sign in to add friends</Text>
        <Body>
          Your friends list, challenges and invitations live with your account, so they follow you
          to every device.
        </Body>
        <Button onPress={() => router.push('/login')}>Sign in or create an account</Button>
        <Button secondary compact onPress={() => router.replace('/')}>
          Keep playing offline
        </Button>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  headline: { color: ui.text, fontSize: 20, fontWeight: '800' },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${ui.green}40`,
    backgroundColor: '#4edea310',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ui.green },
  onlineText: { color: ui.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 14,
  },
  searchIcon: { color: ui.subtle, fontSize: 19 },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 12,
    color: ui.text,
    fontSize: 15,
  },
  clear: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
  },
  tabText: { color: ui.muted, fontSize: 13, fontWeight: '800' },
  badge: { minWidth: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center' },
  badgeText: { color: ui.text, fontSize: 11, fontWeight: '800', lineHeight: 18 },
});
