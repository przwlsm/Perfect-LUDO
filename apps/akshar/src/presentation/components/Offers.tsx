import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { passId, PENS, SURFACES, type PenId, type SurfaceId } from '@/domain/entities/Cosmetics';
import { useEntitlements, type AdOutcome } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PEN_LOOKS, surfaceLook } from '../writing/looks';
import { AppText, Button, Pressy, Sheet } from './Kit';

export interface LockedItem {
  readonly kind: 'pen' | 'surface';
  readonly id: string;
}

/**
 * A premium paper or pen: try it for a day with a video the learner chose
 * to watch, or see Plus. Never shown unasked.
 */
export function LockedSheet({
  item,
  onClose,
  onOpened,
}: {
  item: LockedItem | null;
  onClose: () => void;
  onOpened: (item: LockedItem) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { adsReady, watchForPass, warmAds, adsLeft } = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (item) warmAds();
  }, [item, warmAds]);
  const close = () => {
    setNote(null);
    onClose();
  };
  const name = item
    ? t(item.kind === 'pen' ? `pens.${item.id as PenId}` : `surfaces.${item.id as SurfaceId}`)
    : '';
  const notes: Record<Exclude<AdOutcome, 'granted'>, string> = {
    limit: t('locked.limit'),
    unfinished: t('locked.unfinished'),
    unavailable: t('locked.unavailable'),
  };
  return (
    <Sheet visible={item !== null} onClose={close} title={name}>
      <AppText color={theme.muted}>
        {adsReady && adsLeft() > 0 ? t('locked.body') : t('locked.bodyNoVideo')}
      </AppText>
      {adsReady && adsLeft() > 0 && (
        <Button
          icon="play-circle"
          label={t('locked.watch')}
          busy={busy}
          onPress={() => {
            if (!item) return;
            setBusy(true);
            void watchForPass(passId(item.kind, item.id))
              .then((outcome) => {
                if (outcome === 'granted') {
                  onOpened(item);
                  close();
                } else setNote(notes[outcome]);
              })
              .finally(() => setBusy(false));
          }}
        />
      )}
      <Button
        kind="secondary"
        icon="sparkles"
        label={t('locked.plus')}
        onPress={() => {
          onClose();
          router.push('/support');
        }}
      />
      {note && (
        <AppText variant="caption" center accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
    </Sheet>
  );
}

/** Out of free hints: a video for one more, or Plus for unlimited. */
export function HintSheet({
  visible,
  onClose,
  onGranted,
}: {
  visible: boolean;
  onClose: () => void;
  onGranted: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { adsReady, watchForHint, warmAds, adsLeft } = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (visible) warmAds();
  }, [visible, warmAds]);
  const close = () => {
    setNote(null);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={close} title={t('hintSheet.title')}>
      <AppText color={theme.muted}>
        {adsReady && adsLeft() > 0 ? t('hintSheet.body') : t('hintSheet.bodyNoVideo')}
      </AppText>
      {adsReady && adsLeft() > 0 && (
        <Button
          icon="play-circle"
          label={t('hintSheet.watch')}
          busy={busy}
          onPress={() => {
            setBusy(true);
            void watchForHint()
              .then((outcome) => {
                if (outcome === 'granted') {
                  close();
                  onGranted();
                } else {
                  setNote(t(`hintSheet.${outcome}`));
                }
              })
              .finally(() => setBusy(false));
          }}
        />
      )}
      <Button
        kind="secondary"
        icon="sparkles"
        label={t('hintSheet.plus')}
        onPress={() => {
          onClose();
          router.push('/support');
        }}
      />
      {note && (
        <AppText variant="caption" center accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
    </Sheet>
  );
}

/** Papers and pens to choose from, premium ones marked with a small lock. */
export function StyleSheetPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const { open } = useEntitlements();
  const [locked, setLocked] = useState<LockedItem | null>(null);
  const dark = theme.scheme === 'slate';
  const choose = (item: LockedItem, premium: boolean) => {
    const id = passId(item.kind, item.id);
    if (!open({ id, premium })) {
      setLocked(item);
      return;
    }
    if (item.kind === 'pen') update({ pen: item.id as PenId });
    else update({ surface: item.id as SurfaceId });
  };
  return (
    <>
      <Sheet visible={visible && locked === null} onClose={onClose} title={t('slate.style')}>
        <AppText variant="label">{t('surfaces.title')}</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {SURFACES.map((s) => {
            const look = surfaceLook(s.id, dark);
            const isOpen = open({ id: passId('surface', s.id), premium: s.premium });
            const active = settings.surface === s.id;
            return (
              <Swatch
                key={s.id}
                label={t(`surfaces.${s.id}`)}
                active={active}
                locked={!isOpen}
                onPress={() => choose({ kind: 'surface', id: s.id }, s.premium)}
              >
                <View
                  style={[
                    styles.paper,
                    { backgroundColor: look.paper[0], borderColor: theme.border },
                  ]}
                >
                  <View style={[styles.paperRule, { backgroundColor: look.rule }]} />
                  <View style={[styles.paperRule, { backgroundColor: look.rule }]} />
                </View>
              </Swatch>
            );
          })}
        </ScrollView>
        <AppText variant="label">{t('pens.title')}</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {PENS.map((p) => {
            const look = PEN_LOOKS[p.id];
            const surface = surfaceLook(settings.surface, dark);
            const isOpen = open({ id: passId('pen', p.id), premium: p.premium });
            const active = settings.pen === p.id;
            return (
              <Swatch
                key={p.id}
                label={t(`pens.${p.id}`)}
                active={active}
                locked={!isOpen}
                onPress={() => choose({ kind: 'pen', id: p.id }, p.premium)}
              >
                <View
                  style={[
                    styles.paper,
                    { backgroundColor: surface.paper[0], borderColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.penStroke,
                      {
                        backgroundColor: surface.dark ? look.onDark : look.onLight,
                        height: p.nib === 'broad' ? 9 : p.id === 'pencil' ? 4 : 6,
                        opacity: look.opacity,
                      },
                    ]}
                  />
                </View>
              </Swatch>
            );
          })}
        </ScrollView>
      </Sheet>
      <LockedSheet
        item={locked}
        onClose={() => setLocked(null)}
        onOpened={(item) => {
          if (item.kind === 'pen') update({ pen: item.id as PenId });
          else update({ surface: item.id as SurfaceId });
        }}
      />
    </>
  );
}

function Swatch({
  label,
  active,
  locked,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  locked: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressy
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={locked ? `${label}, ${t('common.premium')}` : label}
      style={[
        styles.swatch,
        {
          borderColor: active ? theme.accent : 'transparent',
          backgroundColor: theme.surfaceRaised,
        },
      ]}
    >
      {children}
      <AppText
        variant="caption"
        center
        numberOfLines={2}
        style={styles.swatchLabel}
        color={theme.text}
      >
        {label}
      </AppText>
      {locked && (
        <View style={[styles.lock, { backgroundColor: theme.accent }]}>
          <Ionicons name="lock-closed" size={11} color={theme.onAccent} />
        </View>
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  swatch: {
    width: 92,
    borderRadius: 18,
    borderWidth: 2,
    padding: 6,
    gap: 6,
    alignItems: 'center',
  },
  swatchLabel: { minHeight: 38 },
  paper: {
    width: 76,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  paperRule: { height: 1.5, borderRadius: 1 },
  penStroke: { borderRadius: 6, transform: [{ rotate: '-12deg' }] },
  lock: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
