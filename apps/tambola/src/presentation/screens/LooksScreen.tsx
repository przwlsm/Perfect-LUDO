import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  DABBERS,
  FUN_VOICE,
  TICKET_THEMES,
  type Dabber,
  type TicketTheme,
} from '@/domain/entities/Look';
import { generateTicket } from '@/application/tickets';
import { ticketNumbers } from '@/domain/entities/Ticket';
import type { Resources } from '../i18n/en';
import { AppText, Badge, Button, Card, Pressy, Sheet } from '../components/Kit';
import { Page } from '../components/Page';
import { useEntitlements, type AdOutcome, type Item } from '../state/EntitlementsProvider';
import { useLooks } from '../state/hooks';
import { useSettings } from '../state/SettingsProvider';
import { TicketView } from '../ticket/TicketView';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const SAMPLE = generateTicket(2026);
const SAMPLE_DAUBS = new Set(ticketNumbers(SAMPLE).filter((_, i) => i % 3 === 0));

interface Locked {
  readonly item: Item;
  readonly name: string;
  readonly apply: () => void;
  /** A ticket theme is previewed in the offer. */
  readonly look?: TicketTheme;
}

export function LooksScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, sounds, haptics } = useSettings();
  const ent = useEntitlements();
  const { look: activeLook, dabber: activeDabber } = useLooks();
  const [locked, setLocked] = useState<Locked | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const status = (item: Item, active: boolean) => {
    if (active) return <Badge label={t('looks.inUse')} icon="checkmark" tone="accent" />;
    if (!item.premium) return null;
    if (ent.plus) return null;
    const left = ent.passLeft(item);
    if (left > 0) {
      const hours = Math.floor(left / 3_600_000);
      return (
        <Badge
          tone="second"
          icon="time-outline"
          label={
            hours >= 1
              ? t('looks.pass', { hours })
              : t('looks.passMinutes', { minutes: Math.ceil(left / 60_000) })
          }
        />
      );
    }
    return <Badge tone="muted" icon="lock-closed" label={t('looks.plus')} />;
  };

  const choose = (item: Item, name: string, apply: () => void, look?: TicketTheme) => {
    if (ent.isOpen(item)) {
      apply();
      haptics.tap();
      return;
    }
    setNote(null);
    ent.warmAds();
    setLocked({ item, name, apply, look });
  };

  const watch = async () => {
    if (!locked) return;
    setBusy(true);
    const outcome: AdOutcome = await ent.watchFor(locked.item);
    setBusy(false);
    setNote(t(`looks.${outcome}`));
    if (outcome === 'granted') {
      locked.apply();
      sounds.play('cheer');
      haptics.delight();
    }
  };

  return (
    <Page title={t('looks.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('looks.lead')}
      </AppText>

      <AppText variant="label">{t('looks.themes')}</AppText>
      {TICKET_THEMES.map((look) => (
        <ThemeCard
          key={look.id}
          look={look}
          dabber={activeDabber}
          name={t(`looks.themeNames.${look.id as ThemeKey}`)}
          active={activeLook.id === look.id}
          open={ent.isOpen(look)}
          badge={status(look, activeLook.id === look.id)}
          onPress={(name) => choose(look, name, () => update({ ticketTheme: look.id }), look)}
        />
      ))}

      <AppText variant="label" style={styles.section}>
        {t('looks.dabbers')}
      </AppText>
      <Card style={styles.dabbers}>
        {DABBERS.map((d) => {
          const name = t(`looks.dabberNames.${d.id as DabberKey}`);
          const active = activeDabber.id === d.id;
          return (
            <Pressy
              key={d.id}
              onPress={() => choose(d, name, () => update({ dabber: d.id }))}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={
                active
                  ? t('looks.selectedA11y', { name })
                  : ent.isOpen(d)
                    ? name
                    : t('looks.lockedA11y', { name })
              }
              style={styles.dabber}
            >
              <DabSwatch dabber={d} active={active} cell={activeLook.cell} ink={activeLook.ink} />
              <AppText variant="caption" center color={theme.text} numberOfLines={1}>
                {name}
              </AppText>
              <View style={styles.dabberBadge}>{status(d, false)}</View>
            </Pressy>
          );
        })}
      </Card>

      <AppText variant="label" style={styles.section}>
        {t('looks.voice')}
      </AppText>
      <Pressy
        onPress={() =>
          choose(FUN_VOICE, t('looks.funVoice'), () => update({ funVoice: true, voice: true }))
        }
        accessibilityLabel={t('looks.funVoice')}
      >
        <Card style={styles.voice}>
          <View style={[styles.voiceIcon, { backgroundColor: theme.second }]}>
            <Ionicons name="mic" size={24} color={theme.onSecond} />
          </View>
          <View style={styles.flex}>
            <View style={styles.voiceHead}>
              <AppText variant="heading">{t('looks.funVoice')}</AppText>
              {status(FUN_VOICE, ent.isOpen(FUN_VOICE) && settings.funVoice && settings.voice)}
            </View>
            <AppText variant="caption">{t('looks.funVoiceBody')}</AppText>
          </View>
        </Card>
      </Pressy>

      <Sheet
        visible={!!locked}
        onClose={() => setLocked(null)}
        title={
          locked?.item.id === FUN_VOICE.id
            ? t('looks.lockedVoiceTitle')
            : t('looks.lockedTitle', { name: locked?.name ?? '' })
        }
      >
        {locked?.look && (
          <View style={styles.noTouch} importantForAccessibility="no-hide-descendants">
            <TicketView
              grid={SAMPLE}
              label={locked.name}
              look={locked.look}
              dabber={activeDabber}
              daubed={SAMPLE_DAUBS}
            />
          </View>
        )}
        <AppText variant="body" color={theme.muted}>
          {t('looks.lockedBody')}
        </AppText>
        <Button
          icon="sparkles"
          label={t('looks.getPlus')}
          onPress={() => {
            setLocked(null);
            router.push('/support');
          }}
        />
        {ent.adsReady && (
          <>
            <Button
              kind="secondary"
              icon="play-circle-outline"
              label={t('looks.watch')}
              busy={busy}
              disabled={ent.adsLeft() <= 0}
              onPress={() => void watch()}
            />
            <AppText variant="caption" center>
              {t('looks.watchesLeft', { count: ent.adsLeft() })}
            </AppText>
          </>
        )}
        {!ent.adsReady && (
          <AppText variant="caption" center>
            {t('looks.unavailable')}
          </AppText>
        )}
        {note && (
          <AppText variant="body" center accessibilityLiveRegion="polite">
            {note}
          </AppText>
        )}
      </Sheet>
    </Page>
  );
}

type ThemeKey = keyof Resources['looks']['themeNames'];
type DabberKey = keyof Resources['looks']['dabberNames'];

function ThemeCard({
  look,
  dabber,
  name,
  active,
  open,
  badge,
  onPress,
}: {
  look: TicketTheme;
  dabber: Dabber;
  name: string;
  active: boolean;
  open: boolean;
  badge: React.ReactNode;
  onPress: (name: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const daubs = useMemo(() => SAMPLE_DAUBS, []);
  return (
    <Pressy
      onPress={() => onPress(name)}
      depth={0.98}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={
        active ? t('looks.selectedA11y', { name }) : open ? name : t('looks.lockedA11y', { name })
      }
      style={[
        styles.themeCard,
        {
          borderColor: active ? theme.accent : 'transparent',
          backgroundColor: active ? theme.surface : 'transparent',
        },
      ]}
    >
      <View style={styles.noTouch} importantForAccessibility="no-hide-descendants">
        <TicketView grid={SAMPLE} label={name} look={look} dabber={dabber} daubed={daubs} />
      </View>
      <View style={styles.themeFoot}>
        <AppText variant="heading" style={styles.flex}>
          {name}
        </AppText>
        {badge}
      </View>
    </Pressy>
  );
}

function DabSwatch({
  dabber,
  active,
  cell,
  ink,
}: {
  dabber: Dabber;
  active: boolean;
  cell: string;
  ink: string;
}) {
  const theme = useTheme();
  const shape =
    dabber.shape === 'dot' ? (
      <View style={[styles.swatchDot, { backgroundColor: dabber.color }]} />
    ) : dabber.shape === 'ring' ? (
      <View style={[styles.swatchDot, { borderColor: dabber.color, borderWidth: 5 }]} />
    ) : (
      <Ionicons name={dabber.shape} size={56} color={dabber.color} />
    );
  return (
    <View
      style={[
        styles.swatch,
        {
          backgroundColor: cell,
          borderColor: active ? theme.accent : theme.border,
          borderWidth: active ? 3 : 1,
        },
      ]}
    >
      {shape}
      <View style={[StyleSheet.absoluteFill, styles.swatchCenter]}>
        <Text
          allowFontScaling={false}
          style={[styles.swatchNumber, { color: dabber.shape === 'ring' ? ink : dabber.onColor }]}
        >
          22
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  flex: { flex: 1 },
  section: { marginTop: 8 },
  themeCard: { borderRadius: 24, borderWidth: 3, padding: 6, gap: 8 },
  themeFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  dabbers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  dabber: { width: '23%', alignItems: 'center', gap: 4, paddingVertical: 6 },
  dabberBadge: { minHeight: 18 },
  swatch: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: { width: 46, height: 46, borderRadius: 23 },
  swatchCenter: { alignItems: 'center', justifyContent: 'center' },
  swatchNumber: { fontFamily: FONTS.displayBold, fontSize: 22 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  voiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
