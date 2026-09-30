import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { socialIdentityRepository } from '@/config/container';
import { Body, Button, Card, Label, shared } from '../components/Kit';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { ui } from '../theme/themes';
import { SIGN_UP_HREF } from './AccountGate';
import { UserAvatar } from './UserAvatar';

const AVATARS = ['🎲', '♟', '🦊', '🐼', '🐙', '🚀', '⭐', '🍀', '🔥', '🎯'];

/** The handle and ID friends search for, kept separate from the private profile. */
export function SocialIdentityCard() {
  const { theme, profile } = useProfile();
  const { enabled, signedIn, account, identity, setIdentity } = useSocial();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const availability = useUsernameAvailability(
    editing && draft !== identity?.username ? draft : '',
  );

  if (!enabled || !signedIn || !identity) return null;

  async function save(changes: { username?: string; avatar?: string }) {
    if (!socialIdentityRepository) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setIdentity(await socialIdentityRepository.update(changes));
      setEditing(false);
      setNotice('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function copyId() {
    if (!identity?.publicId) return;
    try {
      await Clipboard.setStringAsync(identity.publicId);
      setNotice('User ID copied.');
    } catch {
      setError('Could not copy. Your ID is ' + identity.publicId + '.');
    }
  }

  async function shareProfile() {
    if (!identity) return;
    const line = `Add me on Ludo Rumble: @${identity.username}${
      identity.publicId ? ` (User ID ${identity.publicId})` : ''
    }`;
    try {
      await Share.share({ message: line });
    } catch {
      // Sharing is a convenience; the ID is still on screen.
    }
  }

  if (account === 'guest') {
    return (
      <Card style={{ borderColor: `${theme.accent}40` }}>
        <Label color={theme.accent}>PLAYING AS A GUEST</Label>
        <View style={shared.row}>
          <UserAvatar id={identity.id} name={identity.username} emoji={identity.avatar} size={54} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.handle}>@{identity.username}</Text>
            <Text style={shared.small}>Temporary · no permanent User ID yet</Text>
          </View>
        </View>
        <Text style={shared.sectionTitle}>
          {profile.games > 0
            ? `You’ve played ${profile.games} ${profile.games === 1 ? 'game' : 'games'} as a guest.`
            : 'Make this seat yours.'}
        </Text>
        <Body>
          Create an account to save your game history and continue your progress, choose a username,
          get a User ID friends can search for, and unlock friends and challenges.
        </Body>
        <Button onPress={() => router.push(SIGN_UP_HREF)}>Sign Up</Button>
        <Button
          secondary
          compact
          onPress={() => router.push({ pathname: '/login', params: { intent: 'online' } })}
        >
          Login
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <Label color={theme.accent}>HOW FRIENDS FIND YOU</Label>
      <View style={shared.row}>
        <UserAvatar
          id={identity.id}
          name={identity.displayName ?? identity.username}
          emoji={identity.avatar}
          size={54}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.handle}>@{identity.username}</Text>
          <Text style={s.id} accessibilityLabel={`User ID ${identity.publicId ?? 'pending'}`}>
            User ID: {identity.publicId ?? '—'}
          </Text>
          <Text style={shared.small}>Friends can search either one. The ID never changes.</Text>
        </View>
      </View>

      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button secondary compact disabled={!identity.publicId} onPress={() => void copyId()}>
            Copy ID
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button secondary compact onPress={() => void shareProfile()}>
            Share profile
          </Button>
        </View>
      </View>

      {editing ? (
        <>
          <Label>NEW USERNAME</Label>
          <View style={[s.field, { borderColor: `${theme.accent}55` }]}>
            <Text style={s.at}>@</Text>
            <TextInput
              accessibilityLabel="New username"
              value={draft}
              onChangeText={(text) => setDraft(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={16}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="3–16 letters, numbers or _"
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
                ? 'Checking…'
                : availability.status === 'available'
                  ? '✓ Username available'
                  : `✕ ${availability.reason}`}
            </Text>
          )}
          <Text style={shared.small}>
            Your friends, history and User ID stay attached to you when your username changes.
          </Text>
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
            {busy ? 'Saving…' : 'Save username'}
          </Button>
          <Button secondary compact onPress={() => setEditing(false)}>
            Cancel
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
          Change username
        </Button>
      )}

      <Label>PICK AN AVATAR</Label>
      <View style={s.avatars}>
        {AVATARS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={`Use ${emoji} as your avatar`}
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
          {error}
        </Text>
      )}
      {notice && !error && (
        <Body>
          <Text style={{ color: ui.green }}>{notice}</Text>
        </Body>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  handle: { color: ui.text, fontSize: 19, fontWeight: '800' },
  id: { color: ui.gold, fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#00000020',
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
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
