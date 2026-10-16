import { useCallback, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { nextIndex } from '@/application/learning/learning';
import { scoreAttempt, type Attempt, type Mode } from '@/application/tracing/score';
import { starsOf } from '@/domain/entities/Progress';
import { lettersOf } from '@/domain/entities/Script';
import { isScriptId, scriptById } from '@/domain/entities/scripts';
import { reviews } from '@/config/container';
import { ScriptText } from '../components/Bits';
import { LetterStrip } from '../components/LetterStrip';
import { AppText, Button, IconButton, Pressy, Segmented } from '../components/Kit';
import { HintSheet, StyleSheetPicker } from '../components/Offers';
import { useGlyph } from '../glyph/useGlyph';
import { isGlossaryKey } from '../i18n';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Stamp, StarRow } from '../writing/Celebration';
import { useInk } from '../writing/useInk';
import { useVoice } from '../writing/useVoice';
import { useWritingStyle } from '../writing/useWritingStyle';
import { WritingPad, type GuideMode } from '../writing/WritingPad';

const MODES: readonly Mode[] = ['trace', 'memory'];

export function TraceScreen() {
  const params = useLocalSearchParams<{ script: string; index: string }>();
  const scriptId = isScriptId(params.script) ? params.script : 'devanagari';
  const script = scriptById(scriptId);
  const letters = lettersOf(script);
  const start = Math.min(letters.length - 1, Math.max(0, Number(params.index) || 0));
  const [index, setIndex] = useState(start);
  const letter = letters[index]!;

  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { settings, seen, haptics, sounds, update } = useSettings();
  const { progress, record, freeHints, takeFreeHint } = useProgress();
  const { plus, entitlements, spendEarnedHint } = useEntitlements();
  const stars = starsOf(progress, script.id, letter.char);

  const [mode, setMode] = useState<Mode>(stars >= 2 ? 'memory' : 'trace');
  const [result, setResult] = useState<Attempt | null>(null);
  const [hinting, setHinting] = useState(0);
  const [hintSheet, setHintSheet] = useState(false);
  const [stylePicker, setStylePicker] = useState(false);
  const [voiceNote, setVoiceNote] = useState(false);
  const [stamp, setStamp] = useState(false);

  // The writing box: as big as fits between the header and the tools.
  const contentWidth = Math.min(width, 560);
  const box = Math.floor(
    Math.max(240, Math.min(contentWidth - 32, height - insets.top - insets.bottom - 372, 520)),
  );
  const glyph = useGlyph(script.font, letter.char, box);
  const { pen, surface, style } = useWritingStyle(box);
  const ink = useInk(style);
  const { lang, speak } = useVoice(script);

  /** A fresh page: for a new letter, a new mode, or another try. */
  const fresh = () => {
    ink.clear();
    setResult(null);
    setStamp(false);
    setVoiceNote(false);
    setHinting(0);
  };

  const switchMode = (m: Mode) => {
    fresh();
    setMode(m);
  };

  const go = (step: 1 | -1) => goTo(nextIndex(script.id, index, step));

  const goTo = (next: number) => {
    if (next === index) return;
    sounds.play('page');
    fresh();
    setIndex(next);
    setMode(starsOf(progress, script.id, letters[next]!.char) >= 2 ? 'memory' : 'trace');
    router.setParams({ index: String(next) });
  };

  const check = () => {
    if (!glyph || ink.empty) return;
    const attempt = scoreAttempt({
      mode,
      contains: glyph.contains,
      glyphBounds: glyph.bounds,
      targets: glyph.shape.inside,
      halfWidth: glyph.shape.halfWidth,
      penRadius: style.width / 2,
      strokes: ink.points(),
    });
    const before = record(script.id, letter.char, attempt.stars);
    setResult(attempt);
    seen(mode === 'trace' ? 'trace' : 'memory');
    if (attempt.stars >= 3) {
      haptics.delight();
      sounds.play('stamp');
      setStamp(true);
      if (before < 3 && !settings.reviewAsked && progress.fromMemory >= 2) {
        update({ reviewAsked: true });
        setTimeout(() => void reviews.request(), 2800);
      }
    } else if (attempt.stars > 0) {
      haptics.delight();
      sounds.play('chime');
    } else {
      haptics.thump();
      sounds.play('soft');
    }
  };

  const showHint = () => {
    if (plus || takeFreeHint() || spendEarnedHint()) {
      setHinting((h) => h + 1);
      haptics.tap();
    } else {
      setHintSheet(true);
    }
  };

  const hear = useCallback(
    (text: string) => {
      if (lang) speak(text, true);
      else setVoiceNote(true);
    },
    [lang, speak],
  );

  const guide: GuideMode = result
    ? 'compare'
    : mode === 'trace'
      ? 'trace'
      : hinting > 0
        ? 'hint'
        : 'hidden';
  const firstTip = mode === 'trace' ? 'trace' : 'memory';
  const showTip = !settings.tipsSeen.includes(firstTip) && !result;
  const meaning = isGlossaryKey(letter.meaning) ? t(`glossary.${letter.meaning}`) : letter.meaning;
  const hintCount = plus ? null : freeHints() + entitlements.hints;
  const left = settings.handedness === 'left';
  // On tall phones the space under the word holds a strip of the script's letters.
  const showStrip = height - insets.top - insets.bottom - box - 372 > 96;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 6 }]}
    >
      <View style={[styles.column, { width: contentWidth }]}>
        <View style={styles.top}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            plain
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <View style={styles.topMid}>
            <AppText variant="heading" numberOfLines={1} center>
              {t(`scripts.${script.id}.name`)}
            </AppText>
            <AppText variant="caption" center>
              {t('trace.position', { index: index + 1, total: letters.length })}
            </AppText>
          </View>
          <IconButton
            icon="color-palette-outline"
            label={t('slate.style')}
            plain
            onPress={() => setStylePicker(true)}
          />
        </View>

        <View style={styles.modes}>
          <Segmented
            options={MODES}
            value={mode}
            label={(m) => (m === 'trace' ? t('trace.modeTrace') : t('trace.modeMemory'))}
            onChange={switchMode}
          />
        </View>

        <View style={styles.middle}>
          <View style={[styles.padWrap, { width: box, height: box }]}>
            <WritingPad
              width={box}
              height={box}
              ink={ink}
              surface={surface}
              pen={pen}
              glyph={glyph}
              guide={guide}
              missed={result && result.stars < 3 ? result.missed : null}
              disabled={result !== null}
              missedColour={theme.star}
              accessibilityLabel={t('trace.padA11y', { letter: letter.translit })}
            />
            {showTip && (
              <Animated.View
                entering={FadeIn.delay(300)}
                exiting={FadeOut}
                pointerEvents="none"
                style={[
                  styles.tip,
                  { backgroundColor: theme.glass, borderColor: theme.glassBorder },
                ]}
              >
                <AppText variant="caption" color={theme.text} center>
                  {mode === 'trace' ? t('trace.traceHint') : t('trace.memoryHint')}
                </AppText>
              </Animated.View>
            )}
            {mode === 'memory' && !result && (
              <View style={[styles.hintSpot, left ? styles.hintRight : styles.hintLeft]}>
                <Pressy
                  onPress={showHint}
                  accessibilityLabel={t('trace.showMe')}
                  accessibilityHint={
                    hintCount === null
                      ? t('trace.hintsUnlimited')
                      : t('trace.hintsLeft', { count: hintCount })
                  }
                  style={[
                    styles.hintButton,
                    { backgroundColor: theme.glass, borderColor: theme.glassBorder },
                  ]}
                >
                  <Ionicons name="eye-outline" size={18} color={theme.text} />
                  <AppText variant="heading" style={styles.hintText}>
                    {t('trace.showMe')}
                  </AppText>
                  {hintCount !== null && (
                    <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                      <AppText variant="caption" color={theme.onAccent} style={styles.badgeText}>
                        {hintCount}
                      </AppText>
                    </View>
                  )}
                </Pressy>
              </View>
            )}
            {stamp && <Stamp script={script} onDone={() => setStamp(false)} />}
          </View>

          <View style={styles.info}>
            <IconButton
              icon="chevron-back"
              label={t('trace.previous')}
              plain
              size={44}
              onPress={() => go(-1)}
            />
            <Pressy
              style={styles.infoMid}
              onPress={() => hear(letter.char)}
              accessibilityLabel={`${t('trace.hear')}: ${letter.translit}`}
            >
              <View style={styles.translitRow}>
                <AppText variant="translit" style={styles.translit}>
                  {letter.translit}
                </AppText>
                <Ionicons name="volume-high" size={22} color={theme.accentText} />
              </View>
              {letter.sound ? (
                <AppText variant="caption" center>
                  {t('trace.soundsLike', { sound: letter.sound })}
                </AppText>
              ) : null}
            </Pressy>
            <IconButton
              icon="chevron-forward"
              label={t('trace.next')}
              plain
              size={44}
              onPress={() => go(1)}
            />
          </View>

          <Pressy
            onPress={() => hear(letter.word)}
            accessibilityLabel={`${t('trace.hearWord')}: ${letter.wordTranslit}, ${meaning}`}
            style={[styles.word, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <ScriptText script={script} size={26}>
              {letter.word}
            </ScriptText>
            <View style={styles.wordText}>
              <AppText variant="heading" numberOfLines={1}>
                {letter.wordTranslit}
              </AppText>
              <AppText variant="caption" numberOfLines={2}>
                {t('trace.meaning', { meaning })}
              </AppText>
            </View>
            <Ionicons name="volume-medium-outline" size={22} color={theme.accentText} />
          </Pressy>

          {voiceNote && (
            <Animated.View
              entering={FadeInDown}
              style={[
                styles.voiceNote,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
              ]}
            >
              <Ionicons name="information-circle-outline" size={20} color={theme.accentText} />
              <AppText
                variant="caption"
                color={theme.text}
                style={styles.flex}
                accessibilityLiveRegion="polite"
              >
                {t('trace.noVoice', {
                  language: t(`speechLanguage.${script.id}`),
                  translit: letter.translit,
                })}
              </AppText>
            </Animated.View>
          )}
        </View>

        {showStrip && <LetterStrip script={script} index={index} onPick={goTo} />}

        {!result && (
          <View
            style={[styles.tools, left && styles.reverse, { paddingBottom: insets.bottom + 10 }]}
          >
            <IconButton
              icon="arrow-undo"
              label={t('trace.undo')}
              plain
              disabled={ink.empty}
              onPress={ink.undo}
            />
            <IconButton
              icon="refresh"
              label={t('trace.clear')}
              plain
              disabled={ink.empty}
              onPress={ink.clear}
            />
            <View style={styles.flex} />
            <Button
              label={t('trace.check')}
              icon="checkmark"
              disabled={ink.empty || !glyph}
              onPress={check}
              accessibilityLabel={ink.empty ? t('trace.writeSomething') : t('trace.check')}
            />
          </View>
        )}
      </View>

      {result && (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          style={[
            styles.result,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + 16,
              boxShadow: `0 -10px 30px ${theme.shadow}`,
            },
          ]}
        >
          <View style={styles.resultHead}>
            <View style={styles.flex}>
              <AppText variant="title" accessibilityLiveRegion="polite">
                {t(`trace.result.title${result.stars}`)}
              </AppText>
              <AppText variant="caption">
                {t('trace.result.covered')} {Math.round(result.coverage * 100)}% ·{' '}
                {t('trace.result.neat')} {Math.round(result.accuracy * 100)}%
              </AppText>
            </View>
            <View
              accessible
              accessibilityLabel={t('trace.result.starsA11y', { count: result.stars })}
            >
              <StarRow count={result.stars} size={30} />
            </View>
          </View>
          <AppText color={theme.muted}>
            {mode === 'memory' && result.stars < 3
              ? t(result.stars === 0 ? 'trace.result.bodyMemory0' : 'trace.result.bodyMemory2')
              : t(`trace.result.body${result.stars}`)}
          </AppText>
          <View style={styles.resultButtons}>
            <Button
              kind="secondary"
              icon="refresh"
              label={t('trace.result.tryAgain')}
              onPress={fresh}
            />
            {mode === 'trace' && result.stars >= 1 ? (
              <Button
                icon="sparkles-outline"
                label={t('trace.result.fromMemory')}
                style={styles.flex}
                onPress={() => switchMode('memory')}
              />
            ) : (
              <Button
                icon="arrow-forward"
                label={t('trace.result.nextLetter')}
                style={styles.flex}
                onPress={() => go(1)}
              />
            )}
          </View>
        </Animated.View>
      )}

      <HintSheet visible={hintSheet} onClose={() => setHintSheet(false)} onGranted={showHint} />
      <StyleSheetPicker visible={stylePicker} onClose={() => setStylePicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { flex: 1, paddingHorizontal: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topMid: { flex: 1 },
  modes: { marginTop: 2 },
  middle: { gap: 10 },
  padWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  tip: {
    position: 'absolute',
    top: 10,
    left: 22,
    right: 22,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reverse: { flexDirection: 'row-reverse' },
  infoMid: { flex: 1, alignItems: 'center' },
  translitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  translit: { fontSize: 32, lineHeight: 40 },
  word: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 60,
  },
  wordText: { flex: 1 },
  voiceNote: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, marginTop: 'auto' },
  hintSpot: { position: 'absolute', bottom: 10 },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  hintLeft: { left: 10 },
  hintRight: { right: 10 },
  hintText: { fontSize: 15 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  flex: { flex: 1 },
  result: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
