import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, IconButton } from './Kit';

interface PageProps {
  readonly title: string;
  /** Something small beside the title (a button). */
  readonly trailing?: ReactNode;
}

/** A plain scrolling page with a back button and a title, kept readable on wide screens. */
export function Page({ title, trailing, children }: PropsWithChildren<PageProps>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            plain
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <AppText variant="title" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {trailing}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { flex: 1 },
});
