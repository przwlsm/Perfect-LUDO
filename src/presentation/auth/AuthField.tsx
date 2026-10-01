import { useState } from 'react';
import { Pressable, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from '../components/AppText';
import { Label } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

export function AuthField({
  label,
  password = false,
  ...props
}: TextInputProps & { label: string; password?: boolean }) {
  const { theme } = useProfile();
  const { t } = useTranslation('account');
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <View
        style={{
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: `${theme.accent}55`,
          borderRadius: 12,
          backgroundColor: '#00000020',
          alignItems: 'center',
        }}
      >
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          secureTextEntry={password && !visible}
          placeholderTextColor={ui.muted}
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
            android_ripple={{ color: '#ffffff25' }}
            style={{ minWidth: 52, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: theme.accent, fontSize: 12 }}>
              {visible ? t('field.hide') : t('field.show')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
