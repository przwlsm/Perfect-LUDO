import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { withAlpha } from 'app-kit';
import type { PrizeId } from '@/domain/entities/Prize';
import { calledSet, callOrder } from '@/application/calling';
import { checkClaim, prizeNumbers, type ClaimCheck } from '@/application/claims';
import { decodeRoom, formatTicketId, parseTicketId, ticketFor } from '@/application/room';
import { AppText, Button, Card, Chip } from '../components/Kit';
import { Page } from '../components/Page';
import { Confetti, useWobble } from '../effects/Confetti';
import { useGame } from '../state/GameProvider';
import { useAnnouncer, useLooks } from '../state/hooks';
import { useSettings } from '../state/SettingsProvider';
import { TicketView } from '../ticket/TicketView';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

interface Verdict {
  readonly ticket: string;
  readonly prize: PrizeId;
  readonly result: ClaimCheck;
}

export function ClaimCheckScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { host, hostAward } = useGame();
  const { sounds, haptics } = useSettings();
  const { look, dabber } = useLooks();
  const announcer = useAnnouncer();
  const [input, setInput] = useState('');
  const [prize, setPrize] = useState<PrizeId | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [name, setName] = useState('');
  const [burst, setBurst] = useState(0);
  const [nudge, setNudge] = useState(0);
  const wobble = useWobble(nudge);

  useEffect(() => {
    if (!host) router.replace('/');
  }, [host]);
  const room = useMemo(() => (host ? decodeRoom(host.code) : null), [host]);
  const called = useMemo(
    () => (room && host ? calledSet(callOrder(room.seed), host.called) : new Set<number>()),
    [room, host],
  );
  const id = parseTicketId(input);
  const badId = input.replace(/[\s-]/g, '').length >= 5 && !id;
  const grid = useMemo(
    () => (verdict && host ? ticketFor(host.code, parseTicketId(verdict.ticket)!) : null),
    [verdict, host],
  );
  if (!host || !room) return null;

  const winnerOf = (p: PrizeId) => host.wins.filter((w) => w.prize === p);

  const check = () => {
    if (!id || !prize) return;
    const ticket = formatTicketId(id);
    const result = checkClaim(ticketFor(host.code, id), prize, called);
    setVerdict({ ticket, prize, result });
    if (result.valid) {
      sounds.play('cheer');
      haptics.delight();
      setBurst((b) => b + 1);
      announcer.say(
        t('check.sayWinner', { prize: t(`prizes.${prize}`), ticket: ticket.split('').join(' ') }),
      );
    } else {
      sounds.play('bogus');
      haptics.thump();
      setNudge((n) => n + 1);
      announcer.say(t('check.sayBogus'));
    }
  };

  const award = () => {
    if (!verdict) return;
    hostAward({
      prize: verdict.prize,
      ticket: verdict.ticket,
      name: name.trim().slice(0, 40),
      atCall: host.called,
    });
    router.back();
  };

  const needed = verdict && grid ? prizeNumbers(grid, verdict.prize) : null;
  const focus = new Set(verdict && verdict.prize !== 'early5' ? (needed?.numbers ?? []) : []);
  const missing = new Set(verdict && verdict.prize !== 'early5' ? verdict.result.missing : []);
  const daubed = new Set(grid ? [...called].filter((n) => grid.some((r) => r.includes(n))) : []);
  const earlier = verdict ? winnerOf(verdict.prize) : [];

  return (
    <View style={styles.flex}>
      <Page title={t('check.title')}>
        <Card style={styles.card}>
          <AppText variant="label">{t('check.ticketId')}</AppText>
          <TextInput
            value={input}
            onChangeText={(v) => {
              setInput(v.toUpperCase());
              setVerdict(null);
            }}
            placeholder={t('check.placeholder')}
            placeholderTextColor={theme.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={check}
            accessibilityLabel={t('check.ticketId')}
            accessibilityHint={t('check.ticketHint')}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.surfaceRaised,
                borderColor: badId ? theme.danger : id ? theme.success : theme.border,
              },
            ]}
          />
          <AppText variant="caption" color={badId ? theme.danger : theme.muted}>
            {badId ? t('check.badId') : t('check.ticketHint')}
          </AppText>
          <AppText variant="label" style={styles.space}>
            {t('check.prize')}
          </AppText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {room.prizes.map((p) => (
              <Chip
                key={p}
                role="radio"
                label={t(`prizes.${p}`)}
                selected={prize === p}
                icon={winnerOf(p).length > 0 ? 'ribbon' : undefined}
                onPress={() => {
                  setPrize(p);
                  setVerdict(null);
                }}
              />
            ))}
          </View>
          <Button icon="search" label={t('check.check')} disabled={!id || !prize} onPress={check} />
          <AppText variant="caption" center>
            {t('check.calledSoFar', { count: host.called })}
          </AppText>
        </Card>

        {verdict && grid && (
          <Animated.View style={[styles.result, wobble]}>
            <View
              style={[
                styles.verdict,
                {
                  backgroundColor: withAlpha(
                    verdict.result.valid ? theme.success : theme.danger,
                    theme.scheme === 'night' ? 0.16 : 0.1,
                  ),
                  borderColor: verdict.result.valid ? theme.success : theme.danger,
                },
              ]}
              accessibilityLiveRegion="assertive"
            >
              <Ionicons
                name={verdict.result.valid ? 'trophy' : 'close-circle'}
                size={40}
                color={verdict.result.valid ? theme.successText : theme.danger}
              />
              <View style={styles.flex}>
                <AppText
                  variant="display"
                  color={verdict.result.valid ? theme.successText : theme.danger}
                >
                  {verdict.result.valid ? t('check.valid') : t('check.bogus')}
                </AppText>
                <AppText variant="body">
                  {t(verdict.result.valid ? 'check.validBody' : 'check.bogusBody', {
                    prize: t(`prizes.${verdict.prize}`),
                    ticket: verdict.ticket,
                  })}
                </AppText>
                {!verdict.result.valid &&
                  (verdict.prize === 'early5' ? (
                    <AppText variant="heading" color={theme.danger}>
                      {t('check.earlyShort', { count: verdict.result.short })}
                    </AppText>
                  ) : (
                    <AppText variant="heading" color={theme.danger}>
                      {t('check.notCalled', { list: verdict.result.missing.join(' · ') })}
                    </AppText>
                  ))}
              </View>
            </View>

            <TicketView
              grid={grid}
              label={t('play.ticket', { id: verdict.ticket })}
              look={look}
              dabber={dabber}
              daubed={daubed}
              focus={focus}
              missing={missing}
            />
            <View style={styles.legend}>
              <Legend color={dabber.color} label={t('check.legendCalled')} filled />
              {verdict.prize !== 'early5' && (
                <Legend color={look.header} label={t('check.legendNeeded')} />
              )}
              {missing.size > 0 && <Legend color="#e53935" label={t('check.legendMissing')} />}
            </View>

            {verdict.result.valid ? (
              <Card style={styles.card}>
                {earlier.length > 0 && (
                  <AppText variant="caption" color={theme.text}>
                    {t('check.alreadyWon', {
                      who: earlier
                        .map((w) => (w.name ? `${w.name} (${w.ticket})` : w.ticket))
                        .join(', '),
                    })}
                  </AppText>
                )}
                <AppText variant="label">{t('check.name')}</AppText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('check.namePlaceholder')}
                  placeholderTextColor={theme.faint}
                  maxLength={40}
                  accessibilityLabel={t('check.name')}
                  style={[
                    styles.nameInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.surfaceRaised,
                      borderColor: theme.border,
                    },
                  ]}
                />
                <Button
                  big
                  icon="ribbon"
                  label={t(earlier.length > 0 ? 'check.shareAward' : 'check.award', {
                    prize: t(`prizes.${verdict.prize}`),
                  })}
                  onPress={award}
                />
              </Card>
            ) : (
              <Button
                kind="secondary"
                icon="arrow-back"
                label={t('check.back')}
                onPress={() => router.back()}
              />
            )}
          </Animated.View>
        )}
      </Page>
      <Confetti burst={burst} />
    </View>
  );
}

function Legend({ color, label, filled }: { color: string; label: string; filled?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          filled ? { backgroundColor: color } : { borderColor: color, borderWidth: 2.5 },
        ]}
      />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 12 },
  space: { marginTop: 4 },
  input: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
    fontFamily: FONTS.displayBold,
    fontSize: 30,
    letterSpacing: 4,
    textAlign: 'center',
  },
  nameInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  result: { gap: 14 },
  verdict: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 8 },
});
