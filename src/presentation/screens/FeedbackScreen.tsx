import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import type { FeedbackCategory } from '@/domain';
import { FEEDBACK_MESSAGE_MAX } from '@/domain';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { feedbackMailto, useFeedback } from '../hooks/useFeedback';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

/** Replace with an inbox your team actually reads before shipping. */
export const FEEDBACK_SUPPORT_EMAIL = 'support@ludoclub.app';

const CATEGORIES: readonly { readonly id: FeedbackCategory; readonly label: string }[] = [
  { id: 'bug', label: 'Something broke' },
  { id: 'suggestion', label: 'An idea' },
  { id: 'other', label: 'Something else' },
];

export default function FeedbackScreen() {
  const { theme } = useProfile();
  const feedback = useFeedback();
  const { draft } = feedback;

  const emailFallback = () => {
    void Linking.openURL(feedbackMailto(draft, FEEDBACK_SUPPORT_EMAIL)).catch(() => undefined);
  };

  return (
    <Screen title="Tell us what you think." subtitle="FEEDBACK & SUGGESTIONS" back nav={false}>
      <Body>
        Found a bug, or have an idea that would make the club better? We read every message.
      </Body>
      <Card>
        <Label color={theme.accent}>WHAT’S THIS ABOUT?</Label>
        <View style={s.tabs}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.category === c.id }}
              onPress={() => feedback.setCategory(c.id)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[s.tab, draft.category === c.id && { backgroundColor: theme.accent }]}
            >
              <Text style={[s.tabText, draft.category === c.id && { color: '#211d19' }]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 7 }}>
          <View style={shared.between}>
            <Label>YOUR MESSAGE</Label>
            <Text style={shared.small}>
              {draft.message.length}/{FEEDBACK_MESSAGE_MAX}
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Your message"
            value={draft.message}
            onChangeText={feedback.setMessage}
            editable={!feedback.busy}
            placeholder={
              draft.category === 'bug'
                ? 'What happened, and what did you expect instead? Which screen were you on?'
                : draft.category === 'suggestion'
                  ? 'What would make this better?'
                  : "What's on your mind?"
            }
            placeholderTextColor={ui.muted}
            multiline
            maxLength={FEEDBACK_MESSAGE_MAX}
            style={s.textarea}
          />
        </View>
        <View style={{ gap: 7 }}>
          <Label>YOUR EMAIL (OPTIONAL)</Label>
          <TextInput
            accessibilityLabel="Your email, optional"
            value={draft.contactEmail}
            onChangeText={feedback.setContactEmail}
            editable={!feedback.busy}
            placeholder="Only if you'd like a reply"
            placeholderTextColor={ui.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={s.input}
          />
        </View>
        {feedback.sent && (
          <Text accessibilityLiveRegion="polite" style={{ color: ui.green, fontWeight: '700' }}>
            Thanks — your message is on its way to us.
          </Text>
        )}
        {feedback.error && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {feedback.error}
          </Text>
        )}
        {feedback.available ? (
          <Button disabled={feedback.busy} onPress={() => void feedback.submit()}>
            {feedback.busy ? 'Sending…' : 'Send to the club'}
          </Button>
        ) : (
          <>
            <Body>
              This build isn’t connected to our server, but you can still reach us by email.
            </Body>
            <Button onPress={emailFallback}>Email us instead</Button>
          </>
        )}
        {feedback.available && draft.message.trim().length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={emailFallback}
            style={{ alignSelf: 'center' }}
          >
            <Text style={[shared.small, { textDecorationLine: 'underline' }]}>
              Prefer email? Send it to {FEEDBACK_SUPPORT_EMAIL} instead
            </Text>
          </Pressable>
        )}
      </Card>
      <Button secondary onPress={() => router.back()}>
        Done
      </Button>
    </Screen>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff12',
  },
  tabText: { fontSize: 13, fontWeight: '800', color: ui.text },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ffffff28',
    borderRadius: 12,
    backgroundColor: '#00000020',
    color: ui.text,
    fontSize: 15,
    padding: 14,
    textAlignVertical: 'top',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#ffffff28',
    borderRadius: 12,
    backgroundColor: '#00000020',
    color: ui.text,
    fontSize: 15,
    paddingHorizontal: 14,
  },
});
