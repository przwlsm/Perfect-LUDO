import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PrizeId } from '@/domain/entities/Prize';
import { ticketNumbers, type TicketGrid } from '@/domain/entities/Ticket';
import { callOrder, missedNumbers } from '@/application/calling';
import { checkClaim } from '@/application/claims';
import { decodeRoom, stripFor } from '@/application/room';
import { FestiveBackdrop } from '../components/Festive';
import { AppText, Badge, Button, IconButton, Pressy, Sheet, Toggle } from '../components/Kit';
import { useGame } from '../state/GameProvider';
import { useLooks } from '../state/hooks';
import { useSettings } from '../state/SettingsProvider';
import { TicketView } from '../ticket/TicketView';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

interface Ticket {
  readonly id: string;
  readonly grid: TicketGrid;
}

export function PlayScreen() {
  const { player } = useGame();
  useEffect(() => {
    if (!player) router.replace('/');
  }, [player]);
  if (!player) return null;
  return <Play />;
}

function Play() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { player, daub, reshuffle, leave } = useGame();
  const { settings, update, sounds, haptics, seeHint } = useSettings();
  const { look, dabber } = useLooks();
  const session = player!;
  const room = useMemo(() => decodeRoom(session.code), [session.code]);
  const order = useMemo(() => (room ? callOrder(room.seed) : []), [room]);
  const tickets = useMemo<Ticket[]>(
    () =>
      stripFor(session.code, session.strip)
        .slice(0, session.count)
        .map((grid, i) => ({ id: `${session.strip}-${i + 1}`, grid })),
    [session.code, session.strip, session.count],
  );
  const daubed = useMemo(() => new Set(session.daubs), [session.daubs]);
  const missed = useMemo(
    () =>
      settings.missedHelper
        ? missedNumbers(
            order,
            daubed,
            tickets.flatMap((tk) => ticketNumbers(tk.grid)),
          )
        : undefined,
    [settings.missedHelper, order, daubed, tickets],
  );
  const [options, setOptions] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [claiming, setClaiming] = useState<Ticket | null>(null);
  const [warn, setWarn] = useState<PrizeId | null>(null);
  const [shout, setShout] = useState<{ ticket: string; prize: PrizeId } | null>(null);

  const onDaub = useCallback(
    (n: number) => {
      if (daubed.has(n)) {
        sounds.play('undab');
        haptics.tick();
      } else {
        sounds.play('dab');
        haptics.tap();
        if (!settings.hintsSeen.includes('play')) seeHint('play');
      }
      daub(n);
    },
    [daubed, sounds, haptics, daub, settings.hintsSeen, seeHint],
  );

  const pick = (prize: PrizeId) => {
    if (!claiming) return;
    if (!checkClaim(claiming.grid, prize, daubed).valid && warn !== prize) {
      setWarn(prize);
      return;
    }
    setShout({ ticket: claiming.id, prize });
    setClaiming(null);
    setWarn(null);
    sounds.play('chime');
    haptics.delight();
  };

  if (!room) return null;
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FestiveBackdrop lights={false} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.topBar}>
          <IconButton
            icon="home-outline"
            label={t('common.back')}
            onPress={() => router.replace('/')}
          />
          <View style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {t('play.room', { code: room.code })}
            </AppText>
            <AppText variant="caption">{t('play.daubed', { count: session.daubs.length })}</AppText>
          </View>
          <IconButton
            icon="ellipsis-horizontal"
            label={t('play.options')}
            onPress={() => setOptions(true)}
          />
        </View>

        <View style={styles.badges}>
          {room.prizes.map((p) => (
            <Badge key={p} tone="muted" label={t(`prizes.${p}`)} />
          ))}
        </View>

        {!settings.hintsSeen.includes('play') && (
          <View
            style={[styles.hint, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
          >
            <Ionicons name="hand-left" size={20} color={theme.accentText} />
            <AppText variant="body" style={styles.flex}>
              {t('play.hint')}
            </AppText>
          </View>
        )}

        {missed && missed.size > 0 && (
          <View style={[styles.hint, { backgroundColor: theme.glass, borderColor: '#ff9f1c' }]}>
            <Ionicons name="eye" size={18} color="#ff9f1c" />
            <AppText variant="caption" color={theme.text} style={styles.flex}>
              {t('play.missedCount', { count: missed.size })}
            </AppText>
          </View>
        )}

        {tickets.map((tk) => (
          <TicketView
            key={tk.id}
            grid={tk.grid}
            label={t('play.ticket', { id: tk.id })}
            look={look}
            dabber={dabber}
            daubed={daubed}
            missed={missed}
            onDaub={onDaub}
            right={
              <Pressy
                onPress={() => {
                  setWarn(null);
                  setClaiming(tk);
                }}
                accessibilityLabel={t('play.claimA11y', { ticket: tk.id })}
                style={[styles.claim, { backgroundColor: look.headerInk }]}
              >
                <Ionicons name="hand-right" size={15} color={look.header} />
                <Text
                  style={[styles.claimText, { color: look.header }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {t('play.claim')}
                </Text>
              </Pressy>
            }
          />
        ))}
      </ScrollView>

      <Sheet visible={!!claiming} onClose={() => setClaiming(null)} title={t('play.claimTitle')}>
        <AppText variant="caption">{t('play.claimFor', { ticket: claiming?.id ?? '' })}</AppText>
        <ScrollView contentContainerStyle={styles.prizeList}>
          {room.prizes.map((p) => {
            const done = claiming ? checkClaim(claiming.grid, p, daubed).valid : false;
            return (
              <View key={p} style={styles.prizeItem}>
                <Pressy
                  onPress={() => pick(p)}
                  accessibilityLabel={t('solo.claimA11y', { prize: t(`prizes.${p}`) })}
                  style={[
                    styles.prizeRow,
                    {
                      backgroundColor: done ? theme.accent : theme.surfaceRaised,
                      borderColor: warn === p ? theme.danger : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={done ? theme.onAccent : theme.faint}
                  />
                  <View style={styles.flex}>
                    <AppText variant="heading" color={done ? theme.onAccent : theme.text}>
                      {t(`prizes.${p}`)}
                    </AppText>
                    <AppText variant="caption" color={done ? theme.onAccent : theme.muted}>
                      {t(`prizeHelp.${p}`)}
                    </AppText>
                  </View>
                </Pressy>
                {warn === p && (
                  <View style={styles.warn}>
                    <AppText variant="caption" color={theme.text}>
                      {t('play.notYet', { prize: t(`prizes.${p}`) })}
                    </AppText>
                    <Button
                      compact
                      kind="secondary"
                      label={t('play.claimAnyway')}
                      onPress={() => pick(p)}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Sheet>

      <Sheet visible={options} onClose={() => setOptions(false)} title={t('play.options')}>
        <Toggle
          label={t('play.helper')}
          hint={t('play.helperHint')}
          value={settings.missedHelper}
          onChange={(missedHelper) => update({ missedHelper })}
        />
        {session.daubs.length === 0 && (
          <Button
            kind="secondary"
            icon="shuffle"
            label={t('play.reshuffle')}
            onPress={() => {
              reshuffle();
              setOptions(false);
            }}
          />
        )}
        <Button
          kind="secondary"
          icon="image-outline"
          label={t('play.print')}
          onPress={() => {
            setOptions(false);
            router.push({
              pathname: '/print',
              params: { code: session.code, strip: session.strip, count: String(session.count) },
            });
          }}
        />
        <Button
          kind="ghost"
          icon="exit-outline"
          label={t('play.leave')}
          onPress={() => {
            setOptions(false);
            setConfirmLeave(true);
          }}
        />
      </Sheet>

      <Sheet
        visible={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={t('play.leaveTitle')}
      >
        <AppText variant="body" color={theme.muted}>
          {t('play.leaveBody')}
        </AppText>
        <Button
          label={t('play.leaveConfirm')}
          onPress={() => {
            setConfirmLeave(false);
            leave();
            router.replace('/');
          }}
        />
        <Button kind="secondary" label={t('play.stay')} onPress={() => setConfirmLeave(false)} />
      </Sheet>

      <ShoutCard shout={shout} onClose={() => setShout(null)} />
    </View>
  );
}

/** The big card a player holds up: CLAIM!, the prize, and the ticket ID for the host to type. */
function ShoutCard({
  shout,
  onClose,
}: {
  shout: { ticket: string; prize: PrizeId } | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Modal
      visible={!!shout}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.shoutScrim, { backgroundColor: theme.scrim }]}>
        <View
          style={[styles.shoutCard, { backgroundColor: theme.accent }]}
          accessibilityViewIsModal
        >
          <Text style={[styles.shoutTitle, { color: theme.onAccent }]} maxFontSizeMultiplier={1.3}>
            {t('play.shout')}
          </Text>
          <AppText variant="display" center color={theme.onAccent}>
            {shout ? t(`prizes.${shout.prize}`) : ''}
          </AppText>
          <View style={[styles.shoutTicket, { backgroundColor: theme.surface }]}>
            <AppText variant="label" center>
              {t('play.shoutTicket')}
            </AppText>
            <Text
              style={[styles.shoutId, { color: theme.text }]}
              maxFontSizeMultiplier={1.2}
              accessibilityLabel={shout?.ticket.split('').join(' ')}
            >
              {shout?.ticket}
            </Text>
          </View>
          <AppText variant="body" center color={theme.onAccent}>
            {t('play.shoutBody')}
          </AppText>
          <Button kind="secondary" label={t('play.done')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 12, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4 },
  hint: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  claim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  claimText: { fontFamily: FONTS.displayBold, fontSize: 15 },
  prizeList: { gap: 8, paddingBottom: 4 },
  prizeItem: { gap: 6 },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  warn: { gap: 8, paddingHorizontal: 6 },
  shoutScrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  shoutCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 32,
    padding: 24,
    gap: 16,
    alignItems: 'stretch',
  },
  shoutTitle: { fontFamily: FONTS.displayBold, fontSize: 64, lineHeight: 72, textAlign: 'center' },
  shoutTicket: { borderRadius: 22, paddingVertical: 14, gap: 2 },
  shoutId: {
    fontFamily: FONTS.displayBold,
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
    letterSpacing: 4,
  },
});
