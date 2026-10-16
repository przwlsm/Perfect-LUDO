import { I18nManager, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Right-to-left helpers. The direction is fixed for a whole app run
 * (switching it reloads the app, see LanguageProvider), so these are
 * constants rather than hooks.
 */
export const isRTL = I18nManager.isRTL;

/** Mirrors an icon that points along the reading direction: back, forward, chevrons. */
export const mirrorInRtl: TextStyle | undefined = isRTL
  ? { transform: [{ scaleX: -1 }] }
  : undefined;

/**
 * Keeps a physical layout left-to-right in RTL languages. A Ludo board is a
 * real object: mirroring it would reverse the direction pieces travel and
 * move every player's panel to the wrong corner.
 */
export const keepLtr: ViewStyle = { direction: 'ltr' };

/** An arrow pointing "forward" in the reading direction, for inline text. */
export const forwardArrow = isRTL ? '←' : '→';
