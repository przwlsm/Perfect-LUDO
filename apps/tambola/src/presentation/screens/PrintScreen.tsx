import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Canvas, Image as SkiaImage, useFont } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import {
  cleanCode,
  CODE_LENGTH,
  decodeRoom,
  randomStripCode,
  stripFor,
  ALPHABET,
} from '@/application/room';
import { STRIP_SIZE } from '@/application/tickets';
import { sharer } from '@/config/container';
import { AppText, Button, Card, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useGame } from '../state/GameProvider';
import { useLooks } from '../state/hooks';
import { useSettings } from '../state/SettingsProvider';
import { drawTicketSheet, SHEET_WIDTH, sheetHeight } from '../ticket/ticketImage';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const FREDOKA = require('@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf');

function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export function PrintScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string; strip?: string; count?: string }>();
  const { host, player } = useGame();
  const { plus } = useEntitlements();
  const { haptics } = useSettings();
  const { look } = useLooks();
  const font = useFont(FREDOKA, 40);
  const [input, setInput] = useState(() => param(params.code) || host?.code || player?.code || '');
  const [strip, setStrip] = useState(() => {
    const s = param(params.strip).toUpperCase();
    return s.length === 4 && [...s].every((ch) => ALPHABET.includes(ch))
      ? s
      : randomStripCode(Math.random);
  });
  const [count, setCount] = useState(() =>
    Math.min(STRIP_SIZE, Math.max(1, Number(param(params.count)) || 2)),
  );
  const [width, setWidth] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const room = cleanCode(input).length === CODE_LENGTH ? decodeRoom(input) : null;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void sharer.supported().then(setCanShare);
  }, []);

  const tickets = useMemo(
    () =>
      room
        ? stripFor(room.code, strip)
            .slice(0, count)
            .map((grid, i) => ({ id: `${strip}-${i + 1}`, grid }))
        : [],
    [room, strip, count],
  );

  const image = useMemo(() => {
    if (!font || tickets.length === 0 || !room) return null;
    return drawTicketSheet(tickets, look, font, {
      title: t('print.imageTitle'),
      room: t('print.imageRoom', { code: room.code }),
      footer: t('print.imageFooter'),
      ticketLabel: (id) => t('play.ticket', { id }),
      watermark: plus ? null : t('app.name'),
    });
  }, [font, tickets, look, room, t, plus]);

  const share = async () => {
    if (!image || !room) return;
    setBusy(true);
    setError(false);
    try {
      await sharer.sharePng(
        image.encodeToBase64(),
        `tambola-${room.code}-${strip}.png`,
        t('print.shareTitle'),
      );
      haptics.delight();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const previewH =
    width > 0 && tickets.length > 0 ? (width * sheetHeight(tickets.length)) / SHEET_WIDTH : 0;

  return (
    <Page
      title={t('print.title')}
      footer={
        room ? (
          <>
            <Button
              big
              icon="share-social"
              label={t('print.share')}
              busy={busy}
              disabled={!canShare || !image}
              onPress={() => void share()}
            />
            {!canShare && (
              <AppText variant="caption" center>
                {t('print.unsupported')}
              </AppText>
            )}
          </>
        ) : undefined
      }
    >
      <AppText variant="body" color={theme.muted}>
        {t('print.lead')}
      </AppText>
      <Card style={styles.card}>
        <AppText variant="label">{t('print.room')}</AppText>
        <TextInput
          value={input}
          onChangeText={(v) => setInput(v.toUpperCase())}
          placeholder="••••••"
          placeholderTextColor={theme.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          accessibilityLabel={t('print.room')}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.surfaceRaised,
              borderColor: room ? theme.success : theme.border,
            },
          ]}
        />
        <AppText variant="caption">{room ? t('print.roomHint') : t('print.needRoom')}</AppText>
        <AppText variant="label">{t('print.count')}</AppText>
        <View style={styles.row}>
          <View style={styles.counts} accessibilityRole="radiogroup">
            {Array.from({ length: STRIP_SIZE }, (_, i) => i + 1).map((n) => (
              <Pressy
                key={n}
                onPress={() => setCount(n)}
                accessibilityRole="radio"
                accessibilityState={{ checked: n === count }}
                accessibilityLabel={t('join.ticketCount', { count: n })}
                style={[
                  styles.count,
                  {
                    backgroundColor: n === count ? theme.accent : theme.surfaceRaised,
                    borderColor: n === count ? 'transparent' : theme.border,
                  },
                ]}
              >
                <AppText variant="heading" color={n === count ? theme.onAccent : theme.text}>
                  {n}
                </AppText>
              </Pressy>
            ))}
          </View>
        </View>
        <Button
          compact
          kind="secondary"
          icon="shuffle"
          label={t('print.shuffle')}
          onPress={() => setStrip(randomStripCode(Math.random))}
        />
      </Card>

      {room && (
        <View
          style={[styles.preview, { borderColor: theme.border }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={tickets.map((tk) => t('play.ticket', { id: tk.id })).join(', ')}
        >
          {image && previewH > 0 && (
            <Canvas style={{ width, height: previewH }}>
              <SkiaImage image={image} x={0} y={0} width={width} height={previewH} fit="contain" />
            </Canvas>
          )}
        </View>
      )}
      {room && !plus && (
        <AppText variant="caption" center>
          {t('print.watermark')}
        </AppText>
      )}
      {error && (
        <AppText variant="body" center color={theme.danger}>
          {t('print.failed')}
        </AppText>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  input: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
    fontFamily: FONTS.displayBold,
    fontSize: 30,
    letterSpacing: 6,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  counts: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  count: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
});
