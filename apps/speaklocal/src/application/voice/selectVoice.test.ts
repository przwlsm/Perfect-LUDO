import type { DeviceVoice } from '@/domain/ports';
import { chooseVoice, parseTag, rankVoices, voiceGender, voicesFor } from './selectVoice';

const v = (id: string, language: string, name = id, enhanced = false): DeviceVoice => ({
  id,
  name,
  language,
  enhanced,
});

describe('voiceGender', () => {
  it.each([
    ['kn-in-x-knf-local', 'female'],
    ['kn-in-x-knm-network', 'male'],
    ['te-in-x-tef-local', 'female'],
    ['ml-in-x-mlm-local', 'male'],
    ['hi-in-x-hia-local', 'female'],
    ['hi-in-x-hic-network', 'female'],
    ['hi-in-x-hid-local', 'male'],
    ['hi-in-x-hie-local', 'male'],
    ['hin-IND-SMTf00', 'female'],
    ['hin-IND-SMTm00', 'male'],
    ['com.apple.voice.compact.hi-IN.Lekha', 'female'],
    ['com.apple.ttsbundle.Lekha-compact', 'female'],
    ['Microsoft Swara Online (Natural) - Hindi (India)', 'female'],
    ['Microsoft Madhur Online (Natural) - Hindi (India)', 'male'],
    ['Microsoft Pallavi Online (Natural) - Tamil (India)', 'female'],
    ['Microsoft Valluvar Online (Natural) - Tamil (India)', 'male'],
    ['Tamil India Female', 'female'],
    ['Tamil India Male', 'male'],
    ['Google தமிழ்', 'unknown'],
    ['ta-in-x-tag-network', 'unknown'],
  ] as const)('%s → %s', (id, gender) => {
    expect(voiceGender(v(id, 'xx'))).toBe(gender);
  });

  it('never reads "female" as "male", or a name inside a longer word', () => {
    expect(voiceGender(v('x', 'hi-IN', 'Female voice 2'))).toBe('female');
    expect(voiceGender(v('x', 'hi-IN', 'Manohar'))).toBe('male');
    expect(voiceGender(v('x', 'hi-IN', 'Mandakini'))).toBe('unknown');
  });
});

describe('parseTag', () => {
  it('reads every way platforms write a language', () => {
    expect(parseTag('kn-IN')).toEqual({ lang: 'kn', region: 'in' });
    expect(parseTag('kn_IN')).toEqual({ lang: 'kn', region: 'in' });
    expect(parseTag('kan-IND')).toEqual({ lang: 'kn', region: 'in' });
    expect(parseTag('ta')).toEqual({ lang: 'ta', region: '' });
  });
});

describe('choosing a voice', () => {
  const android: DeviceVoice[] = [
    v('en-in-x-ena-local', 'en-IN'),
    v('kn-in-x-knm-local', 'kn-IN'),
    v('kn-in-x-knf-network', 'kn-IN'),
    v('kn-in-x-knf-local', 'kn-IN'),
    v('hi-in-x-hid-local', 'hi-IN'),
    v('hi-in-x-hia-local', 'hi-IN'),
    v('ta-in-x-tad-local', 'ta-IN'),
  ];

  it('prefers a female, on-device voice', () => {
    expect(chooseVoice(android, 'kn-IN')?.id).toBe('kn-in-x-knf-local');
    expect(chooseVoice(android, 'hi-IN')?.id).toBe('hi-in-x-hia-local');
  });

  it('falls back to the best unknown voice rather than none', () => {
    expect(chooseVoice(android, 'ta-IN')?.id).toBe('ta-in-x-tad-local');
  });

  it('returns null when the device has no voice for the language', () => {
    expect(chooseVoice(android, 'ml-IN')).toBeNull();
    expect(chooseVoice([], 'kn-IN')).toBeNull();
  });

  it('keeps the learner choice while the device still has it', () => {
    expect(chooseVoice(android, 'kn-IN', 'kn-in-x-knm-local')?.id).toBe('kn-in-x-knm-local');
    expect(chooseVoice(android, 'kn-IN', 'gone-voice')?.id).toBe('kn-in-x-knf-local');
  });

  it('puts enhanced quality above standard among equals', () => {
    const ios = [
      v('com.apple.voice.compact.kn-IN.Soumya', 'kn-IN', 'Soumya'),
      v('com.apple.voice.enhanced.kn-IN.Soumya', 'kn-IN', 'Soumya', true),
      v('com.example.kn.Voice', 'kn-IN', 'Voice'),
    ];
    expect(rankVoices(ios).map((x) => x.id)).toEqual([
      'com.apple.voice.enhanced.kn-IN.Soumya',
      'com.apple.voice.compact.kn-IN.Soumya',
      'com.example.kn.Voice',
    ]);
  });

  it('prefers the city region, but accepts the language from elsewhere', () => {
    const list = [v('bn-bd-x-ban-local', 'bn-BD'), v('bn-in-x-bnm-local', 'bn-IN')];
    expect(voicesFor(list, 'bn-IN').map((x) => x.id)).toEqual([
      'bn-in-x-bnm-local',
      'bn-bd-x-ban-local',
    ]);
    expect(chooseVoice([v('bn-bd-x-ban-local', 'bn-BD')], 'bn-IN')?.id).toBe('bn-bd-x-ban-local');
  });

  it('is stable for the same list in any order', () => {
    const shuffled = [...android].reverse();
    expect(rankVoices(shuffled)).toEqual(rankVoices(android));
  });
});
