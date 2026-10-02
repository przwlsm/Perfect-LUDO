import { forwardRef } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { useScript } from '../i18n/ScriptContext';
import { scriptTextStyle } from '../theme/typography';

/**
 * Every screen's Text, in the typeface for the current language's script
 * (Outfit for Latin, Baloo 2 for Devanagari). Picks the file matching the
 * style's weight and clears the weight itself, so Android does not add a
 * synthetic bold on top of an already-bold file, and adjusts size and line
 * height where a script needs it. A style that names its own fontFamily
 * keeps it.
 */
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const script = useScript();
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return <NativeText ref={ref} style={style} {...props} />;
  return <NativeText ref={ref} style={[style, scriptTextStyle(flat, script)]} {...props} />;
});

/** TextInput in the same typeface, for the same reason. */
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { style, ...props },
  ref,
) {
  const script = useScript();
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return <NativeTextInput ref={ref} style={style} {...props} />;
  return <NativeTextInput ref={ref} style={[style, scriptTextStyle(flat, script)]} {...props} />;
});
