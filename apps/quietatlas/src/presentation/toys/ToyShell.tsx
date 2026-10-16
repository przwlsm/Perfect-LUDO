import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { flagOf, type Toy } from '@/domain/entities/Toy';
import { AppText, Button, IconButton, Sheet } from '../components/Kit';
import { useVisit } from '../state/PassportProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useChromeState } from './ToyChrome';

interface ToyShellProps {
  readonly toy: Toy;
  /** Behind everything; the toy itself, full screen. */
  readonly children: ReactNode;
  /** A row of tools above the bottom edge. */
  readonly tools?: ReactNode;
  /** Extra buttons in the top bar, before the info button. */
  readonly actions?: ReactNode;
  readonly background: string;
}

/**
 * The frame around every toy: back and info at the top, the toy's tools at
 * the bottom, a one-time hint on the first visit, and the passport stamp
 * that lands after a little while. The chrome dims while the player is
 * drawing, so the toy has their full attention.
 */
export function ToyShell({ toy, children, tools, actions, background }: ToyShellProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, update, haptics, sounds } = useSettings();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [stamped, setStamped] = useState(false);
  const hintVisible = !settings.hintsSeen.includes(toy.id);
  const chrome = useChromeState();
  const fallbackDim = useSharedValue(1);
  const dim = chrome?.dim ?? fallbackDim;

  const dismissHint = useCallback(() => {
    if (!settings.hintsSeen.includes(toy.id)) {
      update({ hintsSeen: [...settings.hintsSeen, toy.id] });
    }
  }, [settings.hintsSeen, toy.id, update]);

  useVisit(toy.id, () => {
    setStamped(true);
    haptics.delight();
    sounds.play('chime');
  });

  useEffect(() => {
    if (!stamped) return;
    const timer = setTimeout(() => setStamped(false), 3600);
    return () => clearTimeout(timer);
  }, [stamped]);

  // The first touch on the toy retires the hint.
  useEffect(() => {
    chrome?.onTouch(hintVisible ? dismissHint : null);
  });
  const chromeStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      {children}

      <Animated.View
        style={[styles.top, { paddingTop: insets.top + 8 }, chromeStyle]}
        pointerEvents="box-none"
      >
        <IconButton icon="chevron-back" label={t('toy.back')} onPress={() => router.back()} />
        <View
          style={[
            styles.titlePill,
            { backgroundColor: theme.glass, borderColor: theme.glassBorder },
          ]}
        >
          <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
            {flagOf(toy.country)} {t(`toys.${toy.id}.name`)}
          </AppText>
        </View>
        <View style={styles.topActions}>
          {actions}
          <IconButton
            icon="information-circle-outline"
            label={t('toy.about')}
            onPress={() => setAboutOpen(true)}
          />
        </View>
      </Animated.View>

      {tools ? (
        <Animated.View
          style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) + 8 }, chromeStyle]}
          pointerEvents="box-none"
        >
          {tools}
        </Animated.View>
      ) : null}

      {hintVisible && (
        <Animated.View
          entering={FadeIn.delay(600)}
          exiting={FadeOut}
          style={[styles.hintWrap, { top: insets.top + 74 }]}
          pointerEvents="box-none"
        >
          <View
            style={[styles.hint, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
          >
            <Text style={styles.hintEmblem} allowFontScaling={false}>
              {toy.emblem}
            </Text>
            <AppText variant="body" style={styles.flex}>
              {t(`toys.${toy.id}.hint`)}
            </AppText>
            <Button compact kind="secondary" label={t('toy.gotIt')} onPress={dismissHint} />
          </View>
        </Animated.View>
      )}

      {stamped && <StampToast toy={toy} />}

      <Sheet
        visible={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title={t(`toys.${toy.id}.name`)}
      >
        <AppText variant="label" color={theme.accentText}>
          {flagOf(toy.country)} {t(`toys.${toy.id}.country`)}
        </AppText>
        <AppText variant="body">{t(`toys.${toy.id}.about`)}</AppText>
        <AppText variant="caption">{t(`toys.${toy.id}.hint`)}</AppText>
        <Button label={t('toy.gotIt')} onPress={() => setAboutOpen(false)} />
      </Sheet>
    </View>
  );
}

/** The passport stamp landing: it thuds down slightly askew, then fades. */
function StampToast({ toy }: { toy: Toy }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { calmMotion } = useSettings();
  const wobble = useSharedValue(calmMotion ? -8 : -30);
  useEffect(() => {
    wobble.set(
      withSequence(withSpring(-8, { damping: 9, stiffness: 180 }), withDelay(2600, withTiming(-8))),
    );
  }, [wobble]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.get()}deg` }] }));
  return (
    <View style={styles.stampWrap} pointerEvents="none" accessibilityLiveRegion="polite">
      {/* The layout animation and the tilt live on separate views, so neither overwrites the other. */}
      <Animated.View
        entering={calmMotion ? FadeIn : ZoomIn.springify().damping(12)}
        exiting={FadeOut.duration(400)}
      >
        <Animated.View
          style={[styles.stamp, { borderColor: toy.hue, backgroundColor: theme.glass }, style]}
        >
          <Text style={styles.stampFlag} allowFontScaling={false}>
            {flagOf(toy.country)}
          </Text>
          <AppText variant="title" color={toy.hue}>
            {t('toy.stamped')}
          </AppText>
          <AppText variant="caption" center color={theme.text}>
            {t('toy.stampedBody', { country: t(`toys.${toy.id}.country`) })}
          </AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titlePill: {
    flexShrink: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
  },
  topActions: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, gap: 10 },
  hintWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  hint: {
    maxWidth: 520,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  hintEmblem: { fontSize: 26 },
  flex: { flex: 1 },
  stampWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 4,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 2,
  },
  stampFlag: { fontSize: 40 },
});
