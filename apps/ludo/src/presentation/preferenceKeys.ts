/** Single source of truth for local preference storage keys. */
export const PREFERENCE_KEYS = {
  BOARD_3D_ENABLED: 'settings.board3dEnabled',
  /** The newest store version the player chose "Later" for; not asked again until a newer one. */
  UPDATE_DISMISSED_VERSION: 'updates.dismissedVersion',
  /** 'system', 'light' or 'dark'; see theme/AppearanceProvider.tsx. */
  APPEARANCE: 'settings.appearance',
  /** 'system' or a language code; see i18n/languages.ts. */
  LANGUAGE: 'settings.language',
  /** The text direction a reload was last tried for; stops a direction-switch reload loop. */
  DIRECTION_RELOAD: 'settings.directionReload',
  /** Set once the first-run walkthrough was finished or skipped. */
  WALKTHROUGH_DONE: 'onboarding.walkthroughDone',
} as const;
