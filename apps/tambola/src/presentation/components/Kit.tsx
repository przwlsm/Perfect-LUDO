import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
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
import { mix } from 'app-kit';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

export type IconName = keyof typeof Ionicons.glyphMap;

type Variant = 'hero' | 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';

const TYPE: Record<Variant, TextStyle> = {
  hero: { fontFamily: FONTS.displayBold, fontSize: 44, lineHeight: 50, letterSpacing: -0.5 },
  display: { fontFamily: FONTS.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  title: { fontFamily: FONTS.display, fontSize: 23, lineHeight: 29 },
  heading: { fontFamily: FONTS.bodyHeavy, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: FONTS.body, fontSize: 15.5, lineHeight: 22 },
  caption: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 19 },
  label: {
    fontFamily: FONTS.bodyHeavy,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
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
  depth = 0.95,
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
  // How the button sits in its row belongs to the touch target; everything
  // else styles the part that sinks.
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
        scale.set(withSpring(1, { damping: 11, stiffness: 260 }));
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
      <Animated.View style={[inner, grows && styles.fill, animated]}>
        {children as ReactNode}
      </Animated.View>
    </Pressable>
  );
}

interface ButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly kind?: 'primary' | 'second' | 'secondary' | 'ghost';
  readonly icon?: IconName;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly compact?: boolean;
  readonly big?: boolean;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly style?: StyleProp<ViewStyle>;
}

/** A chunky festive button: a solid pill with a darker lip under it. */
export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  busy,
  disabled,
  compact,
  big,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const off = disabled || busy;
  const bg =
    kind === 'primary'
      ? theme.accent
      : kind === 'second'
        ? theme.second
        : kind === 'secondary'
          ? theme.surfaceRaised
          : 'transparent';
  const fg = kind === 'primary' ? theme.onAccent : kind === 'second' ? theme.onSecond : theme.text;
  const lip = kind === 'ghost' ? 'transparent' : mix(bg, '#000000', 0.28);
  return (
    <Pressy
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        big && styles.buttonBig,
        {
          backgroundColor: bg,
          borderColor: kind === 'secondary' ? theme.border : 'transparent',
          borderBottomColor: kind === 'secondary' ? theme.border : lip,
          borderBottomWidth: kind === 'ghost' ? 0 : compact ? 3 : 4,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 17 : big ? 24 : 20} color={fg} />}
          <AppText
            variant="heading"
            color={fg}
            style={[compact && styles.compactText, big && styles.bigText]}
            numberOfLines={2}
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
          backgroundColor: active ? theme.accent : theme.glass,
          borderColor: active ? 'transparent' : theme.glassBorder,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.46)}
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
          boxShadow: `0 8px 24px ${theme.shadow}`,
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
  readonly disabled?: boolean;
  /** Always on and cannot be changed (shown with a lock, at full strength). */
  readonly locked?: boolean;
  readonly accessibilityLabel?: string;
  readonly role?: 'checkbox' | 'radio' | 'button';
}

/** A pill you can switch on and off. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  disabled,
  locked,
  accessibilityLabel,
  role = 'checkbox',
}: ChipProps) {
  const theme = useTheme();
  const fg = selected ? theme.onAccent : theme.text;
  return (
    <Pressy
      onPress={disabled || locked ? undefined : onPress}
      disabled={disabled || locked}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        checked: !!selected,
        disabled: !!disabled || !!locked,
        selected: !!selected,
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.surfaceRaised,
          borderColor: selected ? 'transparent' : theme.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      {(locked || icon) && <Ionicons name={locked ? 'lock-closed' : icon!} size={16} color={fg} />}
      <AppText variant="heading" color={fg} style={styles.chipText}>
        {label}
      </AppText>
    </Pressy>
  );
}

interface SegmentedProps<T extends string | number> {
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (v: T) => void;
  readonly label: string;
}

/** A row of mutually exclusive choices. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={[styles.segments, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressy
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.label}
            style={[styles.segment, active && { backgroundColor: theme.accent }]}
          >
            <AppText
              variant="heading"
              color={active ? theme.onAccent : theme.text}
              center
              numberOfLines={1}
              style={styles.segmentText}
            >
              {o.label}
            </AppText>
          </Pressy>
        );
      })}
    </View>
  );
}

interface StepperProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (v: number) => void;
  readonly format: (v: number) => string;
  readonly label: string;
}

/** − value + */
export function Stepper({ value, min, max, onChange, format, label }: StepperProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <IconButton
        icon="remove"
        label={t('common.less', { what: label })}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <AppText variant="title" center style={styles.stepperValue} accessibilityLiveRegion="polite">
        {format(value)}
      </AppText>
      <IconButton
        icon="add"
        label={t('common.more', { what: label })}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  );
}

/** A labelled switch row. */
export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled,
  trailing,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <View style={styles.toggleHead}>
          <AppText variant="heading">{label}</AppText>
          {trailing}
        </View>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: theme.accent, false: theme.surfaceRaised }}
        thumbColor={value ? theme.onAccent : theme.muted}
        // React Native Web reads its own prop for the 'on' thumb.
        {...({ activeThumbColor: theme.onAccent } as object)}
      />
    </View>
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
    transform: [{ translateY: (1 - rise.get()) * 360 }],
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
        style={[styles.backdrop, { backgroundColor: theme.scrim }]}
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

/** A small rounded badge ("Plus", "24 h"). */
export function Badge({
  label,
  icon,
  tone = 'accent',
}: {
  label: string;
  icon?: IconName;
  tone?: 'accent' | 'second' | 'muted';
}) {
  const theme = useTheme();
  const bg =
    tone === 'accent' ? theme.accent : tone === 'second' ? theme.second : theme.surfaceRaised;
  const fg = tone === 'accent' ? theme.onAccent : tone === 'second' ? theme.onSecond : theme.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <AppText variant="label" color={fg} style={styles.badgeText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  fill: { flexGrow: 1 },
  flex: { flex: 1 },
  button: {
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
  },
  buttonCompact: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16 },
  buttonBig: { minHeight: 64, borderRadius: 32 },
  compactText: { fontSize: 15 },
  bigText: { fontSize: 19, lineHeight: 25 },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  card: { borderRadius: 24, padding: 18, borderWidth: 1 },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  chipText: { fontSize: 15 },
  segments: { flexDirection: 'row', borderRadius: 26, padding: 4, gap: 4, borderWidth: 1 },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentText: { fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperValue: { minWidth: 72 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  toggleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
    maxHeight: '92%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, opacity: 0.6 },
  sheetTitle: { marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10.5, lineHeight: 14 },
});
