import { forwardRef } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { familyForWeight } from '../theme/typography';

/**
 * Every screen's Text, in Outfit. Picks the Outfit file matching the
 * style's weight and clears the weight itself, so Android does not add a
 * synthetic bold on top of an already-bold file. A style that names its
 * own fontFamily keeps it.
 */
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return <NativeText ref={ref} style={style} {...props} />;
  return (
    <NativeText
      ref={ref}
      style={[style, { fontFamily: familyForWeight(flat.fontWeight), fontWeight: 'normal' }]}
      {...props}
    />
  );
});

/** TextInput in Outfit, for the same reason. */
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { style, ...props },
  ref,
) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return <NativeTextInput ref={ref} style={style} {...props} />;
  return (
    <NativeTextInput
      ref={ref}
      style={[style, { fontFamily: familyForWeight(flat.fontWeight), fontWeight: 'normal' }]}
      {...props}
    />
  );
});
