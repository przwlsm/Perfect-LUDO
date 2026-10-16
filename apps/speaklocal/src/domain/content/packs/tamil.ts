import type { LanguagePack } from '../types';

/**
 * Tamil as spoken in Chennai: everyday "Madras Tamil" register, not the
 * written/literary form (எவ்ளோ not எவ்வளவு, இருக்கு not இருக்கிறது, போலாம் not
 * போகலாம்). Polite lines use the -ங்க plural forms (வாங்க, குடுங்க) that a
 * newcomer uses with strangers, elders and officials; friends get the casual நீ
 * forms. English loanwords Chennai really uses (meter, tiffin, current,
 * parcel, left/right) are kept, written in Tamil script.
 *
 * Romanisation: long vowels doubled (aa, ee, oo); ஏ/ஓ are plain e/o; ஐ is ai.
 * த is "th" at word start and "dh" between vowels or when voiced (adhu, dhaan),
 * த்த is "tth"; ட is "d" between vowels, ட்ட "tt"; க is "g" between vowels,
 * க்க "kk"; ச is "s" at word start where Chennai says s (sari, saappaadu),
 * otherwise "ch", ச்ச "cch"; ழ "zh"; ஞ "nj"; ண/ன/ந all "n"; ள/ல both "l";
 * ற "r". English loanwords keep their English spelling (meter, bill, Sunday),
 * and a hyphen joins a Tamil ending to one (phone-a, class-la).
 *
 * Needs native-speaker review before launch.
 */
