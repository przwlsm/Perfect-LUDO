import { useState } from 'react';
import { Pressable, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from '../components/AppText';
import { Label } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { useUi } from '../theme/AppearanceProvider';

export function AuthField({
  label,
  password = false,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; password?: boolean }) {
  const { theme } = useProfile();
  const ui = useUi();
  const { t } = useTranslation('account');
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <View
        style={{
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: focused ? theme.accent : ui.border,
          borderRadius: 12,
          backgroundColor: ui.inset,
          alignItems: 'center',
        }}
      >
        <TextInput
          {...props}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={props.accessibilityLabel ?? label}
          secureTextEntry={password && !visible}
          placeholderTextColor={ui.subtle}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 50,
            paddingHorizontal: 14,
            color: ui.text,
            fontSize: 16,
          }}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? t('field.hidePassword') : t('field.showPassword')}
            onPress={() => setVisible(!visible)}
            android_ripple={{ color: ui.ripple }}
            style={{ minWidth: 52, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: theme.accentText, fontSize: 12 }}>
              {visible ? t('field.hide') : t('field.show')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
