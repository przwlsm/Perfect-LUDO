import { useMemo } from 'react';
import { cityById } from '@/domain/content/languages';
import { SCENES, sceneById } from '@/domain/content/scenes';
import type { PackId, SceneId } from '@/domain/content/types';
import { passId } from '@/domain/entities/Bubbles';
import { useEntitlements } from './EntitlementsProvider';
import { useSettings } from './SettingsProvider';

/** The learner's city and language, and which scenes are open to them. */
export function useContent() {
  const { settings, lang } = useSettings();
  const { open, plus, now } = useEntitlements();
  return useMemo(() => {
    const packOpen = (pack: PackId) =>
      pack === 'core' || open({ id: passId('pack', pack), premium: true });
    const sceneOpen = (id: SceneId) => packOpen(sceneById(id).pack);
    return {
      lang,
      city: cityById(settings.city ?? 'bengaluru'),
      packOpen,
      sceneOpen,
      openScenes: SCENES.filter((s) => packOpen(s.pack)).map((s) => s.id),
      plus,
      now,
    };
  }, [lang, settings.city, open, plus, now]);
}
