import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { cleanCode, CODE_LENGTH, decodeRoom, findRoomInText } from '@/application/room';
import { STRIP_SIZE } from '@/application/tickets';
import { AppText, Badge, Button, Card, Pressy, Sheet } from '../components/Kit';
import { Page } from '../components/Page';
import { useGame } from '../state/GameProvider';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

export function JoinScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string }>();
  const { player, join } = useGame();
  const { sounds } = useSettings();
  const [input, setInput] = useState(() => (params.code ? cleanCode(params.code).slice(0, 6) : ''));
  const [count, setCount] = useState(2);
  const [confirm, setConfirm] = useState(false);
  const code = cleanCode(input);
  const room = code.length === CODE_LENGTH ? decodeRoom(code) : null;
  const bad = code.length >= CODE_LENGTH && !room;
  const sameRoom = !!room && player?.code === room.code;

  const paste = () => {
    void Clipboard.getStringAsync()
      .then((text) => {
        const found = findRoomInText(text);
        setInput(found ? found.code : cleanCode(text).slice(0, CODE_LENGTH));
      })
      .catch(() => undefined);
  };

  const go = () => {
    if (!room) return;
    join(room.code, count);
    sounds.play('start');
    router.replace('/play');
  };

  return (
    <Page
      title={t('join.title')}
      festive
      footer={
        room ? (
          sameRoom ? (
            <Button
              big
              icon="grid"
              label={t('join.open')}
              onPress={() => router.replace('/play')}
            />
          ) : (
            <Button
              big
              icon="ticket"
              label={t('join.go')}
              onPress={() => (player ? setConfirm(true) : go())}
            />
          )
        ) : undefined
      }
    >
      <AppText variant="body" color={theme.muted}>
        {t('join.lead')}
      </AppText>
      <Card style={styles.card}>
        <View style={styles.labelRow}>
          <AppText variant="label" style={styles.flex}>
            {t('join.code')}
          </AppText>
          <Button
            compact
            kind="secondary"
            icon="clipboard-outline"
            label={t('join.paste')}
            accessibilityLabel={t('join.pasteA11y')}
            onPress={paste}
          />
        </View>
        <TextInput
          value={input}
          onChangeText={(v) => setInput(v.toUpperCase())}
          placeholder="••••••"
          placeholderTextColor={theme.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          autoFocus={!params.code}
          maxLength={9}
          returnKeyType="done"
          accessibilityLabel={t('join.code')}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.surfaceRaised,
              borderColor: bad ? theme.danger : room ? theme.success : theme.border,
            },
          ]}
        />
        {bad && (
          <AppText variant="body" color={theme.danger} accessibilityLiveRegion="polite">
            {t('join.bad')}
          </AppText>
        )}
        {room && (
          <View style={styles.found} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={22} color={theme.successText} />
            <AppText variant="heading" color={theme.successText}>
              {t('join.good', { code: room.code })}
            </AppText>
          </View>
        )}
        {room && (
          <View style={styles.prizes}>
            <AppText variant="caption">{t('join.playingFor')}</AppText>
            <View style={styles.badges}>
              {room.prizes.map((p) => (
                <Badge key={p} tone="muted" label={t(`prizes.${p}`)} />
              ))}
            </View>
          </View>
        )}
      </Card>

      {room && sameRoom && (
        <AppText variant="body" center>
          {t('join.already', { code: room.code })}
        </AppText>
      )}

      {room && !sameRoom && (
        <Card style={styles.card}>
          <AppText variant="label">{t('join.tickets')}</AppText>
          <View style={styles.counts} accessibilityRole="radiogroup">
            {Array.from({ length: STRIP_SIZE }, (_, i) => i + 1).map((n) => {
              const active = n === count;
              return (
                <Pressy
                  key={n}
                  onPress={() => setCount(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={t('join.ticketCount', { count: n })}
                  style={[
                    styles.count,
                    {
                      backgroundColor: active ? theme.accent : theme.surfaceRaised,
                      borderColor: active ? 'transparent' : theme.border,
                    },
                  ]}
                >
                  <AppText variant="title" color={active ? theme.onAccent : theme.text}>
                    {n}
                  </AppText>
                </Pressy>
              );
            })}
          </View>
          <AppText variant="heading" center>
            {t('join.ticketCount', { count })}
          </AppText>
          <AppText variant="caption" center>
            {t('join.ticketsHint')}
          </AppText>
        </Card>
      )}

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={t('join.replaceTitle')}>
        <AppText variant="body" color={theme.muted}>
          {t('join.replaceBody', { code: player?.code ?? '' })}
        </AppText>
        <Button
          label={t('join.replace')}
          onPress={() => {
            setConfirm(false);
            go();
          }}
        />
        <Button kind="secondary" label={t('common.cancel')} onPress={() => setConfirm(false)} />
      </Sheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 18,
    fontFamily: FONTS.displayBold,
    fontSize: 38,
    letterSpacing: 8,
    textAlign: 'center',
  },
  found: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prizes: { gap: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  counts: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  count: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
