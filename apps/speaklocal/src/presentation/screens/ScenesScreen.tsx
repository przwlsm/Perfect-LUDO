import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BONUS_PACKS, scenesInPack } from '@/domain/content/scenes';
import type { PackId, SceneTemplate } from '@/domain/content/types';
import { passId } from '@/domain/entities/Bubbles';
import { sceneRecord, sceneStars } from '@/domain/entities/Progress';
import { SceneDots } from '../components/Bits';
import { AppText, Button, Card, Pressy } from '../components/Kit';
import { LockedSheet, type LockedItem } from '../components/Offers';
import { Page } from '../components/Page';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/ThemeProvider';

export function ScenesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { packOpen, plus } = useContent();
  const { remaining } = useEntitlements();
  const [locked, setLocked] = useState<LockedItem | null>(null);
  const lockOf = (pack: PackId): LockedItem => ({
    id: passId('pack', pack),
    title: t(`packs.${pack}.title`),
  });

  return (
    <Page title={t('sceneList.title')}>
      <View style={styles.packHead}>
        <AppText variant="label" color={theme.accentText}>
          {t('packs.core.title')}
        </AppText>
        <AppText variant="caption">{t('packs.core.body')}</AppText>
      </View>
      {scenesInPack('core').map((s) => (
        <SceneRow key={s.id} scene={s} open onPress={() => router.push(`/scene/${s.id}`)} />
      ))}

      <View style={[styles.packHead, styles.bonusHead]}>
        <AppText variant="title">{t('sceneList.bonusTitle')}</AppText>
        {!plus && <AppText variant="caption">{t('sceneList.bonusBody')}</AppText>}
      </View>
      {BONUS_PACKS.map((pack) => {
        const open = packOpen(pack);
        const left = remaining(passId('pack', pack));
        return (
          <Card key={pack} style={styles.pack}>
            <View style={styles.packTitle}>
              <View style={styles.flex}>
                <AppText variant="heading">{t(`packs.${pack}.title`)}</AppText>
                <AppText variant="caption">{t(`packs.${pack}.body`)}</AppText>
              </View>
              {!open && (
                <View style={[styles.lock, { backgroundColor: theme.surfaceRaised }]}>
                  <Ionicons name="lock-closed" size={14} color={theme.accentText} />
                  <AppText variant="caption" color={theme.text}>
                    {t('common.plus')}
                  </AppText>
                </View>
              )}
            </View>
            {open && !plus && left > 0 && (
              <AppText variant="caption" color={theme.success}>
                {t('sceneList.openFor', { hours: Math.max(1, Math.round(left / 3_600_000)) })}
              </AppText>
            )}
            {scenesInPack(pack).map((s) => (
              <SceneRow
                key={s.id}
                scene={s}
                open={open}
                inset
                onPress={() => (open ? router.push(`/scene/${s.id}`) : setLocked(lockOf(pack)))}
              />
            ))}
            {!open && (
              <Button
                kind="secondary"
                compact
                icon="lock-open-outline"
                label={t('sceneList.unlock')}
                onPress={() => setLocked(lockOf(pack))}
              />
            )}
          </Card>
        );
      })}
      <LockedSheet item={locked} onClose={() => setLocked(null)} />
    </Page>
  );
}

function SceneRow({
  scene,
  open,
  inset,
  onPress,
}: {
  scene: SceneTemplate;
  open: boolean;
  inset?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { lang } = useContent();
  const { progress } = useProgress();
  const dots = sceneStars(sceneRecord(progress, lang, scene.id));
  const state = !open
    ? t('sceneList.locked')
    : dots === 0
      ? t('sceneList.stateNew')
      : t('sceneList.stateDots', { count: dots });
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={t('sceneList.sceneA11y', {
        title: t(`scenes.${scene.id}.title`),
        blurb: t(`scenes.${scene.id}.blurb`),
        state,
      })}
      style={[
        styles.row,
        inset
          ? { backgroundColor: theme.surfaceRaised, borderColor: 'transparent' }
          : { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: open ? theme.teal : theme.track }]}>
        <Ionicons name={scene.icon as never} size={22} color={open ? theme.onTeal : theme.muted} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={2}>
          {t(`scenes.${scene.id}.title`)}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {t(`scenes.${scene.id}.blurb`)}
        </AppText>
      </View>
      {open ? (
        <SceneDots count={dots} />
      ) : (
        <Ionicons name="lock-closed-outline" size={18} color={theme.faint} />
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  packHead: { gap: 2 },
  bonusHead: { marginTop: 14 },
  pack: { gap: 10 },
  packTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    minHeight: 64,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
