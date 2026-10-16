import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

export type IconName = keyof typeof Ionicons.glyphMap;

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';

const TYPE: Record<Variant, TextStyle> = {
  display: { fontFamily: FONTS.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: FONTS.display, fontSize: 25, lineHeight: 31, letterSpacing: -0.2 },
  heading: { fontFamily: FONTS.bodyHeavy, fontSize: 16.5, lineHeight: 22 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: FONTS.bodyHeavy,
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
};

interface AppTextProps extends TextProps {
  readonly variant?: Variant;
  readonly color?: string;
  readonly center?: boolean;
}

/** All text in the app: the type scale plus the theme's colours. Scales with the system font size. */
export function AppText({ variant = 'body', color, center, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const muted = variant === 'caption' || variant === 'label';
  return (
    <Text
      maxFontSizeMultiplier={1.8}
      {...rest}
      style={[
        TYPE[variant],
        { color: color ?? (muted ? theme.muted : theme.text) },
        center && styles.center,
        style,
      ]}
    />
  );
}

interface PressyProps extends Omit<PressableProps, 'style'> {
  readonly style?: StyleProp<ViewStyle>;
  /** How far it sinks when pressed (1 = not at all). */
  readonly depth?: number;
  /** Plays the soft tap sound and haptic. */
  readonly feedback?: boolean;
}

/** A Pressable that sinks softly under the finger and springs back. */
export function Pressy({
  style,
  depth = 0.96,
  feedback = true,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: PropsWithChildren<PressyProps>) {
  const scale = useSharedValue(1);
  const { haptics, sounds } = useSettings();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  // How the button sits in its row belongs to the touch target; the rest styles the part that sinks.
  const { flex, flexGrow, flexShrink, flexBasis, alignSelf, width, ...inner } =
    StyleSheet.flatten(style) ?? {};
  const grows = (flex ?? 0) > 0 || (flexGrow ?? 0) > 0;
  return (
    <Pressable
      accessibilityRole="button"
      style={{ flex, flexGrow, flexShrink, flexBasis, alignSelf, width }}
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(depth, { damping: 18, stiffness: 420 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 12, stiffness: 260 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback) {
          haptics.tap();
          sounds.play('tap');
        }
        onPress?.(e);
      }}
    >
      <Animated.View
        style={[inner, grows && styles.fill, width !== undefined && styles.full, animated]}
      >
        {children as ReactNode}
      </Animated.View>
    </Pressable>
  );
}

interface ButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly kind?: 'primary' | 'secondary' | 'ghost';
  readonly icon?: IconName;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly compact?: boolean;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  busy,
  disabled,
  compact,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const off = disabled || busy;
  const bg =
    kind === 'primary' ? theme.accent : kind === 'secondary' ? theme.surfaceRaised : 'transparent';
  const fg = kind === 'primary' ? theme.onAccent : kind === 'ghost' ? theme.accentText : theme.text;
  return (
    <Pressy
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: bg,
          borderColor: kind === 'secondary' ? theme.border : 'transparent',
          opacity: disabled ? 0.5 : 1,
          boxShadow: kind === 'primary' ? `0 8px 20px ${theme.shadow}` : undefined,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 16 : 19} color={fg} />}
          <AppText
            variant="heading"
            color={fg}
            style={compact && styles.compactText}
            numberOfLines={1}
          >
            {label}
          </AppText>
        </>
      )}
    </Pressy>
  );
}

interface IconButtonProps {
  readonly icon: IconName;
  readonly label: string;
  readonly onPress?: () => void;
  readonly size?: number;
  readonly active?: boolean;
  readonly disabled?: boolean;
  /** Glass over a card or a glow, rather than a plain surface. */
  readonly glass?: boolean;
  readonly tint?: string;
}

/** A round icon button, 48 dp so it is always an easy target. */
export function IconButton({
  icon,
  label,
  onPress,
  size = 48,
  active,
  disabled,
  glass = true,
  tint,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      hitSlop={6}
      depth={0.9}
      style={[
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? theme.accent : glass ? theme.glass : theme.surfaceRaised,
          borderColor: active ? 'transparent' : theme.glassBorder,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.44)}
        color={active ? theme.onAccent : (tint ?? theme.text)}
      />
    </Pressy>
  );
}

/** A soft rounded panel. */
export function Card({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: `0 10px 28px ${theme.shadow}`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface ChipProps {
  readonly label: string;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly icon?: IconName;
  readonly locked?: boolean;
  readonly accessibilityLabel?: string;
  /** Renders as one of a set of radio buttons. */
  readonly radio?: boolean;
  readonly textStyle?: StyleProp<TextStyle>;
}

/** A pill choice: languages, sizes, lettering. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  locked,
  accessibilityLabel,
  radio,
  textStyle,
}: ChipProps) {
  const theme = useTheme();
  const fg = selected ? theme.onAccent : theme.text;
  return (
    <Pressy
      onPress={onPress}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { checked: !!selected } : { selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.surfaceRaised,
          borderColor: selected ? 'transparent' : theme.border,
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={fg} />}
      <AppText variant="heading" color={fg} style={[styles.chipText, textStyle]} numberOfLines={1}>
        {label}
      </AppText>
      {locked && <Ionicons name="lock-closed" size={13} color={selected ? fg : theme.accentText} />}
    </Pressy>
  );
}

/** A horizontal row of chips that scrolls when it overflows. */
export function ChipRow({ children, label }: PropsWithChildren<{ label?: string }>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipBleed}
      contentContainerStyle={styles.chipRow}
      accessibilityLabel={label}
      accessibilityRole={label ? 'radiogroup' : undefined}
    >
      {children}
    </ScrollView>
  );
}

interface SheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
}

/** A bottom sheet that rises over a dimmed screen. Back button and backdrop tap close it. */
export function Sheet({ visible, onClose, title, children }: PropsWithChildren<SheetProps>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.set(visible ? withSpring(1, { damping: 20, stiffness: 200 }) : withTiming(0));
  }, [visible, rise]);
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - rise.get()) * 320 }],
  }));
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
          sheetStyle,
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.faint }]} />
        {title ? (
          <AppText variant="title" style={styles.sheetTitle} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  fill: { flexGrow: 1 },
  full: { width: '100%' },
  button: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  buttonCompact: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16 },
  compactText: { fontSize: 14 },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  card: { borderRadius: 24, padding: 18, borderWidth: 1 },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  chipText: { fontSize: 14.5 },
  /** Chips scroll to the screen edge rather than stopping at the page gutter. */
  chipBleed: { marginHorizontal: -16 },
  chipRow: { gap: 8, paddingHorizontal: 16 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 4, 10, 0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, opacity: 0.6 },
  sheetTitle: { marginTop: 4 },
});
