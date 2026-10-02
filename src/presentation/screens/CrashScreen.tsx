import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Font from 'expo-font';
import { crashReporter } from '@/config/monitoring';
import { Text } from '../components/AppText';
import { currentLanguage } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { ScriptContext } from '../i18n/ScriptContext';
import { familyForWeight } from '../theme/typography';
import { PALETTES, type Palette, type Scheme } from '../theme/palette';

/** Fixed gold, as in the classic theme: the same in day and night. */
const ACCENT = '#ffb95f';
/** The gold's darker rim, and the dark ink that reads on gold. */
const ACCENT_RIM = '#7a4f17';
const ON_ACCENT = '#2b1d0b';

/**
 * Shown instead of the whole app when rendering fails. Rendered outside every
 * provider (they may be what failed), so it uses only plain components and
 * the static palette for the phone's day/night setting (the saved appearance
 * choice lives in a provider). The error is reported, and "Try again" re-mounts the app.
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation('system');
  const [retrying, setRetrying] = useState(false);
  const scheme: Scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const s = STYLES[scheme];
  useEffect(() => {
    crashReporter.captureException(error);
  }, [error]);
  // The language provider may be what failed: use the language's own font
  // only if it was already loaded, otherwise the platform's fallback.
  const wanted = LANGUAGES[currentLanguage()].script;
  const script = Font.isLoaded(familyForWeight('400', wanted)) ? wanted : 'latin';

  return (
    <ScriptContext.Provider value={script}>
      <SafeAreaProvider>
        <SafeAreaView style={s.screen}>
          <View style={s.body}>
            <View style={s.badge}>
              <Text style={s.badgeText}>⚂</Text>
            </View>
            <Text accessibilityRole="header" style={s.title}>
              {t('crash.title')}
            </Text>
            <Text style={s.text}>{t('crash.body')}</Text>
            {__DEV__ && <Text style={s.detail}>{error.message}</Text>}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: retrying }}
            disabled={retrying}
            onPress={() => {
              setRetrying(true);
              void retry().finally(() => setRetrying(false));
            }}
            android_ripple={{ color: '#00000022' }}
            style={({ pressed }) => [
              s.button,
              { opacity: retrying ? 0.6 : 1 },
              pressed && s.pressed,
            ]}
          >
            <Text style={s.buttonText}>{retrying ? t('crash.retrying') : t('crash.retry')}</Text>
          </Pressable>
        </SafeAreaView>
      </SafeAreaProvider>
    </ScriptContext.Provider>
  );
}

function styles(ui: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: ui.background, padding: 24 },
    body: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    badge: {
      width: 88,
      height: 92,
      borderRadius: 26,
      backgroundColor: ACCENT,
      borderBottomWidth: 6,
      borderBottomColor: ACCENT_RIM,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    badgeText: { fontSize: 54, color: '#29213a', lineHeight: 62 },
    title: { color: ui.text, fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
    text: { color: ui.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    detail: { color: ui.danger, fontSize: 12, lineHeight: 18, textAlign: 'center' },
    button: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: ACCENT,
      borderBottomWidth: 4,
      borderBottomColor: ACCENT_RIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 1 },
    buttonText: { color: ON_ACCENT, fontSize: 15, fontWeight: '800', letterSpacing: 0.9 },
  });
}

const STYLES: Record<Scheme, ReturnType<typeof styles>> = {
  light: styles(PALETTES.light),
  dark: styles(PALETTES.dark),
};
