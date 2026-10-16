import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { passRemaining } from '@/domain/entities/Entitlements';
import { defaultLook, lookById, looksFor, type Look } from '@/domain/entities/Look';
import { PurchaseRefusedError, PLUS_SKU } from '@/domain/entities/Products';
import type { ToyId } from '@/domain/entities/Toy';
import { AppText, Button, Pressy, Sheet } from '../components/Kit';
import { priceOf, useEntitlements, type AdOutcome } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The look a toy is drawn with: the player's last choice while it is still
 * theirs to use, otherwise the toy's first free look.
 */
export function useLook(toy: ToyId): { look: Look; choose(look: Look): void } {
  const { settings, update } = useSettings();
  const { isOpen } = useEntitlements();
  const chosen = lookById(settings.looks[toy] ?? '');
  const look = chosen && chosen.toy === toy && isOpen(chosen) ? chosen : defaultLook(toy);
  return {
    look,
    choose(next) {
      update({ looks: { ...settings.looks, [toy]: next.id } });
    },
  };
}

interface LookBarProps {
  readonly toy: ToyId;
  readonly current: Look;
  readonly onChoose: (look: Look) => void;
}

/** A row of look swatches. A premium one opens the unlock sheet. */
export function LookBar({ toy, current, onChoose }: LookBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isOpen, warmAds } = useEntitlements();
  const [locked, setLocked] = useState<Look | null>(null);
  const { haptics } = useSettings();
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={[styles.bar, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
      >
        {looksFor(toy).map((look) => {
          const open = isOpen(look);
          const selected = look.id === current.id;
          const name = t(`looks.${look.id}` as 'looks.ebru.tulip');
          return (
            <Pressy
              key={look.id}
              depth={0.9}
              feedback={false}
              onPress={() => {
                haptics.tick();
                if (open) onChoose(look);
                else {
                  warmAds();
                  setLocked(look);
                }
              }}
              accessibilityLabel={
                selected
                  ? t('toy.lookSelected', { look: name })
                  : open
                    ? t('toy.lookOpen', { look: name })
                    : t('toy.lookLocked', { look: name })
              }
              accessibilityState={{ selected }}
              style={styles.lookItem}
            >
              <Swatch look={look} selected={selected} />
              <AppText
                variant="caption"
                numberOfLines={1}
                color={selected ? theme.text : theme.muted}
              >
                {name}
              </AppText>
              {!open && (
                <View style={[styles.lock, { backgroundColor: theme.accent }]}>
                  <Ionicons name="sparkles" size={10} color={theme.onAccent} />
                </View>
              )}
            </Pressy>
          );
        })}
      </ScrollView>
      <UnlockSheet
        key={locked?.id ?? 'none'}
        look={locked}
        onClose={() => setLocked(null)}
        onUnlocked={(look) => {
          setLocked(null);
          onChoose(look);
        }}
      />
    </>
  );
}

function Swatch({ look, selected }: { look: Look; selected: boolean }) {
  const theme = useTheme();
  const colors = look.colors.slice(0, 4);
  return (
    <View
      style={[
        styles.swatch,
        {
          backgroundColor: look.background,
          borderColor: selected ? theme.accent : theme.glassBorder,
          borderWidth: selected ? 2.5 : 1,
        },
      ]}
    >
      <View style={styles.swatchDots}>
        {colors.map((c, i) => (
          <View key={i} style={[styles.swatchDot, { backgroundColor: c }]} />
        ))}
      </View>
    </View>
  );
}

interface UnlockSheetProps {
  readonly look: Look | null;
  readonly onClose: () => void;
  readonly onUnlocked: (look: Look) => void;
}

