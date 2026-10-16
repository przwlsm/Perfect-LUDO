import { StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { effectiveType, typeStylesFor, withLanguage } from '@/application/card';
import { messagesFor, nextSuggestion } from '@/application/messages';
import { LIMITS, type CardSpec, type PhotoShape } from '@/domain/entities/Card';
import { CARD_LANGUAGES, LANGUAGE_INFO } from '@/domain/entities/Language';
import type { Template, TypeStyle } from '@/domain/entities/Template';
import { AppText, Button, Chip, ChipRow, Pressy } from '../../components/Kit';
import { useSettings } from '../../state/SettingsProvider';
import { FONTS } from '../../theme/palette';
import { useTheme } from '../../theme/ThemeProvider';

type Change = (next: CardSpec) => void;

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  max,
  onEnd,
  rtl,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  max: number;
  onEnd?: () => void;
  rtl?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        onEndEditing={onEnd}
        onBlur={onEnd}
        multiline={multiline}
        maxLength={max}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.6}
        style={[
          styles.input,
          multiline && styles.inputMulti,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            textAlign: rtl ? 'right' : 'left',
            writingDirection: rtl ? 'rtl' : 'ltr',
          },
        ]}
      />
    </View>
  );
}

export function WordsPanel({ spec, onChange }: { spec: CardSpec; onChange: Change }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { update } = useSettings();
  const set = messagesFor(spec.occasion, spec.language);
  const rtl = LANGUAGE_INFO[spec.language].rtl;
  return (
    <View style={styles.panel}>
      <AppText variant="label">{t('editor.language')}</AppText>
      <ChipRow label={t('editor.language')}>
        {CARD_LANGUAGES.map((code) => (
          <Chip
            key={code}
            radio
            label={LANGUAGE_INFO[code].nativeName}
            accessibilityLabel={LANGUAGE_INFO[code].englishName}
            selected={spec.language === code}
            onPress={() => onChange(withLanguage(spec, code))}
          />
        ))}
      </ChipRow>
      {spec.language !== 'en' && (
        <AppText variant="caption" color={theme.faint}>
          {t('editor.reviewNote')}
        </AppText>
      )}
      <Field
        label={t('editor.headline')}
        value={spec.headline}
        onChange={(headline) => onChange({ ...spec, headline })}
        max={LIMITS.headline}
        rtl={rtl}
      />
      {set.headlines.length > 1 && (
        <View style={styles.row}>
          <Chip
            icon="refresh"
            label={t('editor.anotherGreeting')}
            onPress={() =>
              onChange({ ...spec, headline: nextSuggestion(set.headlines, spec.headline) })
            }
          />
        </View>
      )}
      <Field
        label={t('editor.message')}
        value={spec.message}
        onChange={(message) => onChange({ ...spec, message })}
        multiline
        max={LIMITS.message}
        rtl={rtl}
      />
      <AppText variant="label">{t('editor.suggestions')}</AppText>
      <View style={styles.suggestions}>
        {set.messages.map((text) => {
          const on = text === spec.message;
          return (
            <Pressy
              key={text}
              onPress={() => onChange({ ...spec, message: text })}
              accessibilityLabel={t('editor.useSuggestion', { text })}
              accessibilityState={{ selected: on }}
              style={[
                styles.suggestion,
                {
                  backgroundColor: on ? theme.surfaceRaised : theme.surface,
                  borderColor: on ? theme.accent : theme.border,
                },
              ]}
            >
              <AppText variant="body" style={[styles.flex, rtl && styles.rtl]}>
                {text}
              </AppText>
              <Ionicons
                name={on ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={on ? theme.accentText : theme.faint}
              />
            </Pressy>
          );
        })}
      </View>
      <Field
        label={t('editor.from')}
        value={spec.from}
        placeholder={t('editor.fromPlaceholder')}
        onChange={(from) => onChange({ ...spec, from })}
        onEnd={() => {
          if (spec.from.trim()) update({ name: spec.from.trim() });
        }}
        max={LIMITS.from}
      />
    </View>
  );
}

export function PhotoPanel({
  spec,
  onChange,
  onPick,
  busy,
}: {
  spec: CardSpec;
  onChange: Change;
  onPick: () => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const photo = spec.photo;
  const shape = (s: PhotoShape) => photo && onChange({ ...spec, photo: { ...photo, shape: s } });
  return (
    <View style={styles.panel}>
      {photo ? (
        <>
          <AppText variant="label">{t('editor.shape')}</AppText>
          <View style={styles.row}>
            <Chip
              radio
              icon="ellipse-outline"
              label={t('editor.circle')}
              selected={photo.shape === 'circle'}
              onPress={() => shape('circle')}
            />
            <Chip
              radio
              icon="tablet-portrait-outline"
              label={t('editor.arch')}
              selected={photo.shape === 'arch'}
              onPress={() => shape('arch')}
            />
          </View>
          <View style={[styles.hintRow, { backgroundColor: theme.surfaceRaised }]}>
            <Ionicons name="hand-left-outline" size={20} color={theme.accentText} />
            <AppText variant="body" style={styles.flex}>
              {t('editor.photoHint')}
            </AppText>
          </View>
          <View style={styles.row}>
            <Button
              kind="secondary"
              compact
              icon="images-outline"
              label={t('editor.changePhoto')}
              onPress={onPick}
              busy={busy}
              style={styles.flex}
            />
            <Button
              kind="ghost"
              compact
              icon="trash-outline"
              label={t('editor.removePhoto')}
              onPress={() => onChange({ ...spec, photo: null })}
              style={styles.flex}
            />
          </View>
        </>
      ) : (
        <Button
          icon="image-outline"
          kind="secondary"
          label={t('editor.addPhoto')}
          onPress={onPick}
          busy={busy}
        />
      )}
      <View style={styles.hintRow}>
        <Ionicons name="lock-closed-outline" size={16} color={theme.muted} />
        <AppText variant="caption" style={styles.flex}>
          {t('editor.photoPrivate')}
        </AppText>
      </View>
    </View>
  );
}

export function StylePanel({
  spec,
  template,
  plus,
  onChange,
  onPlusOnly,
}: {
  spec: CardSpec;
  template: Template;
  plus: boolean;
  onChange: Change;
  onPlusOnly: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles2 = typeStylesFor(spec.language);
  const current = effectiveType(spec, template, plus);
  const setType = (type: TypeStyle) => (plus ? onChange({ ...spec, type }) : onPlusOnly());
  return (
    <View style={styles.panel}>
      <AppText variant="label">{t('editor.colours')}</AppText>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        {template.palettes.map((p, i) => {
          const on = spec.palette === i;
          return (
            <Pressy
              key={p.id}
              onPress={() => onChange({ ...spec, palette: i })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t('editor.colourA11y', {
                index: i + 1,
                total: template.palettes.length,
              })}
              style={[styles.swatchRing, { borderColor: on ? theme.accent : 'transparent' }]}
            >
              <LinearGradient colors={[p.bg[0], p.bg[1]]} style={styles.swatch}>
                <View style={[styles.swatchDot, { backgroundColor: p.accent }]} />
                <View style={[styles.swatchDot, { backgroundColor: p.gold }]} />
              </LinearGradient>
            </Pressy>
          );
        })}
      </View>
      <AppText variant="label">{t('editor.size')}</AppText>
      <View style={styles.row}>
        <Chip
          radio
          icon="square-outline"
          label={t('editor.square')}
          selected={spec.format === 'square'}
          onPress={() => onChange({ ...spec, format: 'square' })}
        />
        <Chip
          radio
          icon="phone-portrait-outline"
          label={t('editor.story')}
          locked={!plus}
          selected={spec.format === 'story'}
          onPress={() => (plus ? onChange({ ...spec, format: 'story' }) : onPlusOnly())}
        />
      </View>
      <AppText variant="caption">{t('editor.sizeHint')}</AppText>
      {styles2.length > 0 && (
        <>
          <AppText variant="label">{t('editor.lettering')}</AppText>
          <View style={styles.wrap}>
            {styles2.map((s) => (
              <Chip
                key={s}
                radio
                label={t(`editor.letteringStyles.${s}`)}
                selected={current === s}
                locked={!plus && current !== s}
                onPress={() => setType(s)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    minHeight: 50,
    outlineWidth: 0,
  },
  inputMulti: { minHeight: 104, textAlignVertical: 'top' },
  suggestions: { gap: 8 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 48,
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  swatches: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatchRing: { borderWidth: 3, borderRadius: 30, padding: 3 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  swatchDot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
