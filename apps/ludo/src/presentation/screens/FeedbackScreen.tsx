import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import { FEEDBACK_CATEGORIES, FEEDBACK_MESSAGE_MAX } from '@/domain';
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { feedbackMailto, useFeedback } from '../hooks/useFeedback';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

/** Replace with an inbox your team actually reads before shipping. */
export const FEEDBACK_SUPPORT_EMAIL = 'support@ludoclub.app';

export default function FeedbackScreen() {
  const { theme } = useProfile();
  const { t } = useTranslation(['account', 'common']);
  const feedback = useFeedback();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const { draft } = feedback;

  const emailFallback = () => {
    void Linking.openURL(feedbackMailto(draft, FEEDBACK_SUPPORT_EMAIL)).catch(() => undefined);
  };

  return (
    <Screen title={t('feedback.title')} subtitle={t('feedback.subtitle')} back nav={false}>
      <Body>{t('feedback.intro')}</Body>
      <Card>
        <Label color={theme.accentText}>{t('feedback.topicLabel')}</Label>
        <View style={s.tabs}>
          {FEEDBACK_CATEGORIES.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.category === id }}
              onPress={() => feedback.setCategory(id)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[s.tab, draft.category === id && { backgroundColor: theme.accent }]}
            >
              <Text style={[s.tabText, draft.category === id && { color: '#211d19' }]}>
                {t(`feedback.categories.${id}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 7 }}>
          <View style={shared.between}>
            <Label>{t('feedback.messageLabel')}</Label>
            <Text style={shared.small}>
              {draft.message.length}/{FEEDBACK_MESSAGE_MAX}
            </Text>
          </View>
          <TextInput
            accessibilityLabel={t('feedback.messageA11y')}
            value={draft.message}
            onChangeText={feedback.setMessage}
            editable={!feedback.busy}
            placeholder={t(`feedback.placeholders.${draft.category}`)}
            placeholderTextColor={ui.muted}
            multiline
            maxLength={FEEDBACK_MESSAGE_MAX}
            style={s.textarea}
          />
        </View>
        <View style={{ gap: 7 }}>
          <Label>{t('feedback.emailLabel')}</Label>
          <TextInput
            accessibilityLabel={t('feedback.emailA11y')}
            value={draft.contactEmail}
            onChangeText={feedback.setContactEmail}
            editable={!feedback.busy}
            placeholder={t('feedback.emailPlaceholder')}
            placeholderTextColor={ui.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={s.input}
          />
        </View>
        {feedback.sent && (
          <Text accessibilityLiveRegion="polite" style={{ color: ui.green, fontWeight: '700' }}>
            {t('feedback.sent')}
          </Text>
        )}
        {feedback.error && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {feedback.error}
          </Text>
        )}
        {feedback.available ? (
          <Button disabled={feedback.busy} onPress={() => void feedback.submit()}>
            {feedback.busy ? t('feedback.sending') : t('feedback.send')}
          </Button>
        ) : (
          <>
            <Body>{t('feedback.offline')}</Body>
            <Button onPress={emailFallback}>{t('feedback.emailUs')}</Button>
          </>
        )}
        {feedback.available && draft.message.trim().length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={emailFallback}
            style={{ alignSelf: 'center', minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={[shared.small, { textDecorationLine: 'underline' }]}>
              {t('feedback.preferEmail', { email: FEEDBACK_SUPPORT_EMAIL })}
            </Text>
          </Pressable>
        )}
      </Card>
      <Button secondary onPress={() => router.back()}>
        {t('common:actions.done')}
      </Button>
    </Screen>
  );
}

const useStyles = makeStyles((ui) => ({
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: ui.fillStrong,
  },
  tabText: { fontSize: 13, fontWeight: '800', color: ui.text },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    backgroundColor: ui.inset,
    color: ui.text,
    fontSize: 15,
    padding: 14,
    textAlignVertical: 'top',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    backgroundColor: ui.inset,
    color: ui.text,
    fontSize: 15,
    paddingHorizontal: 14,
  },
}));