/** Plus, or one rewarded video for a day with this look. Nothing plays without a tap. */
export function UnlockSheet({ look, onClose, onUnlocked }: UnlockSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { listings, adsReady, passesLeft, watchFor, buyPlus, entitlements, now } =
    useEntitlements();
  const { haptics } = useSettings();
  const [busy, setBusy] = useState<'ad' | 'plus' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  if (!look) return <Sheet visible={false} onClose={onClose} />;
  const name = t(`looks.${look.id}` as 'looks.ebru.tulip');
  const price = priceOf(listings, PLUS_SKU);
  const left = passesLeft();

  const watch = async () => {
    setBusy('ad');
    setNote(null);
    const outcome: AdOutcome = await watchFor(look);
    setBusy(null);
    if (outcome === 'granted') {
      haptics.delight();
      onUnlocked(look);
      return;
    }
    setNote(t(`unlock.${outcome}`));
  };

  const plus = async () => {
    setBusy('plus');
    setNote(null);
    try {
      await buyPlus();
      haptics.delight();
      onUnlocked(look);
    } catch (e) {
      if (!(e instanceof PurchaseRefusedError && e.cancelled)) {
        setNote(e instanceof Error ? e.message : t('support.failed'));
      }
    } finally {
      setBusy(null);
    }
  };

  const remaining = passRemaining(entitlements, look.id, now);
  return (
    <Sheet visible onClose={onClose} title={t('unlock.title', { look: name })}>
      <View style={styles.preview}>
        <Swatch look={look} selected={false} />
        <View style={styles.flex}>
          <AppText variant="body" color={theme.muted}>
            {t('unlock.body')}
          </AppText>
        </View>
      </View>
      <Button
        icon="sparkles"
        label={price ? t('unlock.plus', { price }) : t('unlock.plusNoPrice')}
        busy={busy === 'plus'}
        disabled={busy !== null}
        onPress={price ? () => void plus() : () => router.push('/support')}
      />
      <AppText variant="caption" center>
        {t('unlock.plusLine')}
      </AppText>
      {adsReady && (
        <>
          <Button
            kind="secondary"
            icon="play-circle-outline"
            label={t('unlock.watch')}
            busy={busy === 'ad'}
            disabled={busy !== null || left <= 0}
            onPress={() => void watch()}
          />
          <AppText variant="caption" center>
            {left > 0 ? t('unlock.left', { count: left }) : t('unlock.limit')} · {t('unlock.noAds')}
          </AppText>
        </>
      )}
      {remaining > 0 && (
        <AppText variant="caption" center>
          {t('unlock.remaining', { hours: Math.ceil(remaining / 3_600_000) })}
        </AppText>
      )}
      {note && (
        <AppText variant="body" center color={theme.danger} accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
    </Sheet>
  );
}

interface ColorBarProps {
  readonly colors: readonly string[];
  readonly index: number;
  readonly onPick: (index: number) => void;
}

/** The look's paints, one dot each. */
export function ColorBar({ colors, index, onPick }: ColorBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { haptics } = useSettings();
  return (
    <View style={[styles.colors, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
      {colors.map((c, i) => (
        <Pressy
          key={`${c}-${i}`}
          depth={0.85}
          feedback={false}
          onPress={() => {
            haptics.tick();
            onPick(i);
          }}
          accessibilityLabel={
            i === index
              ? t('toy.colorSelected', { index: i + 1 })
              : t('toy.color', { index: i + 1 })
          }
          accessibilityState={{ selected: i === index }}
          style={[
            styles.colorDot,
            {
              backgroundColor: c,
              borderColor: i === index ? theme.text : 'rgba(0,0,0,0.15)',
              borderWidth: i === index ? 3 : 1,
              width: i === index ? 40 : 34,
              height: i === index ? 40 : 34,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderRadius: 24, borderWidth: 1, flexGrow: 0 },
  row: { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  lookItem: { width: 72, alignItems: 'center', gap: 4, paddingVertical: 2 },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 26,
    gap: 2,
    justifyContent: 'center',
  },
  swatchDot: { width: 11, height: 11, borderRadius: 6 },
  lock: {
    position: 'absolute',
    top: 0,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  flex: { flex: 1 },
  colors: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
  },
  colorDot: { width: 34, height: 34, borderRadius: 20 },
});
