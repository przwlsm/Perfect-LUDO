import type { LanguagePack } from '../types';

/**
 * Kannada as spoken in Bengaluru: everyday city Kannada, not the written
 * standard. Clipped spoken verb forms (barthira, maadbeku, aaglilla, ide),
 * the plural "neevu" and -i/-ri imperatives with strangers, elders and
 * officials, singular "neenu" and -u imperatives only between friends, and
 * the English loanwords Bengaluru really uses (meter, straight, left, current).
 *
 * Romanisation: long vowels doubled (aa, ee, oo); e and o cover both short
 * and long e/o. Dental t/d are "th"/"dh" (thumbaa, idhe), retroflex t/d are
 * "t"/"d" (gante, beda); doubled consonants are written double (Ell-li,
 * hatthu, iddheeni). Both l sounds are "l" (ಳ too: heli), both n sounds "n",
 * ಶ/ಷ are "sh", ಚ "ch", ಜ "j", ವ "v" ("w" after s: swalpa). English
 * loanwords keep their English spelling (meter, bill, sorry, thanks).
 *
 * Needs native-speaker review before launch.
 */
export const KANNADA: LanguagePack = {
  lang: 'kn',
  lines: {
    // greetings
    'greetings.1': ['ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?', 'Namas-kaara! Hegid-dheeraa?'],
    'greetings.2': [
      'ಚೆನ್ನಾಗಿದ್ದೀನಿ, ಥ್ಯಾಂಕ್ಸ್. ನೀವು?',
      'Chennaa-giddheeni, thanks. Neevu?',
      { note: 'Neevu is the polite “you”; keep neenu for close friends.' },
    ],
    'greetings.3': [
      'ನಾನೂ ಚೆನ್ನಾಗಿದ್ದೀನಿ. ನೀವು ಇಲ್ಲಿಗೆ ಹೊಸಬರಾ?',
      'Naanoo chennaa-giddheeni. Neevu illige hosabaraa?',
    ],
    'greetings.4': ['ಹೌದು, ನನಗೆ ಈ ಊರು ಹೊಸದು.', 'Haudhu, nanage ee ooru hosadhu.'],
    'greetings.5': ['ಪರವಾಗಿಲ್ಲ! ಸ್ವಾಗತ.', 'Paravaa-gilla! Swaagatha.'],
    'greetings.6': ['ತುಂಬಾ ಥ್ಯಾಂಕ್ಸ್. ಆಮೇಲೆ ಸಿಗೋಣ!', 'Thumbaa thanks. Aamele sigona!'],
    'greetings.x1': ['ಸಾರಿ, ನನಗೆ ಅರ್ಥ ಆಗ್ಲಿಲ್ಲ.', 'Sorry, nanage artha aaglilla.'],
    'greetings.x2': [
      'ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಇನ್ನೊಂದ್ಸಲ ಹೇಳಿ.',
      'Swalpa nidhaana-vaagi innondh-sala heli.',
      { note: 'Swalpa (a little) softens any request; Bengaluru uses it all the time.' },
    ],
    'greetings.x3': ['ಇದಕ್ಕೆ ಇಲ್ಲಿ ಏನಂತಾರೆ?', 'Idhakke illi enan-thaare?'],

    // numbers
    'numbers.1': ['ಇದು ಎಷ್ಟು?', 'Idhu eshtu?'],
    'numbers.2': ['ಐವತ್ತು ರೂಪಾಯಿ.', 'Aivatthu roopaayi.'],
    'numbers.3': ['ಮತ್ತೆ ಈ ಎರಡು?', 'Matthe ee eradu?'],
    'numbers.4': ['ಎರಡಕ್ಕೂ ನೂರು ರೂಪಾಯಿ.', 'Eradakkoo nooru roopaayi.'],
    'numbers.5': [
      'ತಗೊಳ್ಳಿ, ಇನ್ನೂರು. ಚಿಲ್ಲರೆ ಇದೆಯಾ?',
      'Thagolli, innooru. Chillare idheyaa?',
      { note: 'Chillare is small change; shops are always short of it.' },
    ],
    'numbers.6': ['ಹಾ, ತಗೊಳ್ಳಿ ನೂರು ವಾಪಸ್.', 'Haa, thagolli nooru vaapas.'],
    'numbers.x1': ['ಒಂದು, ಎರಡು, ಮೂರು, ನಾಲ್ಕು, ಐದು.', 'Ondhu, eradu, mooru, naalku, aidhu.'],
    'numbers.x2': ['ಆರು, ಏಳು, ಎಂಟು, ಒಂಬತ್ತು, ಹತ್ತು.', 'Aaru, elu, entu, ombatthu, hatthu.'],
    'numbers.x3': ['ಯುಪಿಐ ಮಾಡ್ಬೋದಾ?', 'UPI maad-bodhaa?'],

    // auto
    'auto.1': [
      'ಅಣ್ಣ, ರೈಲ್ವೇ ಸ್ಟೇಷನ್ ಬರ್ತೀರಾ?',
      'Anna, railway station bar-theeraa?',
      { note: 'Call an auto driver “Anna” (elder brother): friendly and respectful.' },
    ],
    'auto.2': ['ಹಾ, ಕೂತ್ಕೊಳ್ಳಿ. ಇನ್ನೂರು ರೂಪಾಯಿ.', 'Haa, kooth-kolli. Innooru roopaayi.'],
    'auto.3': [
      'ಮೀಟರ್ ಹಾಕಿ, ಪ್ಲೀಸ್.',
      'Meter haaki, please.',
      { note: '“Meter haaki” (put the meter on) is the key Bengaluru auto phrase.' },
    ],
    'auto.4': ['ಮೀಟರ್ ಮೇಲೆ ಐವತ್ತು, ಸಾರ್.', 'Meter mele aivatthu, saar.'],
    'auto.5': [
      'ಸರಿ. ಸ್ಟ್ರೇಟ್ ಹೋಗಿ, ಆಮೇಲೆ ಲೆಫ್ಟ್ ತಗೊಳ್ಳಿ.',
      'Sari. Straight hogi, aamele left thagolli.',
      { note: 'Bengaluru gives directions in English words: straight, left, right.' },
    ],
    'auto.6': ['ಇಲ್ಲೇ ನಿಲ್ಸಿ.', 'Ille nilsi.'],
    'auto.x1': ['ಸ್ವಲ್ಪ ನಿಧಾನ ಹೋಗಿ.', 'Swalpa nidhaana hogi.'],
    'auto.x2': ['ಎಷ್ಟು ಹೊತ್ತು ಆಗುತ್ತೆ?', 'Eshtu hotthu aagutthe?'],
    'auto.x3': ['ಇಲ್ಲಿ ರೈಟ್ ತಗೊಳ್ಳಿ.', 'Illi right thagolli.'],

    // shopping
    'shopping.1': [
      'ಟೊಮೇಟೊ ಹೆಂಗೆ ಕೊಡ್ತೀರಾ?',
      'Tomato henge kod-theeraa?',
      { note: '“Henge kodtheera?” (how are you selling it?) is the market way to ask a price.' },
    ],
    'shopping.2': ['ಕೆಜಿಗೆ ಅರವತ್ತು ರೂಪಾಯಿ.', 'Keji-ge aravatthu roopaayi.'],
    'shopping.3': ['ತುಂಬಾ ಜಾಸ್ತಿ! ಐವತ್ತಕ್ಕೆ ಕೊಡಿ.', 'Thumbaa jaasthi! Aivatthakke kodi.'],
    'shopping.4': ['ಐವತ್ತೈದು, ಲಾಸ್ಟ್ ರೇಟು.', 'Aivatth-aidhu, last rate.'],
    'shopping.5': [
      'ಸರಿ, ಒಂದು ಕೆಜಿ ಕೊಡಿ. ಸ್ವಲ್ಪ ಕೊತ್ತಂಬರಿನೂ ಕೊಡಿ.',
      'Sari, ondhu keji kodi. Swalpa kotthambari-noo kodi.',
      { note: 'Kotthambari is coriander leaves; vendors often throw some in free.' },
    ],
    'shopping.6': ['ನಿಮಗೆ ಕೊತ್ತಂಬರಿ ಫ್ರೀ!', 'Nimage kotthambari free!'],
    'shopping.x1': ['ಫ್ರೆಶ್ ಆಗಿದೆಯಾ?', 'Fresh aagidheyaa?'],
    'shopping.x2': ['ಅರ್ಧ ಕೆಜಿ ಕೊಡಿ.', 'Ardha keji kodi.'],
    'shopping.x3': ['ಅದನ್ನ ತೋರಿಸಿ.', 'Adhanna thorisi.'],

    // landlord
    'landlord.1': ['ಈ ಮನೆ ಬಾಡಿಗೆಗೆ ಇದೆಯಾ?', 'Ee mane baadigege idheyaa?'],
    'landlord.2': [
      'ಹೌದು. ಎರಡು ಬೆಡ್ರೂಮ್. ಬಾಡಿಗೆ ಇಪ್ಪತ್ತು ಸಾವಿರ.',
      'Haudhu. Eradu bedroom. Baadige ippatthu saavira.',
    ],
    'landlord.3': [
      'ಅಡ್ವಾನ್ಸ್ ಎಷ್ಟು?',
      'Advance eshtu?',
      { note: 'The deposit is called “advance” and is often several months’ rent.' },
    ],
    'landlord.4': ['ಮೂರು ತಿಂಗಳ ಬಾಡಿಗೆ.', 'Mooru thingala baadige.'],
    'landlord.5': ['ನೀರು ದಿನ ಪೂರ್ತಿ ಬರುತ್ತಾ?', 'Neeru dhina poorthi barutthaa?'],
    'landlord.6': ['ಹೌದು, ಪಾರ್ಕಿಂಗ್ ಕೂಡ ಇದೆ.', 'Haudhu, parking kooda idhe.'],
    'landlord.7': ['ಒಮ್ಮೆ ಮನೆ ನೋಡ್ಬಹುದಾ?', 'Omme mane nod-bahudhaa?'],
    'landlord.x1': ['ನಲ್ಲಿ ಸೋರ್ತಿದೆ.', 'Nalli sor-thidhe.'],
    'landlord.x2': ['ಬಾಡಿಗೆ ಯಾವಾಗ ಕೊಡ್ಬೇಕು?', 'Baadige yaavaaga kod-beku?'],
    'landlord.x3': [
      'ಕರೆಂಟ್ ಹೋಗಿದೆ.',
      'Current hogidhe.',
      { note: 'Bengaluru says “current” for electricity, so a power cut is “current hogide”.' },
    ],

    // office
    'office.1': [
      'ಗುಡ್ ಮಾರ್ನಿಂಗ್! ತಿಂಡಿ ಆಯ್ತಾ?',
      'Good morning! Thindi aaythaa?',
      { note: '“Thindi aaytha?” (had breakfast?) is an everyday friendly greeting.' },
    ],
    'office.2': ['ಹಾ, ಆಯ್ತು. ನಿಮ್ದು?', 'Haa, aaythu. Nimdhu?'],
    'office.3': ['ಆಯ್ತು. ಇವತ್ತು ತುಂಬಾ ಕೆಲಸ ಇದೆಯಾ?', 'Aaythu. Ivatthu thumbaa kelasa idheyaa?'],
    'office.4': ['ಹೌದು, ಹನ್ನೊಂದು ಗಂಟೆಗೆ ಮೀಟಿಂಗ್ ಇದೆ.', 'Haudhu, hannondhu gantege meeting idhe.'],
    'office.5': ['ನಾಲ್ಕು ಗಂಟೆಗೆ ಟೀ ಕುಡಿಯೋಕೆ ಹೋಗೋಣ.', 'Naalku gantege tea kudiyoke hogona.'],
    'office.6': ['ಪಕ್ಕಾ, ಆಗ ಸಿಗೋಣ.', 'Pakkaa, aaga sigona.'],
    'office.x1': ['ಸರಿ, ಬೈ! ನಾಳೆ ಸಿಗೋಣ.', 'Sari, bye! Naale sigona.'],
    'office.x2': ['ನಿಮ್ದು ಯಾವ ಊರು?', 'Nimdhu yaava ooru?'],
    'office.x3': ['ವೀಕೆಂಡ್ ಏನ್ ಪ್ಲಾನ್?', 'Weekend en plan?'],

    // neighbours
    'neighbours.1': [
      'ಪಕ್ಕದ ಮನೆಗೆ ಹೊಸದಾಗಿ ಬಂದಿದ್ದೀರಾ, ಅಲ್ವಾ?',
      'Pakkadha manege hosadhaagi bandhid-dheeraa, alvaa?',
    ],
    'neighbours.2': ['ಹೌದು, ಹೋದ ವಾರ ಬಂದ್ವಿ.', 'Haudhu, hodha vaara bandhvi.'],
    'neighbours.3': ['ಸ್ವಾಗತ! ಏನಾದ್ರೂ ಬೇಕಿದ್ರೆ ಕೇಳಿ.', 'Swaagatha! Enaadhroo bekidhre keli.'],
    'neighbours.4': [
      'ಥ್ಯಾಂಕ್ಸ್. ಕಸದ ಗಾಡಿ ಎಷ್ಟು ಹೊತ್ತಿಗೆ ಬರುತ್ತೆ?',
      'Thanks. Kasadha gaadi eshtu hotthige barutthe?',
    ],
    'neighbours.5': ['ದಿನಾ ಬೆಳಿಗ್ಗೆ ಏಳು ಗಂಟೆಗೆ.', 'Dhinaa beligge elu gantege.'],
    'neighbours.6': [
      'ಥ್ಯಾಂಕ್ಸ್! ಒಂದ್ಸಲ ಮನೆಗೆ ಬನ್ನಿ, ಕಾಫಿ ಕುಡಿಯೋಣ.',
      'Thanks! Ondh-sala manege banni, coffee kudiyona.',
      {
        en: 'Thanks! Do come home sometime, let’s have coffee.',
        hi: 'धन्यवाद! कभी घर आइए, कॉफ़ी पीते हैं।',
        note: 'In Bengaluru you invite people over for filter coffee rather than tea.',
      },
    ],
    'neighbours.x1': [
      'ಇವತ್ತು ಹಾಲಿನ ಪ್ಯಾಕೆಟ್ ಬಂದಿಲ್ಲ.',
      'Ivatthu haalina packet bandhilla.',
      { note: 'Milk packets (often Nandini) are left at the door early each morning.' },
    ],
    'neighbours.x2': ['ಹತ್ರ ಯಾವ್ದಾದ್ರೂ ಅಂಗಡಿ ಇದೆಯಾ?', 'Hathra yaavdh-aadhroo angadi idheyaa?'],

    // directions
    'directions.1': [
      'ಸಾರ್, ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ?',
      'Saar, metro station ellidhe?',
      { note: 'Open with “saar” or “madam” to stop a stranger politely.' },
    ],
    'directions.2': ['ಸ್ಟ್ರೇಟ್ ಹೋಗಿ, ರೈಟ್ ತಗೊಳ್ಳಿ.', 'Straight hogi, right thagolli.'],
    'directions.3': ['ದೂರ ಇದೆಯಾ?', 'Dhoora idheyaa?'],
    'directions.4': [
      'ಇಲ್ಲ, ಹತ್ರಾನೇ ಇದೆ. ನಡ್ಕೊಂಡು ಐದು ನಿಮಿಷ.',
      'Illa, hathraane idhe. Nad-kondu aidhu nimisha.',
    ],
    'directions.5': ['ಬಸ್ ಸ್ಟಾಪ್ ಹತ್ರ ಇದೆಯಾ?', 'Bus stop hathra idheyaa?'],
    'directions.6': ['ಹೌದು, ಎದುರುಗಡೆನೇ ಇದೆ.', 'Haudhu, edhuru-gadene idhe.'],
    'directions.7': ['ಥ್ಯಾಂಕ್ಸ್ ಸಾರ್!', 'Thanks saar!'],
    'directions.x1': ['ಟಾಯ್ಲೆಟ್ ಎಲ್ಲಿದೆ?', 'Toilet ellidhe?'],
    'directions.x2': ['ನನಗೆ ದಾರಿ ಗೊತ್ತಿಲ್ಲ.', 'Nanage dhaari gotthilla.'],
    'directions.x3': ['ಅಲ್ಲಿಗೆ ಯಾವ ಬಸ್ ಹೋಗುತ್ತೆ?', 'Allige yaava bus hogutthe?'],

    // restaurant
    'restaurant.1': [
      'ಒಂದು ಕಾಫಿ, ಒಂದು ಟೀ ಕೊಡಿ.',
      'Ondhu coffee, ondhu tea kodi.',
      { note: 'Coffee here means strong filter coffee, served in a small steel tumbler.' },
    ],
    'restaurant.2': ['ತಿನ್ನೋಕೆ ಏನಾದ್ರೂ?', 'Thinnoke enaadhroo?'],
    'restaurant.3': ['ಏನಿದೆ?', 'Enidhe?'],
    'restaurant.4': [
      'ಇಡ್ಲಿ ವಡೆ, ಮಸಾಲೆ ದೋಸೆ, ಖಾರಾ ಬಾತ್ ರೆಡಿ ಇದೆ.',
      'Idli vade, masaale dhose, khaaraa baath ready idhe.',
      {
        en: 'Idli-vada, masala dosa and khara bath are ready.',
        hi: 'इडली-वड़ा, मसाला डोसा और खारा बाथ तैयार हैं।',
        note: 'Standard darshini (stand-up eatery) fare; khara bath is spicy semolina upma.',
      },
    ],
    'restaurant.5': [
      'ಒಂದು ಮಸಾಲೆ ದೋಸೆ. ಜಾಸ್ತಿ ಖಾರ ಬೇಡ.',
      'Ondhu masaale dhose. Jaasthi khaara beda.',
      {
        en: 'One masala dosa. Not too spicy.',
        hi: 'एक मसाला डोसा। ज़्यादा तीखा नहीं।',
        note: 'Kannada says dose and vade where other places say dosa and vada.',
      },
    ],
    'restaurant.6': ['ಬಿಲ್ ಕೊಡಿ.', 'Bill kodi.'],
    'restaurant.7': ['ತೊಂಬತ್ತು ರೂಪಾಯಿ.', 'Thombatthu roopaayi.'],
    'restaurant.x1': ['ಇದು ವೆಜ್ ತಾನೇ?', 'Idhu veg thaane?'],
    'restaurant.x2': ['ಸ್ವಲ್ಪ ನೀರು ಕೊಡಿ.', 'Swalpa neeru kodi.'],
    'restaurant.x3': ['ಪಾರ್ಸಲ್ ಮಾಡಿ ಕೊಡಿ.', 'Parcel maadi kodi.'],

    // doctor
    'doctor.1': ['ಏನ್ ತೊಂದ್ರೆ?', 'En thondhre?'],
    'doctor.2': ['ಜ್ವರ ಮತ್ತೆ ತಲೆನೋವು ಇದೆ.', 'Jwara matthe thale-novu idhe.'],
    'doctor.3': ['ಯಾವಾಗಿಂದ?', 'Yaavaa-gindha?'],
    'doctor.4': ['ನಿನ್ನೆ ರಾತ್ರಿಯಿಂದ.', 'Ninne raathri-yindha.'],
    'doctor.5': [
      'ಈ ಮಾತ್ರೆ ದಿನಕ್ಕೆ ಎರಡು ಸಲ, ಊಟ ಆದ್ಮೇಲೆ ತಗೊಳ್ಳಿ.',
      'Ee maathre dhinakke eradu sala, oota aadh-mele thagolli.',
    ],
    'doctor.6': ['ಈ ಔಷಧಿ ಇದೆಯಾ?', 'Ee aushadhi idheyaa?'],
    'doctor.7': ['ಇದೆ. ಎಪ್ಪತ್ತು ರೂಪಾಯಿ.', 'Idhe. Eppatthu roopaayi.'],
    'doctor.x1': ['ಹೊಟ್ಟೆ ನೋವು ಇದೆ.', 'Hotte novu idhe.'],
    'doctor.x2': ['ಕೆಮ್ಮು, ನೆಗಡಿ ಇದೆ.', 'Kemmu, negadi idhe.'],
    'doctor.x3': ['ಹತ್ರ ಯಾವ್ದಾದ್ರೂ ಆಸ್ಪತ್ರೆ ಇದೆಯಾ?', 'Hathra yaavdh-aadhroo aaspathre idheyaa?'],

    // emergency
    'emergency.1': [
      'ಕಾಪಾಡಿ! ಸಹಾಯ ಮಾಡಿ!',
      'Kaapaadi! Sahaaya maadi!',
      { note: 'Dial 112 for police, fire or ambulance anywhere in India.' },
    ],
    'emergency.2': ['ಏನಾಯ್ತು?', 'Enaaythu?'],
    'emergency.3': ['ಆಕ್ಸಿಡೆಂಟ್ ಆಗಿದೆ. ಆಂಬುಲೆನ್ಸ್ ಕರೀರಿ!', 'Accident aagidhe. Ambulance kareeri!'],
    'emergency.4': [
      'ಈಗಲೇ ಫೋನ್ ಮಾಡ್ತೀನಿ. ಗಾಬರಿ ಆಗ್ಬೇಡಿ.',
      'Eegale phone maad-theeni. Gaabari aag-bedi.',
    ],
    'emergency.5': ['ಪೊಲೀಸ್ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ?', 'Police station ellidhe?'],
    'emergency.6': ['ಮೇನ್ ರೋಡ್ ಹತ್ರ.', 'Main road hathra.'],
    'emergency.7': ['ನನ್ನ ಫೋನ್ ಕಳ್ಳತನ ಆಗಿದೆ.', 'Nanna phone kallathana aagidhe.'],
    'emergency.x1': ['ಬೆಂಕಿ ಬಿದ್ದಿದೆ!', 'Benki biddhidhe!'],
    'emergency.x2': ['ಪೊಲೀಸ್ ಕರೀರಿ!', 'Police kareeri!'],
    'emergency.x3': ['ಅರ್ಜೆಂಟಾಗಿ ಡಾಕ್ಟರ್ ಬೇಕು.', 'Urgent-aagi doctor beku.'],

    // delivery
    'delivery.1': ['ಹಲೋ, ನಿಮ್ಮ ಫುಡ್ ಆರ್ಡರ್ ಬಂದಿದೆ.', 'Hello, nimma food order bandhidhe.'],
    'delivery.2': ['ಹಲೋ. ಎಲ್ಲಿದ್ದೀರಾ?', 'Hello. Ellid-dheeraa?'],
    'delivery.3': ['ಗೇಟ್ ಹತ್ರ. ಯಾವ ಫ್ಲೋರ್?', 'Gate hathra. Yaava floor?'],
    'delivery.4': ['ಮೂರನೇ ಫ್ಲೋರ್. ಮೇಲೆ ಬನ್ನಿ.', 'Moorane floor. Mele banni.'],
    'delivery.5': ['ಲಿಫ್ಟ್ ಕೆಲಸ ಮಾಡ್ತಿಲ್ಲ.', 'Lift kelasa maad-thilla.'],
    'delivery.6': ['ಸರಿ, ಇರಿ. ಎರಡು ನಿಮಿಷ.', 'Sari, iri. Eradu nimisha.'],
    'delivery.x1': ['ಬಾಗಿಲ ಹತ್ರ ಇಟ್ಟುಬಿಡಿ.', 'Baagila hathra ittu-bidi.'],
    'delivery.x2': ['ಬಂದ್ಮೇಲೆ ಫೋನ್ ಮಾಡಿ.', 'Bandh-mele phone maadi.'],
    'delivery.x3': ['ಯಾರು ಮಾತಾಡ್ತಿರೋದು?', 'Yaaru maathaad-thirodhu?'],

    // festival
    'festival.1': [
      'ಹಬ್ಬದ ಶುಭಾಶಯಗಳು! ನಾಳೆ ಮನೆಗೆ ಬನ್ನಿ.',
      'Habbadha shubhaa-shayagalu! Naale manege banni.',
      { note: 'Habba means festival: Ugadi, Sankranti, Ganesha Habba, Dasara and Deepavali.' },
    ],
    'festival.2': [
      'ಥ್ಯಾಂಕ್ಸ್! ನಿಮಗೂ ಹಬ್ಬದ ಶುಭಾಶಯಗಳು.',
      'Thanks! Nimagoo habbadha shubhaa-shayagalu.',
    ],
    'festival.3': [
      'ಸಿಹಿ ಮಾಡ್ತಿದ್ದೀವಿ. ಒಂದು ಗಂಟೆಗೆ ಊಟ.',
      'Sihi maad-thiddheevi. Ondhu gantege oota.',
    ],
    'festival.4': ['ಸೂಪರ್! ಏನಾದ್ರೂ ತರ್ಬೇಕಾ?', 'Super! Enaadhroo thar-bekaa?'],
    'festival.5': ['ಏನೂ ಬೇಡ, ಮನೆಯವರ ಜೊತೆ ಬನ್ನಿ ಸಾಕು.', 'Enoo beda, maneyavara jothe banni saaku.'],
    'festival.6': [
      'ಸಾಕು, ಸಾಕು! ಹೊಟ್ಟೆ ತುಂಬಿತು.',
      'Saaku, saaku! Hotte thumbithu.',
      { note: 'Hosts keep serving; a firm “saaku” (enough) with a hand over the leaf is polite.' },
    ],
    'festival.x1': [
      'ಈ ಹಬ್ಬಕ್ಕೆ ಏನಂತಾರೆ?',
      'Ee habbakke enan-thaare?',
      {
        note: 'Ugadi is the Kannada New Year; at Sankranti people share ellu-bella (sesame-jaggery).',
      },
    ],
    'festival.x2': [
      'ಈ ಸಿಹಿ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!',
      'Ee sihi thumbaa chennaa-gidhe!',
      { note: 'Look out for holige (obbattu), the sweet stuffed flatbread of Kannada festivals.' },
    ],

    // wedding
    'wedding.1': ['ಬಂದ್ರಾ! ಮದುವೆಗೆ ಸ್ವಾಗತ.', 'Bandhraa! Madhuvege swaagatha.'],
    'wedding.2': ['ಕಂಗ್ರಾಟ್ಸ್! ಮದುಮಕ್ಕಳು ಎಲ್ಲಿದ್ದಾರೆ?', 'Congrats! Madhu-makkalu ellid-dhaare?'],
    'wedding.3': ['ಸ್ಟೇಜ್ ಮೇಲೆ ಇದ್ದಾರೆ. ಊಟ ಆಯ್ತಾ?', 'Stage mele iddhaare. Oota aaythaa?'],
    'wedding.4': [
      'ಇನ್ನೂ ಇಲ್ಲ. ಮೊದಲು ಗಿಫ್ಟ್ ಕೊಟ್ಟು ಬರ್ತೀನಿ.',
      'Innoo illa. Modhalu gift kottu bartheeni.',
    ],
    'wedding.5': ['ಆಮೇಲೆ ಒಟ್ಟಿಗೆ ಊಟ ಮಾಡೋಣ, ಬನ್ನಿ.', 'Aamele ottige oota maadona, banni.'],
    'wedding.6': ['ಡೆಕೊರೇಷನ್ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!', 'Decoration thumbaa chennaa-gidhe!'],
    'wedding.x1': ['ನಿಮ್ಮಿಬ್ಬರ ಜೀವನ ಸುಖವಾಗಿರಲಿ!', 'Nimm-ibbara jeevana sukha-vaagirali!'],
    'wedding.x2': ['ಊಟ ತುಂಬಾ ಚೆನ್ನಾಗಿತ್ತು!', 'Oota thumbaa chennaa-gitthu!'],

    // cricket
    'cricket.1': ['ನಿನ್ನೆ ಮ್ಯಾಚ್ ನೋಡಿದ್ಯಾ?', 'Ninne match nodidh-yaa?'],
    'cricket.2': [
      'ಹೌದು! ಏನ್ ಲಾಸ್ಟ್ ಓವರ್ ಗುರು!',
      'Haudhu! En last over guru!',
      { note: '“Guru” is Bengaluru slang for buddy, used between friends.' },
    ],
    'cricket.3': ['ನೀನು ಯಾವ ಟೀಮ್ ಸಪೋರ್ಟ್ ಮಾಡ್ತೀಯ?', 'Neenu yaava team support maad-theeya?'],
    'cricket.4': [
      'ಇನ್ಮೇಲೆ, ನಮ್ಮ ಬೆಂಗಳೂರು ಟೀಮ್!',
      'Inmele, namma Bengaluru team!',
      { note: '“Namma” (our) is everywhere here: Namma Bengaluru, Namma Metro.' },
    ],
    'cricket.5': [
      'ಹಾಗಿದ್ರೆ ಮುಂದಿನ ಮ್ಯಾಚ್ ಒಟ್ಟಿಗೆ ನೋಡೋಣ.',
      'Haagidhre mundhina match ottige nodona.',
    ],
    'cricket.6': ['ಪಕ್ಕಾ! ಸ್ನ್ಯಾಕ್ಸ್ ನಂದು.', 'Pakkaa! Snacks nandhu.'],
    'cricket.x1': ['ಸ್ಕೋರ್ ಎಷ್ಟು?', 'Score eshtu?'],
    'cricket.x2': ['ಏನ್ ಶಾಟ್ ಗುರು!', 'En shot guru!'],

    // movies
    'movies.1': [
      'ಹೊಸ ಪಿಕ್ಚರ್ ಬಂದಿದೆ. ಸಂಡೇ ಹೋಗೋಣ್ವಾ?',
      'Hosa picture bandhidhe. Sunday hogon-vaa?',
      { note: 'A film is usually “picture” or “cinema” in everyday Bengaluru talk.' },
    ],
    'movies.2': ['ಹಾ! ಹೀರೋ ಯಾರು?', 'Haa! Hero yaaru?'],
    'movies.3': [
      'ದೊಡ್ಡ ಸ್ಟಾರ್. ಎಲ್ರೂ ಸೂಪರ್ ಅಂತಿದ್ದಾರೆ.',
      'Dhodda star. Elroo super anthid-dhaare.',
    ],
    'movies.4': ['ಸಬ್ಟೈಟಲ್ ಇರೋ ಶೋ ಇದೆಯಾ?', 'Subtitle iro show idheyaa?'],
    'movies.5': ['ಹಾ, ಸಂಜೆ ಆರು ಗಂಟೆ ಶೋ.', 'Haa, sanje aaru gante show.'],
    'movies.6': [
      'ಎರಡು ಟಿಕೆಟ್ ಬುಕ್ ಮಾಡು. ಪಾಪ್ಕಾರ್ನ್ ನಂದು!',
      'Eradu ticket book maadu. Popcorn nandhu!',
    ],
    'movies.x1': ['ಪಿಕ್ಚರ್ ಸೂಪರ್ ಆಗಿತ್ತು!', 'Picture super aagitthu!'],
    'movies.x2': ['ಕ್ಲೈಮ್ಯಾಕ್ಸ್ ಅರ್ಥ ಆಗ್ಲಿಲ್ಲ.', 'Climax artha aaglilla.'],

    // teacher
    'teacher.1': [
      'ನಮಸ್ಕಾರ ಮೇಡಂ. ನಮ್ಮ ಮಗು ಮೂರನೇ ಕ್ಲಾಸ್ ಓದ್ತಿದೆ.',
      'Namas-kaara madam. Namma magu moorane class odh-thidhe.',
      { note: 'Teachers are “madam” or “saar”; parents say “namma magu” (our child).' },
    ],
    'teacher.2': ['ನಮಸ್ಕಾರ. ಮಗು ಇಲ್ಲಿ ಖುಷಿಯಾಗಿದೆಯಾ?', 'Namas-kaara. Magu illi khushi-yaagidheyaa?'],
    'teacher.3': ['ಹೌದು, ಆದ್ರೆ ಭಾಷೆ ಹೊಸದು.', 'Haudhu, aadhre bhaashe hosadhu.'],
    'teacher.4': [
      'ಯೋಚನೆ ಮಾಡ್ಬೇಡಿ, ಮಕ್ಕಳು ಬೇಗ ಕಲೀತಾರೆ.',
      'Yochane maad-bedi, makkalu bega kalee-thaare.',
    ],
    'teacher.5': ['ಸ್ಕೂಲ್ ಎಷ್ಟು ಗಂಟೆಗೆ ಬಿಡ್ತಾರೆ?', 'School eshtu gantege bid-thaare?'],
    'teacher.6': ['ಮೂರುವರೆಗೆ.', 'Mooru-varege.'],
    'teacher.x1': ['ಇವತ್ತು ಹೋಂವರ್ಕ್ ಇದೆಯಾ?', 'Ivatthu homework idheyaa?'],
    'teacher.x2': ['ಇವತ್ತು ಮಗೂಗೆ ಹುಷಾರಿಲ್ಲ.', 'Ivatthu magoo-ge hushaa-rilla.'],
    'teacher.x3': ['ಪೇರೆಂಟ್ಸ್ ಮೀಟಿಂಗ್ ಯಾವಾಗ?', 'Parents meeting yaavaaga?'],

    // parents
    'parents.1': ['ನಿಮ್ಮ ಮಗು ಈ ಕ್ಲಾಸಿಗೆ ಹೊಸದಾ?', 'Nimma magu ee classige hosadhaa?'],
    'parents.2': [
      'ಹೌದು, ನಾವು ಬೇರೆ ಊರಿಂದ ಬಂದಿದ್ದೀವಿ.',
      'Haudhu, naavu bere oorindha bandhid-dheevi.',
    ],
    'parents.3': ['ನನ್ನ ಮಗಳೂ ಅದೇ ಕ್ಲಾಸಲ್ಲಿ ಇದ್ದಾಳೆ.', 'Nanna magaloo adhe classalli iddhaale.'],
    'parents.4': ['ಓಹ್, ಸೂಪರ್! ಸ್ಕೂಲ್ ಚೆನ್ನಾಗಿದೆಯಾ?', 'Oh, super! School chennaa-gidheyaa?'],
    'parents.5': [
      'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ. ಸಂಡೇ ಪಾರ್ಕಿಗೆ ಬನ್ನಿ, ಮಕ್ಕಳು ಒಟ್ಟಿಗೆ ಆಡ್ಕೋತಾರೆ.',
      'Thumbaa chennaa-gidhe. Sunday parkige banni, makkalu ottige aad-kothaare.',
    ],
    'parents.6': ['ಖಂಡಿತ! ಫೋನ್ ನಂಬರ್ ತಗೊಳ್ಳೋಣ.', 'Khanditha! Phone number thagollona.'],
    'parents.x1': ['ಸ್ಕೂಲ್ ಬಸ್ ಎಷ್ಟು ಗಂಟೆಗೆ ಬರುತ್ತೆ?', 'School bus eshtu gantege barutthe?'],
    'parents.x2': ['ಯೂನಿಫಾರ್ಮ್ ಅಂಗಡಿ ಎಲ್ಲಿದೆ?', 'Uniform angadi ellidhe?'],

    // bank
    'bank.1': ['ಸಾರ್, ಸೇವಿಂಗ್ಸ್ ಅಕೌಂಟ್ ಓಪನ್ ಮಾಡ್ಬೇಕು.', 'Saar, savings account open maad-beku.'],
    'bank.2': ['ಆಧಾರ್, ಪ್ಯಾನ್ ಕಾರ್ಡ್ ಇದೆಯಾ?', 'Aadhaar, pan card idheyaa?'],
    'bank.3': ['ಹಾ, ಎರಡೂ ಇದೆ.', 'Haa, eradoo idhe.'],
    'bank.4': ['ಈ ಫಾರ್ಮ್ ತುಂಬಿ, ಇಲ್ಲಿ ಸೈನ್ ಮಾಡಿ.', 'Ee form thumbi, illi sign maadi.'],
    'bank.5': ['ಡೆಬಿಟ್ ಕಾರ್ಡ್ ಯಾವಾಗ ಸಿಗುತ್ತೆ?', 'Debit card yaavaaga sigutthe?'],
    'bank.6': ['ಒಂದು ವಾರದಲ್ಲಿ, ಪೋಸ್ಟಲ್ಲಿ ಬರುತ್ತೆ.', 'Ondhu vaaradhalli, postalli barutthe.'],
    'bank.x1': ['ದುಡ್ಡು ಡ್ರಾ ಮಾಡ್ಬೇಕು.', 'Dhuddu draw maad-beku.'],
    'bank.x2': ['ಎಟಿಎಂ ಕೆಲಸ ಮಾಡ್ತಿದೆಯಾ?', 'ATM kelasa maad-thidheyaa?'],

    // govtOffice
    'govtOffice.1': [
      'ಸಾರ್, ಅಡ್ರೆಸ್ ಚೇಂಜ್ ಮಾಡೋಕೆ ಎಲ್ಲಿ ಅಪ್ಲೈ ಮಾಡ್ಬೇಕು?',
      'Saar, address change maadoke elli apply maad-beku?',
    ],
    'govtOffice.2': ['ಕೌಂಟರ್ ಐದು. ಮೊದಲು ಟೋಕನ್ ತಗೊಳ್ಳಿ.', 'Counter aidhu. Modhalu token thagolli.'],
    'govtOffice.3': ['ಯಾವ ಡಾಕ್ಯುಮೆಂಟ್ಸ್ ಬೇಕು?', 'Yaava documents beku?'],
    'govtOffice.4': ['ರೆಂಟ್ ಅಗ್ರಿಮೆಂಟ್ ಮತ್ತೆ ಆಧಾರ್ ಕಾಪಿ.', 'Rent agreement matthe Aadhaar copy.'],
    'govtOffice.5': ['ತಗೊಳ್ಳಿ. ಯಾವಾಗ ಆಗುತ್ತೆ?', 'Thagolli. Yaavaaga aagutthe?'],
    'govtOffice.6': ['ಹತ್ತು ದಿನ ಬಿಟ್ಟು ಬನ್ನಿ.', 'Hatthu dhina bittu banni.'],
    'govtOffice.x1': ['ರಸೀದಿ ಕೊಡಿ, ಪ್ಲೀಸ್.', 'Raseedhi kodi, please.'],
    'govtOffice.x2': ['ಲೈನ್ ಎಲ್ಲಿದೆ?', 'Line ellidhe?'],
    'govtOffice.x3': ['ಆಫೀಸ್ ಎಷ್ಟು ಗಂಟೆಗೆ ಓಪನ್ ಆಗುತ್ತೆ?', 'Office eshtu gantege open aagutthe?'],

    // newFriends
    'newFriends.1': ['ಹಾಯ್! ಈ ಸೀಟ್ ಖಾಲಿ ಇದೆಯಾ?', 'Hi! Ee seat khaali idheyaa?'],
    'newFriends.2': [
      'ಹಾ, ಕೂತ್ಕೊಳ್ಳಿ! ನೀವು ಇಲ್ಲಿಗೆ ಹೊಸಬರಾ?',
      'Haa, kooth-kolli! Neevu illige hosabaraa?',
    ],
    'newFriends.3': ['ಹೌದು. ಕೆಲಸಕ್ಕೆ ಅಂತ ಇಲ್ಲಿಗೆ ಬಂದೆ.', 'Haudhu. Kelasakke antha illige bandhe.'],
    'newFriends.4': ['ಸೂಪರ್! ಬೆಂಗಳೂರು ಹೇಗನ್ನಿಸ್ತು?', 'Super! Bengaluru hegan-nisthu?'],
    'newFriends.5': ['ತುಂಬಾ ಇಷ್ಟ ಆಯ್ತು. ಊಟ ಸೂಪರ್!', 'Thumbaa ishta aaythu. Oota super!'],
    'newFriends.6': [
      'ನೀವು ಆಗ್ಲೇ ಕನ್ನಡ ಮಾತಾಡ್ತಿದ್ದೀರಾ!',
      'Neevu aagle Kannada maathaad-thiddheeraa!',
    ],
    'newFriends.7': [
      'ಸ್ವಲ್ಪ ಸ್ವಲ್ಪ! ಇನ್ನೂ ಹೇಳ್ಕೊಡಿ.',
      'Swalpa swalpa! Innoo hel-kodi.',
      { note: '“Kannada swalpa swalpa barutthe” (I know a little Kannada) always wins a smile.' },
    ],
    'newFriends.x1': ['ನೀವು ಏನ್ ಕೆಲಸ ಮಾಡ್ತೀರಾ?', 'Neevu en kelasa maad-theeraa?'],
    'newFriends.x2': ['ನಿಮ್ಮ ನಂಬರ್ ಕೊಡ್ತೀರಾ?', 'Nimma number kod-theeraa?'],

    // weekend
    'weekend.1': [
      'ಈ ವೀಕೆಂಡ್ ಏನ್ ಪ್ಲಾನ್ ಮಗಾ?',
      'Ee weekend en plan magaa?',
      { note: '“Maga” is Bengaluru slang for dude; use it only with close friends.' },
    ],
    'weekend.2': ['ಇನ್ನೂ ಏನೂ ಇಲ್ಲ. ಏನಾದ್ರೂ ಐಡಿಯಾ?', 'Innoo enoo illa. Enaadhroo idea?'],
    'weekend.3': [
      'ಸಂಡೇ ತಿಂಡಿಗೆ ಹೊರಗಡೆ ಹೋಗೋಣ.',
      'Sunday thindige horagade hogona.',
      { note: 'A Sunday breakfast of dose and coffee at a darshini is a Bengaluru ritual.' },
    ],
    'weekend.4': ['ಸೂಪರ್! ಎಲ್ಲಿ ಸಿಗೋಣ?', 'Super! Elli sigona?'],
    'weekend.5': ['ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಹತ್ರ, ಎಂಟು ಗಂಟೆಗೆ.', 'Metro station hathra, entu gantege.'],
    'weekend.6': ['ಎಂಟು ತುಂಬಾ ಬೇಗ ಆಯ್ತು! ಒಂಬತ್ತು?', 'Entu thumbaa bega aaythu! Ombatthu?'],
    'weekend.7': ['ಸರಿ, ಒಂಬತ್ತು. ಲೇಟ್ ಮಾಡ್ಬೇಡ!', 'Sari, ombatthu. Late maad-beda!'],
    'weekend.x1': ['ದಾರೀಲಿ ಇದ್ದೀನಿ.', 'Dhaareeli iddheeni.'],
    'weekend.x2': ['ಸಾರಿ, ಸ್ವಲ್ಪ ಲೇಟ್ ಆಯ್ತು.', 'Sorry, swalpa late aaythu.'],
  },
};
