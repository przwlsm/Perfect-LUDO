import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import { challengeRepository } from '@/config/container';
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { useFriends } from '../hooks/useFriends';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { AccountGateCard } from '../social/AccountGate';
import { ChallengeSheet } from '../social/ChallengeSheet';
import { FriendList } from '../social/FriendList';
import { RequestList } from '../social/RequestList';
import { SearchResultList } from '../social/SearchResultList';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { DARK } from '../theme/palette';
import { liftByDay, pillColors } from '../theme/surfaces';
import { LudoSpinner } from '../components/LoaderArt';

const TABS = ['friends', 'requests', 'sent'] as const;
type Tab = (typeof TABS)[number];

export default function FriendsScreen() {
  const { enabled, signedIn, account } = useSocial();
  const { t } = useTranslation(['social', 'common']);
  const friends = useFriends();
  const ui = useUi();
  const shared = useShared();
  const [tab, setTab] = useState<Tab>('friends');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [seedFriendId, setSeedFriendId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // A server message when there is one; otherwise the fallback is translated at render.
  const [createError, setCreateError] = useState<{ message?: string } | null>(null);

  async function createChallenge(friendIds: readonly string[]) {
    if (!challengeRepository) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { lobbyId } = await challengeRepository.createChallenge(friendIds);
      setSheetOpen(false);
      router.push({ pathname: '/lobby/[id]', params: { id: lobbyId } });
    } catch (e) {
      setCreateError(e instanceof Error ? { message: e.message } : {});
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
    <Screen title={t('friends.title')} subtitle={t('friends.subtitle')}>
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
              empty={t('requests.incomingEmpty')}
              busyId={friends.busyId}
              primaryLabel={t('requests.accept')}
              secondaryLabel={t('requests.decline')}
              onPrimary={friends.acceptRequest}
              onSecondary={friends.declineRequest}
            />
          ) : (
            <RequestList
              requests={friends.sent}
              empty={t('requests.sentEmpty')}
              busyId={friends.busyId}
              secondaryLabel={t('common:actions.cancel')}
              onSecondary={friends.cancelRequest}
            />
          )}
          {friends.friends.length > 0 && (
            <Button onPress={() => openChallenge(null)}>{t('friends.createChallenge')}</Button>
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
        error={createError ? (createError.message ?? t('friends.createFailed')) : null}
        onClose={() => setSheetOpen(false)}
        onCreate={(ids) => void createChallenge(ids)}
      />
    </Screen>
  );
}

function Loading() {
  return <LudoSpinner style={{ marginVertical: 30 }} />;
}

function FriendsHeader({ count, online }: { count: number; online: number }) {
  const { identity } = useSocial();
  const { t } = useTranslation('social');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  // By day the live count sits on a soft game-green pill; night is unchanged.
  const pill = ui.scheme === 'dark' ? null : pillColors(DARK.green, ui);
  return (
    <View style={shared.between}>
      <View style={{ gap: 4 }}>
        <Text style={s.headline}>{t('friends.count', { count })}</Text>
        {identity && (
          <Text style={shared.small}>
            {identity.publicId
              ? t('friends.youWithId', { username: identity.username, id: identity.publicId })
              : t('friends.you', { username: identity.username })}
          </Text>
        )}
      </View>
      <View
        style={[
          s.onlinePill,
          pill && { backgroundColor: pill.background, borderColor: 'transparent' },
        ]}
      >
        <View style={s.onlineDot} />
        {/* On the ivory page (not a white card) the day green token keeps 4.5:1. */}
        <Text style={s.onlineText}>{t('friends.online', { online })}</Text>
      </View>
    </View>
  );
}

function SearchField({ value, onChange }: { value: string; onChange(next: string): void }) {
  const { theme } = useProfile();
  const { t } = useTranslation('social');
  const s = useStyles();
  const ui = useUi();
  return (
    <View
      style={[
        s.searchBox,
        // White and lifted by day, with a hairline; night keeps the accent rim.
        {
          borderColor: ui.scheme === 'dark' ? `${theme.accent}40` : ui.line,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <Text style={s.searchIcon}>⌕</Text>
      <TextInput
        accessibilityLabel={t('search.a11y')}
        value={value}
        onChangeText={onChange}
        placeholder={t('search.placeholder')}
        placeholderTextColor={ui.subtle}
        autoCapitalize="none"
        autoCorrect={false}
        style={s.searchInput}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          onPress={() => onChange('')}
          android_ripple={{ color: ui.ripple }}
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
  const { t } = useTranslation('social');
  const s = useStyles();
  const ui = useUi();
  const night = ui.scheme === 'dark';
  // Night keeps its dark ink on the bright green; day's deeper green takes white.
  const onGreen = night ? '#0b2019' : ui.onColor;
  return (
    <View style={s.tabs}>
      {TABS.map((key) => {
        const active = tab === key;
        // By day the active tab is navy (the 30%), like the bottom bar's; idle
        // tabs are white chips. Night keeps the accent-tinted look.
        const navyTab = active && !night;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(key)}
            android_ripple={{ color: `${theme.accent}25` }}
            style={[
              s.tab,
              !night && { backgroundColor: theme.surface },
              active &&
                (night
                  ? { backgroundColor: `${theme.accent}1c`, borderColor: theme.accent }
                  : { backgroundColor: ui.navy, borderColor: ui.navy }),
            ]}
          >
            <Text
              style={[
                s.tabText,
                active && { color: navyTab ? ui.secondaryText : theme.accentText },
              ]}
            >
              {t(`tabs.${key}`)}
            </Text>
            {counts[key] > 0 && (
              <View
                style={[
                  s.badge,
                  {
                    backgroundColor:
                      key === 'requests' ? ui.green : navyTab ? DARK.fillStrong : ui.line,
                  },
                ]}
              >
                <Text
                  style={[
                    s.badgeText,
                    navyTab && { color: DARK.text },
                    key === 'requests' && { color: onGreen },
                  ]}
                >
                  {counts[key]}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function NoBackend() {
  const { t } = useTranslation('social');
  return (
    <Screen title={t('friends.title')} subtitle={t('friends.subtitle')}>
      <Card>
        <Body>{t('noBackend.body')}</Body>
        <Button onPress={() => router.replace('/')}>{t('noBackend.back')}</Button>
      </Card>
    </Screen>
  );
}

/** Guests see why, not a failure: the offer to sign up, and the way back to play. */
function GuestLocked() {
  const { t } = useTranslation('social');
  const shared = useShared();
  return (
    <Screen title={t('friends.title')} subtitle={t('friends.subtitle')}>
      <AccountGateCard
        feature={t('friends.title')}
        onContinueAsGuest={() => router.replace('/online')}
      />
      <Text style={shared.small}>{t('guest.hint')}</Text>
    </Screen>
  );
}

function SignedOut() {
  const { theme } = useProfile();
  const { t } = useTranslation('social');
  const shared = useShared();
  return (
    <Screen title={t('friends.title')} subtitle={t('friends.subtitle')}>
      <Card>
        <Label color={theme.accentText}>{t('signedOut.label')}</Label>
        <Text style={shared.sectionTitle}>{t('signedOut.title')}</Text>
        <Body>{t('signedOut.body')}</Body>
        <Button onPress={() => router.push('/login')}>{t('signedOut.signIn')}</Button>
        <Button secondary compact onPress={() => router.replace('/')}>
          {t('signedOut.offline')}
        </Button>
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((ui) => ({
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
    backgroundColor: `${ui.green}10`,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ui.green },
  onlineText: { color: ui.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 14,
    boxShadow: liftByDay(ui),
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
  clear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
  },
  tabText: { color: ui.muted, fontSize: 13, fontWeight: '800' },
  badge: { minWidth: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center' },
  badgeText: { color: ui.text, fontSize: 11, fontWeight: '800', lineHeight: 18 },
}));
