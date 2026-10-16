import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { socialIdentityRepository } from '@/config/container';
import { Body, Button, Card, Label, useShared } from '../components/Kit';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { SIGN_UP_HREF } from './AccountGate';
import { UserAvatar } from './UserAvatar';

const AVATARS = ['🎲', '♟', '🦊', '🐼', '🐙', '🚀', '⭐', '🍀', '🔥', '🎯'];

/**
 * Held as a key, so a message already on screen follows a language change;
 * `text` is the server's own message, shown as written.
 */
type Message =
  | { readonly key: 'saved' | 'saveFailed' | 'copied' }
  | { readonly key: 'copyFailed'; readonly id: string }
  | { readonly text: string };

/** The handle and ID friends search for, kept separate from the private profile. */
export function SocialIdentityCard() {
  const { theme, profile } = useProfile();
  const { enabled, signedIn, account, identity, setIdentity } = useSocial();
  const { t } = useTranslation(['account', 'common']);
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Message | null>(null);
  const [notice, setNotice] = useState<Message | null>(null);
  const availability = useUsernameAvailability(
    editing && draft !== identity?.username ? draft : '',
  );

  if (!enabled || !signedIn || !identity) return null;

  const text = (message: Message) =>
    'text' in message
      ? message.text
      : message.key === 'copyFailed'
        ? t('identity.copyFailed', { id: message.id })
        : t(`identity.${message.key}`);

  async function save(changes: { username?: string; avatar?: string }) {
    if (!socialIdentityRepository) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setIdentity(await socialIdentityRepository.update(changes));
      setEditing(false);
      setNotice({ key: 'saved' });
    } catch (e) {
      setError(e instanceof Error ? { text: e.message } : { key: 'saveFailed' });
    } finally {
      setBusy(false);
    }
  }

  async function copyId() {
    if (!identity?.publicId) return;
    try {
      await Clipboard.setStringAsync(identity.publicId);
      setNotice({ key: 'copied' });
    } catch {
      setError({ key: 'copyFailed', id: identity.publicId });
    }
  }

  async function shareProfile() {
    if (!identity) return;
    const line = identity.publicId
      ? t('identity.share', { username: identity.username, id: identity.publicId })
      : t('identity.shareNoId', { username: identity.username });
    try {
      await Share.share({ message: line });
    } catch {
      // Sharing is a convenience; the ID is still on screen.
    }
  }

  if (account === 'guest') {
    return (
      // A plain white card by day (the 60%); night keeps its accent rim.
      <Card style={{ borderColor: ui.scheme === 'dark' ? `${theme.accent}40` : ui.line }}>
        <Label color={theme.accentText}>{t('shared.guestLabel')}</Label>
        <View style={shared.row}>
          <UserAvatar id={identity.id} name={identity.username} emoji={identity.avatar} size={54} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.handle}>@{identity.username}</Text>
            <Text style={shared.small}>{t('identity.guest.temporary')}</Text>
          </View>
        </View>
        <Text style={shared.sectionTitle}>
          {profile.games > 0
            ? t('identity.guest.played', { count: profile.games })
            : t('identity.guest.empty')}
        </Text>
        <Body>{t('identity.guest.body')}</Body>
        <Button onPress={() => router.push(SIGN_UP_HREF)}>{t('identity.guest.signUp')}</Button>
        <Button
          secondary
          compact
          onPress={() => router.push({ pathname: '/login', params: { intent: 'online' } })}
        >
          {t('identity.guest.login')}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <Label color={theme.accentText}>{t('identity.label')}</Label>
      <View style={shared.row}>
        <UserAvatar
          id={identity.id}
          name={identity.displayName ?? identity.username}
          emoji={identity.avatar}
          size={54}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.handle}>@{identity.username}</Text>
          <Text
            style={s.id}
            accessibilityLabel={
              identity.publicId
                ? t('identity.idA11y', { id: identity.publicId })
                : t('identity.idA11yPending')
            }
          >
            {t('identity.idLine', { id: identity.publicId ?? '—' })}
          </Text>
          <Text style={shared.small}>{t('identity.hint')}</Text>
        </View>
      </View>

      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button secondary compact disabled={!identity.publicId} onPress={() => void copyId()}>
            {t('identity.copyId')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button secondary compact onPress={() => void shareProfile()}>
            {t('identity.shareProfile')}
          </Button>
        </View>
      </View>

      {editing ? (
        <>
          <Label>{t('identity.newUsername')}</Label>
          <View style={[s.field, { borderColor: `${theme.accent}55` }]}>
            <Text style={s.at}>@</Text>
            <TextInput
              accessibilityLabel={t('identity.newUsernameA11y')}
              value={draft}
              onChangeText={(text) => setDraft(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={16}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('identity.usernamePlaceholder')}
              placeholderTextColor={ui.subtle}
              style={s.input}
            />
          </View>
          {availability.status !== 'idle' && (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                shared.small,
                availability.status === 'available' && { color: ui.green },
                availability.status === 'unavailable' && { color: ui.danger },
              ]}
            >
              {availability.status === 'checking'
                ? t('username.checking')
                : availability.status === 'available'
                  ? t('username.available')
                  : t('username.unavailable', {
                      reason: availability.reason ?? t('username.fallback'),
                    })}
            </Text>
          )}
          <Text style={shared.small}>{t('identity.keepHint')}</Text>
          <Button
            disabled={
              busy ||
              draft.length < 3 ||
              draft === identity.username ||
              availability.status === 'unavailable' ||
              availability.status === 'checking'
            }
            onPress={() => void save({ username: draft })}
          >
            {busy ? t('identity.saving') : t('identity.saveUsername')}
          </Button>
          <Button secondary compact onPress={() => setEditing(false)}>
            {t('common:actions.cancel')}
          </Button>
        </>
      ) : (
        <Button
          secondary
          compact
          onPress={() => {
            setDraft(identity.username);
            setEditing(true);
          }}
        >
          {t('identity.changeUsername')}
        </Button>
      )}

      <Label>{t('identity.pickAvatar')}</Label>
      <View style={s.avatars}>
        {AVATARS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={t('identity.avatarA11y', { emoji })}
            accessibilityState={{ selected: identity.avatar === emoji }}
            disabled={busy}
            onPress={() => void save({ avatar: emoji })}
            android_ripple={{ color: `${theme.accent}30` }}
            style={[
              s.avatar,
              { backgroundColor: theme.surface },
              identity.avatar === emoji && {
                borderColor: theme.accent,
                backgroundColor: `${theme.accent}1c`,
              },
            ]}
          >
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <Text accessibilityLiveRegion="polite" style={shared.error}>
          {text(error)}
        </Text>
      )}
      {notice && !error && (
        <Body>
          <Text style={{ color: ui.green }}>{text(notice)}</Text>
        </Body>
      )}
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  handle: { color: ui.text, fontSize: 19, fontWeight: '800' },
  id: { color: ui.gold, fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: ui.inset,
    paddingLeft: 13,
  },
  at: { color: ui.subtle, fontSize: 16, fontWeight: '800' },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 8,
    color: ui.text,
    fontSize: 16,
  },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