export const TAMIL: LanguagePack = {
  lang: 'ta',
  lines: {
    // greetings
    'greetings.1': [
      'வணக்கம்! எப்படி இருக்கீங்க?',
      'Vanakkam! Eppadi irukkeenga?',
      {
        note: 'Vanakkam is the all-purpose respectful hello; add ‘saar’ or ‘madam’ for elders.',
      },
    ],
    'greetings.2': ['நல்லா இருக்கேன், நன்றி. நீங்க?', 'Nallaa irukken, nandri. Neenga?'],
    'greetings.3': [
      'நானும் நல்லா இருக்கேன். நீங்க இங்க புதுசா?',
      'Naanum nallaa irukken. Neenga inga pudhusaa?',
    ],
    'greetings.4': ['ஆமா, இந்த ஊர் எனக்கு புதுசு.', 'Aamaa, indha oor enakku pudhusu.'],
    'greetings.5': [
      'பரவால்ல! வாங்க, வாங்க.',
      'Paravaalla! Vaanga, vaanga.',
      {
        note: '‘Vaanga, vaanga’ (come, come) is the warm Tamil way to say welcome.',
      },
    ],
    'greetings.6': ['ரொம்ப நன்றி. அப்புறம் பாக்கலாம்!', 'Romba nandri. Appuram paakkalaam!'],
    'greetings.x1': ['சாரி, புரியல.', 'Sorry, puriyala.'],
    'greetings.x2': ['இன்னொரு தடவ மெதுவா சொல்லுங்க.', 'Innoru thadava medhuvaa sollunga.'],
    'greetings.x3': ['இத இங்க என்ன சொல்லுவீங்க?', 'Idha inga enna solluveenga?'],

    // numbers
    'numbers.1': [
      'இது எவ்ளோ?',
      'Idhu evlo?',
      {
        note: '‘Evlo’ is the Chennai short form of the textbook ‘evvalavu’ (how much).',
      },
    ],
    'numbers.2': ['அம்பது ரூபா.', 'Ambadhu roobaa.'],
    'numbers.3': ['அப்போ இந்த ரெண்டு?', 'Appo indha rendu?'],
    'numbers.4': ['ரெண்டுக்கும் சேத்து நூறு ரூபா.', 'Rendukkum setthu nooru roobaa.'],
    'numbers.5': ['இந்தாங்க இருநூறு. சில்லற இருக்கா?', 'Indhaanga irunooru. Chillara irukkaa?'],
    'numbers.6': ['ஆமா, இந்தாங்க நூறு மீதி.', 'Aamaa, indhaanga nooru meedhi.'],
    'numbers.x1': ['ஒண்ணு, ரெண்டு, மூணு, நாலு, அஞ்சு.', 'Onnu, rendu, moonu, naalu, anju.'],
    'numbers.x2': ['ஆறு, ஏழு, எட்டு, ஒம்போது, பத்து.', 'Aaru, ezhu, ettu, ombodhu, patthu.'],
    'numbers.x3': ['யுபிஐ-ல பே பண்ணலாமா?', 'UPI-la pay pannalaamaa?'],

    // auto
    'auto.1': [
      'அண்ணே, ரயில்வே ஸ்டேஷன் வருவீங்களா?',
      'Anney, railway station varuveengalaa?',
      {
        note: 'Call an auto driver ‘Anney’ (brother): friendly and respectful in Chennai.',
      },
    ],
    'auto.2': ['சரி, ஏறுங்க. இருநூறு ரூபா.', 'Sari, erunga. Irunooru roobaa.'],
    'auto.3': ['மீட்டர் போட்டு போங்க.', 'Meter pottu ponga.'],
    'auto.4': [
      'மீட்டர் மேல அம்பது குடுங்க, சார்.',
      'Meter mela ambadhu kudunga, saar.',
      {
        note: 'Drivers often ask ‘meter mela’ (on top of the meter); settle the fare before you get in.',
      },
    ],
    'auto.5': ['சரி. நேரா போயி, லெஃப்ட் எடுங்க.', 'Sari. Neraa poyi, left edunga.'],
    'auto.6': ['இங்கயே நிறுத்துங்க.', 'Ingaye nirutthunga.'],
    'auto.x1': ['மெதுவா போங்க.', 'Medhuvaa ponga.'],
    'auto.x2': ['எவ்ளோ நேரம் ஆகும்?', 'Evlo neram aagum?'],
    'auto.x3': ['இங்க ரைட் எடுங்க.', 'Inga right edunga.'],

    // shopping
    'shopping.1': ['தக்காளி எவ்ளோ?', 'Thakkaali evlo?'],
    'shopping.2': ['கிலோ அறுபது ரூபா.', 'Kilo arubadhu roobaa.'],
    'shopping.3': [
      'ரொம்ப ஜாஸ்தி! அம்பதுக்கு குடுங்க.',
      'Romba jaasthi! Ambadhukku kudunga.',
      {
        note: 'Add ‘-ma’ for a woman vendor or ‘anna’ for a man, e.g. ‘kudunga-ma’.',
      },
    ],
    'shopping.4': ['அம்பத்தஞ்சு, கடைசி விலை.', 'Ambatthanju, kadaisi vilai.'],
    'shopping.5': [
      'சரி, ஒரு கிலோ குடுங்க. கொஞ்சம் கொத்தமல்லியும்.',
      'Sari, oru kilo kudunga. Konjam kotthamalliyum.',
    ],
    'shopping.6': ['கொத்தமல்லி உங்களுக்கு ஃப்ரீ!', 'Kotthamalli ungalukku free!'],
    'shopping.x1': ['ஃப்ரெஷ்ஷா இருக்கா?', 'Freshaa irukkaa?'],
    'shopping.x2': ['அரை கிலோ குடுங்க.', 'Arai kilo kudunga.'],
    'shopping.x3': ['அந்த ஒண்ண காட்டுங்க.', 'Andha onna kaattunga.'],

    // landlord
    'landlord.1': ['இந்த வீடு வாடகைக்கு இருக்கா?', 'Indha veedu vaadagaikku irukkaa?'],
    'landlord.2': [
      'ஆமா. ரெண்டு பெட்ரூம். வாடகை இருபதாயிரம்.',
      'Aamaa. Rendu bedroom. Vaadagai irubadhaayiram.',
    ],
    'landlord.3': [
      'அட்வான்ஸ் எவ்ளோ?',
      'Advance evlo?',
      {
        note: 'In Chennai the ‘advance’ is a refundable deposit, often several months’ rent.',
      },
    ],
    'landlord.4': ['மூணு மாச வாடகை.', 'Moonu maasa vaadagai.'],
    'landlord.5': [
      'தண்ணி நாள் முழுக்க வருமா?',
      'Thanni naal muzhukka varumaa?',
      {
        note: 'Ask about Metro water and the borewell; water supply matters a lot in Chennai.',
      },
    ],
    'landlord.6': ['ஆமா, பார்க்கிங்கும் இருக்கு.', 'Aamaa, parkingum irukku.'],
    'landlord.7': ['வீட்ட கொஞ்சம் பாக்கலாமா?', 'Veetta konjam paakkalaamaa?'],
    'landlord.x1': ['குழாய்ல தண்ணி ஒழுகுது.', 'Kuzhaayla thanni ozhugudhu.'],
    'landlord.x2': ['வாடகை எப்போ குடுக்கணும்?', 'Vaadagai eppo kudukkanum?'],
    'landlord.x3': [
      'கரண்ட் போயிடுச்சு.',
      'Current poyiducchu.',
      {
        note: '‘Current’ means electricity in Tamil Nadu; a power cut is a ‘current cut’.',
      },
    ],

    // office
    'office.1': [
      'குட் மார்னிங்! டிஃபன் ஆச்சா?',
      'Good morning! Tiffin aacchaa?',
      {
        note: '‘Tiffin’ means breakfast or a light meal in Chennai.',
      },
    ],
    'office.2': ['ஆமா, ஆச்சு. நீங்க?', 'Aamaa, aacchu. Neenga?'],
    'office.3': ['ஆச்சு. இன்னிக்கு வேல ஜாஸ்தியா?', 'Aacchu. Innikku vela jaasthiyaa?'],
    'office.4': [
      'ஆமா, பதினொரு மணிக்கு மீட்டிங் இருக்கு.',
      'Aamaa, padhinoru manikku meeting irukku.',
    ],
    'office.5': ['நாலு மணிக்கு டீ குடிக்க போலாம்.', 'Naalu manikku tea kudikka polaam.'],
    'office.6': ['கண்டிப்பா, அப்போ பாக்கலாம்.', 'Kandippaa, appo paakkalaam.'],
    'office.x1': ['சரி, பை! நாளைக்கு பாக்கலாம்.', 'Sari, bye! Naalaikku paakkalaam.'],
    'office.x2': [
      'நீங்க எந்த ஊரு?',
      'Neenga endha ooru?',
      {
        note: '‘Endha ooru?’ (which town?) is how Chennai asks where you are from.',
      },
    ],
    'office.x3': ['வீக்கெண்ட் என்ன பிளான்?', 'Weekend enna plan?'],

    // neighbours
    'neighbours.1': [
      'பக்கத்து வீட்டுக்கு புதுசா வந்திருக்கீங்க இல்ல?',
      'Pakkatthu veettukku pudhusaa vandhirukkeenga illa?',
    ],
    'neighbours.2': ['ஆமா, போன வாரம் தான் வந்தோம்.', 'Aamaa, pona vaaram dhaan vandhom.'],
    'neighbours.3': ['வாங்க! ஏதாவது வேணும்னா கேளுங்க.', 'Vaanga! Edhaavadhu venumnaa kelunga.'],
    'neighbours.4': ['நன்றி. குப்பை வண்டி எப்போ வரும்?', 'Nandri. Kuppai vandi eppo varum?'],
    'neighbours.5': ['தினமும் காலைல ஏழு மணிக்கு.', 'Dhinamum kaalaila ezhu manikku.'],
    'neighbours.6': [
      'நன்றி! ஒரு நாள் காபி குடிக்க வீட்டுக்கு வாங்க.',
      'Nandri! Oru naal kaapi kudikka veettukku vaanga.',
      {
        en: 'Thanks! Please come home for coffee sometime.',
        hi: 'धन्यवाद! कभी कॉफ़ी पर घर आइए।',
        note: 'Chennai homes offer guests filter ‘kaapi’ rather than tea.',
      },
    ],
    'neighbours.x1': [
      'இன்னிக்கு பால் பாக்கெட் வரல.',
      'Innikku paal packet varala.',
      {
        note: 'Aavin is the state milk brand; packets are left at the door early each morning.',
      },
    ],
    'neighbours.x2': ['பக்கத்துல ஏதாவது கடை இருக்கா?', 'Pakkatthula edhaavadhu kadai irukkaa?'],

    // directions
    'directions.1': [
      'சார், மெட்ரோ ஸ்டேஷன் எங்க இருக்கு?',
      'Saar, metro station enga irukku?',
      {
        note: 'Start with ‘saar’ or ‘madam’ to any stranger; it is normal in Chennai.',
      },
    ],
    'directions.2': ['நேரா போயி ரைட் எடுங்க.', 'Neraa poyi right edunga.'],
    'directions.3': ['தூரமா?', 'Dhooramaa?'],
    'directions.4': [
      'இல்ல, பக்கம் தான். நடந்தா அஞ்சு நிமிஷம்.',
      'Illa, pakkam dhaan. Nadandhaa anju nimisham.',
    ],
    'directions.5': ['பஸ் ஸ்டாப் பக்கத்துலயா?', 'Bus stop pakkatthulayaa?'],
    'directions.6': ['ஆமா, நேர் எதிர்ல.', 'Aamaa, ner edhirla.'],
    'directions.7': [
      'நன்றிங்க!',
      'Nandringa!',
      {
        note: 'Adding ‘-nga’ (nandri-nga) makes almost any word polite.',
      },
    ],
    'directions.x1': ['டாய்லெட் எங்க இருக்கு?', 'Toilet enga irukku?'],
    'directions.x2': ['எனக்கு வழி தெரியாது.', 'Enakku vazhi theriyaadhu.'],
    'directions.x3': ['அங்க எந்த பஸ் போகும்?', 'Anga endha bus pogum?'],

    // restaurant
    'restaurant.1': [
      'ஒரு காபி, ஒரு டீ குடுங்க.',
      'Oru kaapi, oru tea kudunga.',
      {
        note: '‘Kaapi’ is South Indian filter coffee, served in a steel tumbler and davara.',
      },
    ],
    'restaurant.2': ['சாப்பிட ஏதாவது?', 'Saappida edhaavadhu?'],
    'restaurant.3': ['என்ன இருக்கு?', 'Enna irukku?'],
    'restaurant.4': [
      'இட்லி, பொங்கல், வடை ரெடி.',
      'Idli, pongal, vadai ready.',
      {
        en: 'Idli, pongal and vada are ready.',
        hi: 'इडली, पोंगल और वड़ा तैयार हैं।',
        note: 'Ven pongal is a peppery rice-and-dal breakfast, a Chennai favourite.',
      },
    ],
    'restaurant.5': [
      'ஒரு பிளேட் பொங்கல். காரம் கம்மியா.',
      'Oru plate pongal. Kaaram kammiyaa.',
      {
        en: 'One plate of pongal. Not too spicy.',
        hi: 'एक प्लेट पोंगल। ज़्यादा तीखा नहीं।',
      },
    ],
    'restaurant.6': ['பில் குடுங்க.', 'Bill kudunga.'],
    'restaurant.7': ['தொண்ணூறு ரூபா.', 'Thonnooru roobaa.'],
    'restaurant.x1': ['இது வெஜ் தானா?', 'Idhu veg dhaanaa?'],
    'restaurant.x2': ['கொஞ்சம் தண்ணி குடுங்க.', 'Konjam thanni kudunga.'],
    'restaurant.x3': ['பார்சல் பண்ணிடுங்க.', 'Parcel pannidunga.'],

    // doctor
    'doctor.1': [
      'என்ன பண்ணுது?',
      'Enna pannudhu?',
      {
        note: '‘Enna pannudhu?’ (what is it doing to you?) is how doctors ask what is wrong.',
      },
    ],
    'doctor.2': ['காய்ச்சலும் தலைவலியும் இருக்கு.', 'Kaaicchalum thalaivaliyum irukku.'],
    'doctor.3': ['எப்போலேருந்து?', 'Eppolerundhu?'],
    'doctor.4': ['நேத்து ராத்திரிலேருந்து.', 'Netthu raatthirilerundhu.'],
    'doctor.5': [
      'இந்த மாத்திரைய ஒரு நாளைக்கு ரெண்டு வாட்டி, சாப்பாட்டுக்கு அப்புறம் போடுங்க.',
      'Indha maatthiraiya oru naalaikku rendu vaatti, saappaattukku appuram podunga.',
      { note: '‘Maatthirai’ is a tablet; you ‘podu’ (put) a tablet rather than eat it.' },
    ],
    'doctor.6': ['இந்த மருந்து இருக்கா?', 'Indha marundhu irukkaa?'],
    'doctor.7': ['ஆமா. எழுபது ரூபா.', 'Aamaa. Ezhubadhu roobaa.'],
    'doctor.x1': ['வயிறு வலிக்குது.', 'Vayiru valikkudhu.'],
    'doctor.x2': ['இருமலும் சளியும் இருக்கு.', 'Irumalum saliyum irukku.'],
    'doctor.x3': ['பக்கத்துல ஹாஸ்பிட்டல் இருக்கா?', 'Pakkatthula hospital irukkaa?'],

    // emergency
    'emergency.1': [
      'காப்பாத்துங்க! ஹெல்ப் பண்ணுங்க!',
      'Kaappaatthunga! Help pannunga!',
      {
        note: 'Dial 112 for any emergency; 108 is the ambulance and 100 the police.',
      },
    ],
    'emergency.2': ['என்ன ஆச்சு?', 'Enna aacchu?'],
    'emergency.3': [
      'ஆக்சிடென்ட் ஆயிடுச்சு. ஆம்புலன்ஸ் கூப்பிடுங்க!',
      'Accident aayiducchu. Ambulance koopidunga!',
    ],
    'emergency.4': [
      'இப்பவே கால் பண்றேன். கவலப்படாதீங்க.',
      'Ippave call panren. Kavalappadaatheenga.',
    ],
    'emergency.5': ['போலீஸ் ஸ்டேஷன் எங்க இருக்கு?', 'Police station enga irukku?'],
    'emergency.6': ['மெயின் ரோடு பக்கத்துல.', 'Main road pakkatthula.'],
    'emergency.7': ['என் ஃபோன திருடிட்டாங்க.', 'En phone-a thirudittaanga.'],
    'emergency.x1': ['தீ பிடிச்சிருக்கு!', 'Thee pidicchirukku!'],
    'emergency.x2': ['போலீஸ கூப்பிடுங்க!', 'Police-a koopidunga!'],
    'emergency.x3': ['உடனே டாக்டர் வேணும்.', 'Udane doctor venum.'],

    // delivery
    'delivery.1': ['ஹலோ, உங்க ஃபுட் ஆர்டர் வந்திருக்கு.', 'Hello, unga food order vandhirukku.'],
    'delivery.2': ['ஹலோ. எங்க இருக்கீங்க?', 'Hello. Enga irukkeenga?'],
    'delivery.3': ['கேட் பக்கத்துல. எந்த ஃப்ளோர்?', 'Gate pakkatthula. Endha floor?'],
    'delivery.4': ['மூணாவது ஃப்ளோர். மேல வாங்க.', 'Moonaavadhu floor. Mela vaanga.'],
    'delivery.5': ['லிஃப்ட் வேல செய்யல.', 'Lift vela seyyala.'],
    'delivery.6': ['சரி, வெயிட் பண்ணுங்க. ரெண்டு நிமிஷம்.', 'Sari, wait pannunga. Rendu nimisham.'],
    'delivery.x1': ['கதவு பக்கத்துல வச்சிடுங்க.', 'Kadhavu pakkatthula vacchidunga.'],
    'delivery.x2': ['வந்ததும் கால் பண்ணுங்க.', 'Vandhadhum call pannunga.'],
    'delivery.x3': ['யாரு பேசுறது?', 'Yaaru pesuradhu?'],

    // festival
    'festival.1': [
      'ஹேப்பி பொங்கல்! நாளைக்கு வீட்டுக்கு வாங்க.',
      'Happy Pongal! Naalaikku veettukku vaanga.',
      {
        en: 'Happy Pongal! Come home tomorrow.',
        hi: 'पोंगल की शुभकामनाएँ! कल घर आइए।',
        note: 'Pongal (mid-January) is Tamil Nadu’s harvest festival; Deepavali is big too.',
      },
    ],
    'festival.2': [
      'நன்றி! உங்களுக்கும் ஹேப்பி பொங்கல்.',
      'Nandri! Ungalukkum happy Pongal.',
      {
        en: 'Thank you! Happy Pongal to you too.',
        hi: 'धन्यवाद! आपको भी पोंगल की शुभकामनाएँ।',
      },
    ],
    'festival.3': ['ஸ்வீட் பண்றோம். ஒரு மணிக்கு சாப்பாடு.', 'Sweet panrom. Oru manikku saappaadu.'],
    'festival.4': ['சூப்பர்! ஏதாவது கொண்டு வரணுமா?', 'Super! Edhaavadhu kondu varanumaa?'],
    'festival.5': [
      'ஒண்ணும் வேணாம், ஃபேமிலியோட வாங்க போதும்.',
      'Onnum venaam, family-oda vaanga podhum.',
    ],
    'festival.6': [
      'போதும், போதும்! வயிறு நிறைஞ்சிடுச்சு.',
      'Podhum, podhum! Vayiru niranjiducchu.',
      {
        note: '‘Podhum, podhum’ is how you stop a host who keeps serving you more.',
      },
    ],
    'festival.x1': [
      'இந்த பண்டிகைக்கு என்ன பேரு?',
      'Indha pandigaikku enna peru?',
      {
        note: 'Other big ones: Deepavali, Vinayagar Chathurthi, and Navaratri with its golu dolls.',
      },
    ],
    'festival.x2': ['இந்த ஸ்வீட் சூப்பரா இருக்கு!', 'Indha sweet superaa irukku!'],

    // wedding
    'wedding.1': ['வந்துட்டீங்களா! வாங்க, உள்ள வாங்க.', 'Vandhutteengalaa! Vaanga, ulla vaanga.'],
    'wedding.2': ['வாழ்த்துக்கள்! பொண்ணு மாப்பிள்ள எங்க?', 'Vaazhtthukkal! Ponnu maappilla enga?'],
    'wedding.3': [
      'ஸ்டேஜ்ல இருக்காங்க. சாப்டீங்களா?',
      'Stage-la irukkaanga. Saapteengalaa?',
      {
        note: '‘Saapteengalaa?’ (have you eaten?) is the warmest Tamil welcome.',
      },
    ],
    'wedding.4': [
      'இன்னும் இல்ல. முதல்ல கிஃப்ட் குடுத்துடறேன்.',
      'Innum illa. Mudhalla gift kudutthudaren.',
    ],
    'wedding.5': ['வாங்க, அப்புறம் சேந்து சாப்பிடலாம்.', 'Vaanga, appuram sendhu saappidalaam.'],
    'wedding.6': ['டெக்கரேஷன் ரொம்ப அழகா இருக்கு!', 'Decoration romba azhagaa irukku!'],
    'wedding.x1': ['ரெண்டு பேரும் சந்தோஷமா இருங்க!', 'Rendu perum sandhoshamaa irunga!'],
    'wedding.x2': [
      'சாப்பாடு சூப்பரா இருந்துச்சு!',
      'Saappaadu superaa irundhucchu!',
      {
        note: 'Wedding meals come on a banana leaf; fold it towards you when you finish.',
      },
    ],

    // cricket
    'cricket.1': ['நேத்து மேட்ச் பாத்தியா?', 'Netthu match paatthiyaa?'],
    'cricket.2': [
      'ஆமா! லாஸ்ட் ஓவர் செம்ம!',
      'Aamaa! Last over semma!',
      {
        note: '‘Semma’ means awesome; you will hear it everywhere in Chennai.',
      },
    ],
    'cricket.3': ['நீ எந்த டீம் சப்போர்ட் பண்ற?', 'Nee endha team support panra?'],
    'cricket.4': [
      'இனிமே நம்ம ஊர் டீம் தான்!',
      'Inime namma oor team dhaan!',
      {
        note: 'In Chennai ‘namma team’ means CSK, the Chennai Super Kings.',
      },
    ],
    'cricket.5': ['அப்போ அடுத்த மேட்ச் சேந்து பாக்கலாம்.', 'Appo aduttha match sendhu paakkalaam.'],
    'cricket.6': ['டீல்! ஸ்நாக்ஸ் என் ட்ரீட்.', 'Deal! Snacks en treat.'],
    'cricket.x1': ['ஸ்கோர் என்ன?', 'Score enna?'],
    'cricket.x2': ['செம்ம ஷாட்!', 'Semma shot!'],

    // movies
    'movies.1': [
      'புது படம் வந்திருக்கு. சண்டே போலாமா?',
      'Pudhu padam vandhirukku. Sunday polaamaa?',
    ],
    'movies.2': ['போலாம்! ஹீரோ யாரு?', 'Polaam! Hero yaaru?'],
    'movies.3': [
      'பெரிய ஸ்டார். படம் மாஸ்னு எல்லாரும் சொல்றாங்க.',
      'Periya star. Padam mass-nu ellaarum solraanga.',
      {
        note: '‘Mass’ in film talk means a big, whistle-worthy crowd-pleaser.',
      },
    ],
    'movies.4': ['சப்டைட்டில் இருக்குற ஷோ இருக்கா?', 'Subtitle irukkura show irukkaa?'],
    'movies.5': ['இருக்கு, சாயங்காலம் ஆறு மணி ஷோ.', 'Irukku, saayangaalam aaru mani show.'],
    'movies.6': [
      'ரெண்டு டிக்கெட் புக் பண்ணு. பாப்கார்ன் என் ட்ரீட்!',
      'Rendu ticket book pannu. Popcorn en treat!',
    ],
    'movies.x1': ['படம் செம்மயா இருந்துச்சு!', 'Padam semmayaa irundhucchu!'],
    'movies.x2': ['எனக்கு கிளைமாக்ஸ் புரியல.', 'Enakku climax puriyala.'],

    // teacher
    'teacher.1': [
      'குட் மார்னிங் மிஸ். என் குழந்தை மூணாவது கிளாஸ்ல படிக்குது.',
      'Good morning miss. En kuzhandhai moonaavadhu class-la padikkudhu.',
      { note: 'Teachers are called ‘Miss’ or ‘Sir’ in Tamil Nadu schools.' },
    ],
    'teacher.2': [
      'குட் மார்னிங். குழந்தை இங்க சந்தோஷமா இருக்குதா?',
      'Good morning. Kuzhandhai inga sandhoshamaa irukkudhaa?',
    ],
    'teacher.3': ['ஆமா, ஆனா பாஷை புதுசு.', 'Aamaa, aanaa baashai pudhusu.'],
    'teacher.4': [
      'கவலப்படாதீங்க, குழந்தைங்க சீக்கிரம் கத்துக்குவாங்க.',
      'Kavalappadaatheenga, kuzhandhainga seekkiram katthukkuvaanga.',
    ],
    'teacher.5': ['ஸ்கூல் எத்தன மணிக்கு விடுவாங்க?', 'School etthana manikku viduvaanga?'],
    'teacher.6': ['மூணரை மணிக்கு.', 'Moonarai manikku.'],
    'teacher.x1': ['இன்னிக்கு ஹோம்வொர்க் இருக்கா?', 'Innikku homework irukkaa?'],
    'teacher.x2': [
      'இன்னிக்கு குழந்தைக்கு உடம்பு சரியில்ல.',
      'Innikku kuzhandhaikku udambu sariyilla.',
    ],
    'teacher.x3': ['பேரண்ட்ஸ் மீட்டிங் எப்போ?', 'Parents meeting eppo?'],

    // parents
    'parents.1': [
      'உங்க குழந்தை இந்த கிளாஸுக்கு புதுசா?',
      'Unga kuzhandhai indha class-ukku pudhusaa?',
    ],
    'parents.2': ['ஆமா, நாங்க வேற ஊர்லேருந்து வந்தோம்.', 'Aamaa, naanga vera oorlerundhu vandhom.'],
    'parents.3': ['என் பொண்ணும் அதே கிளாஸ் தான்.', 'En ponnum adhe class dhaan.'],
    'parents.4': ['ஓ, சூப்பர்! ஸ்கூல் நல்லா இருக்கா?', 'Oh, super! School nallaa irukkaa?'],
    'parents.5': [
      'ரொம்ப நல்லா இருக்கு. சண்டே பார்க்குக்கு வாங்க, புள்ளைங்க சேந்து விளையாடுவாங்க.',
      'Romba nallaa irukku. Sunday park-ukku vaanga, pullainga sendhu vilaiyaaduvaanga.',
    ],
    'parents.6': [
      'கண்டிப்பா! ஃபோன் நம்பர் ஷேர் பண்ணிக்கலாம்.',
      'Kandippaa! Phone number share pannikkalaam.',
    ],
    'parents.x1': ['ஸ்கூல் பஸ் எத்தன மணிக்கு வரும்?', 'School bus etthana manikku varum?'],
    'parents.x2': ['யூனிஃபார்ம் கடை எங்க இருக்கு?', 'Uniform kadai enga irukku?'],

    // bank
    'bank.1': [
      'சார், ஒரு சேவிங்ஸ் அக்கவுண்ட் ஓப்பன் பண்ணனும்.',
      'Saar, oru savings account open pannanum.',
    ],
    'bank.2': ['ஆதார், பான் கார்டு இருக்கா?', 'Aadhaar, PAN card irukkaa?'],
    'bank.3': ['இருக்கு, ரெண்டும் இருக்கு.', 'Irukku, rendum irukku.'],
    'bank.4': [
      'இந்த ஃபார்ம ஃபில் பண்ணி, இங்க சைன் பண்ணுங்க.',
      'Indha form-a fill panni, inga sign pannunga.',
    ],
    'bank.5': ['டெபிட் கார்டு எப்போ கிடைக்கும்?', 'Debit card eppo kidaikkum?'],
    'bank.6': ['ஒரு வாரத்துல, போஸ்ட்ல வரும்.', 'Oru vaaratthula, post-la varum.'],
    'bank.x1': ['காசு எடுக்கணும்.', 'Kaasu edukkanum.'],
    'bank.x2': ['ஏடிஎம் வேல செய்யுதா?', 'ATM vela seyyudhaa?'],

    // govtOffice
    'govtOffice.1': [
      'சார், அட்ரஸ் மாத்த எங்க அப்ளை பண்ணனும்?',
      'Saar, address maattha enga apply pannanum?',
    ],
    'govtOffice.2': [
      'கவுண்டர் அஞ்சு. முதல்ல டோக்கன் எடுங்க.',
      'Counter anju. Mudhalla token edunga.',
    ],
    'govtOffice.3': ['என்னென்ன டாக்குமெண்ட்ஸ் வேணும்?', 'Ennenna documents venum?'],
    'govtOffice.4': [
      'ரென்ட் அக்ரிமென்ட்டும் ஆதார் காப்பியும்.',
      'Rent agreement-um Aadhaar copy-um.',
    ],
    'govtOffice.5': ['இந்தாங்க. எப்போ முடியும்?', 'Indhaanga. Eppo mudiyum?'],
    'govtOffice.6': ['பத்து நாள் கழிச்சு வாங்க.', 'Patthu naal kazhicchu vaanga.'],
    'govtOffice.x1': ['ரசீது குடுங்க.', 'Raseedhu kudunga.'],
    'govtOffice.x2': ['லைன் எங்க இருக்கு?', 'Line enga irukku?'],
    'govtOffice.x3': ['ஆபீஸ் எப்போ திறப்பாங்க?', 'Office eppo thirappaanga?'],

    // newFriends
    'newFriends.1': ['ஹாய்! இந்த சீட் ஃப்ரீயா?', 'Hi! Indha seat free-yaa?'],
    'newFriends.2': [
      'ஆமா, உக்காருங்க! நீங்க இங்க புதுசா?',
      'Aamaa, ukkaarunga! Neenga inga pudhusaa?',
    ],
    'newFriends.3': ['ஆமா. வேல விஷயமா இங்க வந்தேன்.', 'Aamaa. Vela vishayamaa inga vandhen.'],
    'newFriends.4': ['சூப்பர்! சென்னை எப்படி இருக்கு?', 'Super! Chennai eppadi irukku?'],
    'newFriends.5': [
      'ரொம்ப பிடிச்சிருக்கு. சாப்பாடு செம்ம!',
      'Romba pidicchirukku. Saappaadu semma!',
    ],
    'newFriends.6': ['அதுக்குள்ள தமிழ் பேசுறீங்களே!', 'Adhukkulla Tamil pesureengale!'],
    'newFriends.7': [
      'கொஞ்சம் தான்! இன்னும் சொல்லிக்குடுங்க.',
      'Konjam dhaan! Innum sollik-kudunga.',
    ],
    'newFriends.x1': ['நீங்க என்ன பண்றீங்க?', 'Neenga enna panreenga?'],
    'newFriends.x2': ['உங்க நம்பர் கிடைக்குமா?', 'Unga number kidaikkumaa?'],

    // weekend
    'weekend.1': ['இந்த வீக்கெண்ட் என்ன பிளான்?', 'Indha weekend enna plan?'],
    'weekend.2': ['இன்னும் ஒண்ணும் இல்ல. ஏதாவது ஐடியா?', 'Innum onnum illa. Edhaavadhu idea?'],
    'weekend.3': [
      'சண்டே காலைல வெளிய டிஃபன் சாப்பிட போலாம்.',
      'Sunday kaalaila veliya tiffin saappida polaam.',
    ],
    'weekend.4': ['சூப்பர்! எங்க மீட் பண்ணலாம்?', 'Super! Enga meet pannalaam?'],
    'weekend.5': ['மெட்ரோ ஸ்டேஷன்ல, எட்டு மணிக்கு.', 'Metro station-la, ettu manikku.'],
    'weekend.6': ['எட்டு ரொம்ப சீக்கிரம்! ஒம்போது?', 'Ettu romba seekkiram! Ombodhu?'],
    'weekend.7': ['சரி, ஒம்போது. லேட் பண்ணாத!', 'Sari, ombodhu. Late pannaadha!'],
    'weekend.x1': [
      'வந்துட்டே இருக்கேன்.',
      'Vandhutte irukken.',
      {
        note: '‘Vandhutte irukken’ is Chennai’s famous ‘on my way’, sometimes said from home!',
      },
    ],
    'weekend.x2': ['சாரி, கொஞ்சம் லேட் ஆயிடுச்சு.', 'Sorry, konjam late aayiducchu.'],
  },
};
