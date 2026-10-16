import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { FestiveBackdrop } from './Festive';
import { AppText, IconButton } from './Kit';

interface PageProps {
  readonly title: string;
  /** Something on the right of the header (an icon button). */
  readonly right?: ReactNode;
  /** The festive backdrop behind the page instead of a plain colour. */
  readonly festive?: boolean;
  /** Content pinned under the scroll area (a main action). */
  readonly footer?: ReactNode;
  readonly onBack?: () => void;
}

/** A scrolling page with a back button and a title, kept readable on wide screens. */
export function Page({
  title,
  right,
  festive,
  footer,
  onBack,
  children,
}: PropsWithChildren<PageProps>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {festive && <FestiveBackdrop lights={false} />}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: footer ? 24 : insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          />
          <AppText
            variant="title"
            accessibilityRole="header"
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </AppText>
          {right}
        </View>
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 14,
              backgroundColor: theme.glass,
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  title: { flex: 1 },
  footer: { paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1 },
  footerInner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 10 },
});
