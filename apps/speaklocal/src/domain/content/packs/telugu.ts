import type { LanguagePack } from '../types';

/**
 * Telugu as spoken in Hyderabad: colloquial Telangana-flavoured Telugu
 * (ivaala for today, -thaledhu negatives, "andi" and "garu" for politeness),
 * with the English loanwords everyone uses (meter, bill, lift, tiffin, xerox).
 * Hyderabad also mixes in Dakhini/Hindi words (seedhaa, vaapas, nallaa,
 * kiraaya, chai); a few appear where the city really says them, but the
 * pack teaches Telugu. Polite lines use the plural -andi/-aru forms.
 *
 * Romanisation: long vowels doubled (aa, ee, oo); e and o written single
 * whether short or long (ఏ/ఎ = e, ఓ/ఒ = o); ai for ఐ. Dental త/ద are th/dh,
 * retroflex ట/డ are t/d; ch for చ, j for జ, sh for శ/ష (s where it is said s),
 * l for both ల and ళ, n for న/ణ. Double consonants doubled (Ikkada, Malli,
 * Addhe). Anusvara is m at a word end, n or m before a consonant as said.
 * English loanwords keep their everyday English spelling (meter, bill, lift).
 *
 * Needs native-speaker review before launch.
 */
export const TELUGU: LanguagePack = {
  lang: 'te',
  lines: {
    // greetings
    'greetings.1': [
      'నమస్కారం! ఎలా ఉన్నారు?',
      'Namas-kaaram! Elaa unnaaru?',
      { note: 'Add ‘garu’ after a name or title (Raju garu, aunty garu) to show respect.' },
    ],
    'greetings.2': ['బాగున్నాను, థ్యాంక్స్. మరి మీరు?', 'Baagun-naanu, thanks. Mari meeru?'],
    'greetings.3': [
      'నేను కూడా బాగున్నాను. మీరు ఇక్కడికి కొత్తా?',
      'Nenu kooda baagun-naanu. Meeru ikkadiki kotthaa?',
    ],
    'greetings.4': ['అవును, ఈ ఊరు నాకు కొత్త.', 'Avunu, ee ooru naaku kottha.'],
    'greetings.5': ['పర్లేదు! మీకు స్వాగతం.', 'Parledhu! Meeku swaagatham.'],
    'greetings.6': ['చాలా థ్యాంక్స్. మళ్ళీ కలుద్దాం!', 'Chaalaa thanks. Malli kaluddhaam!'],
    'greetings.x1': ['సారీ, నాకు అర్థం కాలేదు.', 'Sorry, naaku artham kaaledhu.'],
    'greetings.x2': ['కొంచెం మళ్ళీ చెప్పండి, మెల్లగా.', 'Konchem malli cheppandi, mellagaa.'],
    'greetings.x3': ['దీన్ని ఇక్కడ ఏమంటారు?', 'Dheenni ikkada emantaaru?'],

    // numbers
    'numbers.1': ['ఇది ఎంత?', 'Idhi entha?'],
    'numbers.2': ['యాభై రూపాయలు.', 'Yaabhai roopaayalu.'],
    'numbers.3': ['మరి ఈ రెండు?', 'Mari ee rendu?'],
    'numbers.4': ['రెండూ కలిపి వంద.', 'Rendoo kalipi vandha.'],
    'numbers.5': ['ఇదిగోండి రెండొందలు. చిల్లర ఉందా?', 'Idhi-gondi rendon-dhalu. Chillara undhaa?'],
    'numbers.6': [
      'అవును, ఇదిగోండి వంద వాపస్.',
      'Avunu, idhi-gondi vandha vaapas.',
      { note: '‘Vaapas’ (back) is one of many Dakhini/Hindi words in everyday Hyderabad Telugu.' },
    ],
    'numbers.x1': ['ఒకటి, రెండు, మూడు, నాలుగు, ఐదు.', 'Okati, rendu, moodu, naalugu, aidhu.'],
    'numbers.x2': ['ఆరు, ఏడు, ఎనిమిది, తొమ్మిది, పది.', 'Aaru, edu, enimidhi, thommidhi, padhi.'],
    'numbers.x3': ['యూపీఐ చేయొచ్చా?', 'UPI cheyocchaa?'],

    // auto
    'auto.1': [
      'అన్నా, రైల్వే స్టేషన్‌కి వస్తావా?',
      'Annaa, railway station-ki vasthaavaa?',
      {
        note: 'Call an auto driver ‘Anna’ (brother); many Hyderabadis also use the Dakhini ‘Bhai’.',
      },
    ],
    'auto.2': ['ఆ, ఎక్కండి. రెండొందల రూపాయలు.', 'Aa, ekkandi. Rendon-dhala roopaayalu.'],
    'auto.3': ['మీటర్ వేసి తీసుకెళ్ళండి.', 'Meter vesi theesu-kellandi.'],
    'auto.4': ['మీటర్ మీద యాభై, సార్.', 'Meter meedha yaabhai, saar.'],
    'auto.5': [
      'సరే. సీదా వెళ్ళి, తర్వాత లెఫ్ట్ తీసుకోండి.',
      'Sare. Seedhaa velli, tharvaatha left theesu-kondi.',
      {
        note: '‘Seedhaa’ (straight) comes from Dakhini, but Hyderabad Telugu uses it all the time.',
      },
    ],
    'auto.6': ['ఇక్కడే ఆపండి.', 'Ikkade aapandi.'],
    'auto.x1': ['కొంచెం మెల్లగా పోనివ్వండి.', 'Konchem mellagaa poniv-vandi.'],
    'auto.x2': ['ఎంత టైం పడుతుంది?', 'Entha time padu-thundhi?'],
    'auto.x3': ['ఇక్కడ రైట్ తీసుకోండి.', 'Ikkada right theesu-kondi.'],

    // shopping
    'shopping.1': [
      'టమాటాలు ఎలా ఇస్తున్నారు?',
      'Tamaataalu elaa isthun-naaru?',
      { note: '‘Elaa isthunnaaru?’ (how are you selling?) is the everyday way to ask the rate.' },
    ],
    'shopping.2': ['కిలో అరవై రూపాయలు.', 'Kilo aravai roopaayalu.'],
    'shopping.3': [
      'చాలా ఎక్కువ చెప్తున్నావ్! యాభైకి ఇవ్వు.',
      'Chaalaa ekkuva chepthun-naav! Yaabhai-ki ivvu.',
    ],
    'shopping.4': ['యాభై ఐదు, ఫైనల్.', 'Yaabhai aidhu, final.'],
    'shopping.5': [
      'సరే, ఒక కిలో ఇవ్వు. కొంచెం కొత్తిమీర కూడా.',
      'Sare, oka kilo ivvu. Konchem kotthimeera kooda.',
    ],
    'shopping.6': ['మీకు కొత్తిమీర ఫ్రీ!', 'Meeku kotthimeera free!'],
    'shopping.x1': ['ఫ్రెష్‌గా ఉందా?', 'Fresh-gaa undhaa?'],
    'shopping.x2': ['అర కిలో ఇవ్వండి.', 'Ara kilo ivvandi.'],
    'shopping.x3': ['అది చూపించండి.', 'Adhi choopin-chandi.'],

    // landlord
    'landlord.1': [
      'ఈ ఇల్లు అద్దెకు ఇస్తారా?',
      'Ee illu addheku isthaaraa?',
      { note: 'Rent is ‘addhe’ in Telugu, but you will hear the Dakhini ‘kiraaya’ just as often.' },
    ],
    'landlord.2': [
      'అవును. రెండు బెడ్‌రూమ్‌లు. అద్దె ఇరవై వేలు.',
      'Avunu. Rendu bedroom-lu. Addhe iravai velu.',
    ],
    'landlord.3': ['అడ్వాన్స్ ఎంత?', 'Advance entha?'],
    'landlord.4': ['మూడు నెలల అద్దె.', 'Moodu nelala addhe.'],
    'landlord.5': ['నీళ్ళు రోజంతా వస్తాయా?', 'Neellu rojanthaa vasthaayaa?'],
    'landlord.6': ['అవును, పార్కింగ్ కూడా ఉంది.', 'Avunu, parking kooda undhi.'],
    'landlord.7': ['ఇల్లు ఒకసారి చూడొచ్చా?', 'Illu okasaari choodocchaa?'],
    'landlord.x1': [
      'నల్లా కారుతోంది.',
      'Nallaa kaaru-thondhi.',
      { note: 'Hyderabad says ‘nallaa’ for a tap; textbook Telugu says ‘kulaayi’.' },
    ],
    'landlord.x2': ['అద్దె ఎప్పుడు కట్టాలి?', 'Addhe eppudu kattaali?'],
    'landlord.x3': [
      'కరెంట్ పోయింది.',
      'Current poyindhi.',
      { note: 'Everyone says ‘current poyindhi’ (the current went) for a power cut.' },
    ],

    // office
    'office.1': [
      'గుడ్ మార్నింగ్! టిఫిన్ అయిందా?',
      'Good morning! Tiffin ayindhaa?',
      { note: 'Breakfast is ‘tiffin’, and asking whether you have eaten is a friendly hello.' },
    ],
    'office.2': ['ఆ, అయింది. మరి మీది?', 'Aa, ayindhi. Mari meedhi?'],
    'office.3': [
      'అయింది. ఇవాళ పని ఎక్కువుందా?',
      'Ayindhi. Ivaala pani ekkuvundhaa?',
      { note: 'Hyderabad says ‘ivaala’ for today; the textbook word is ‘eeroju’.' },
    ],
    'office.4': ['అవును, పదకొండింటికి మీటింగ్ ఉంది.', 'Avunu, padhakon-dintiki meeting undhi.'],
    'office.5': [
      'నాలుగింటికి చాయ్‌కి పోదాం.',
      'Naalu-gintiki chai-ki podhaam.',
      { note: 'Hyderabad says ‘chai’, and an Irani chai break is a city ritual.' },
    ],
    'office.6': ['సరే, అప్పుడు కలుద్దాం.', 'Sare, appudu kaluddhaam.'],
    'office.x1': ['సరే, బై! రేపు కలుద్దాం.', 'Sare, bye! Repu kaluddhaam.'],
    'office.x2': ['మీది ఏ ఊరు?', 'Meedhi e ooru?'],
    'office.x3': ['వీకెండ్ ప్లాన్ ఏంటి?', 'Weekend plan enti?'],

    // neighbours
    'neighbours.1': [
      'మీరు పక్కింట్లో కొత్తగా వచ్చారు కదా?',
      'Meeru pakkintlo kotthagaa vacchaaru kadhaa?',
    ],
    'neighbours.2': ['అవును, పోయిన వారం వచ్చాం.', 'Avunu, poyina vaaram vacchaam.'],
    'neighbours.3': [
      'రండి రండి! ఏం కావాలన్నా అడగండి.',
      'Randi randi! Em kaavaalannaa adagandi.',
      { note: '‘Randi randi’ (come, come) is the warm Telugu welcome.' },
    ],
    'neighbours.4': [
      'థ్యాంక్స్. చెత్త బండి ఎప్పుడు వస్తుంది?',
      'Thanks. Chettha bandi eppudu vasthundhi?',
    ],
    'neighbours.5': ['రోజూ పొద్దున ఏడింటికి.', 'Rojoo poddhuna edin-tiki.'],
    'neighbours.6': [
      'థ్యాంక్స్! ఎప్పుడైనా చాయ్‌కి ఇంటికి రండి.',
      'Thanks! Eppu-dainaa chai-ki intiki randi.',
    ],
    'neighbours.x1': ['ఇవాళ పాల ప్యాకెట్ రాలేదు.', 'Ivaala paala packet raaledhu.'],
    'neighbours.x2': ['దగ్గర్లో ఏదైనా షాప్ ఉందా?', 'Dhaggarlo edhainaa shop undhaa?'],

    // directions
    'directions.1': [
      'ఏమండి, మెట్రో స్టేషన్ ఎక్కడ?',
      'Emandi, metro station ekkada?',
      { note: '‘Emandi’ politely gets a stranger’s attention, like ‘excuse me’.' },
    ],
    'directions.2': ['సీదా పోయి రైట్ తీసుకోండి.', 'Seedhaa poyi right theesu-kondi.'],
    'directions.3': ['దూరమా?', 'Dhooramaa?'],
    'directions.4': [
      'లేదు, దగ్గరే. నడిస్తే ఐదు నిమిషాలు.',
      'Ledhu, dhaggare. Nadisthe aidhu nimishaalu.',
    ],
    'directions.5': ['బస్ స్టాప్ దగ్గరా?', 'Bus stop dhaggaraa?'],
    'directions.6': ['అవును, ఎదురుగానే.', 'Avunu, edhuru-gaane.'],
    'directions.7': [
      'థ్యాంక్స్ అండి!',
      'Thanks andi!',
      { note: 'Adding ‘andi’ makes almost anything polite: ‘thanks andi’, ‘sare andi’.' },
    ],
    'directions.x1': ['టాయిలెట్ ఎక్కడుంది?', 'Toilet ekka-dundhi?'],
    'directions.x2': ['నాకు దారి తెలీదు.', 'Naaku dhaari theleedhu.'],
    'directions.x3': ['అక్కడికి ఏ బస్ పోతుంది?', 'Akkadiki e bus pothundhi?'],

    // restaurant
    'restaurant.1': ['ఒక కాఫీ, ఒక చాయ్ ఇవ్వండి.', 'Oka coffee, oka chai ivvandi.'],
    'restaurant.2': ['తినడానికి ఏమైనా?', 'Thinadaaniki emainaa?'],
    'restaurant.3': ['ఏమున్నాయి?', 'Emunnaayi?'],
    'restaurant.4': [
      'పెసరట్టు, పూరి, మిర్చి బజ్జి రెడీ.',
      'Pesarattu, poori, mirchi bajji ready.',
      {
        en: 'Pesarattu, puri and mirchi bajji are ready.',
        hi: 'पेसरट्टू, पूरी और मिर्ची बज्जी तैयार हैं।',
        note: 'Pesarattu is a green-gram dosa; mirchi bajji is a stuffed chilli fritter.',
      },
    ],
    'restaurant.5': [
      'ఒక ప్లేట్ పెసరట్టు. మరీ కారంగా వద్దు.',
      'Oka plate pesarattu. Maree kaaramgaa vaddhu.',
      {
        en: 'One plate of pesarattu. Not too spicy.',
        hi: 'एक प्लेट पेसरट्टू। ज़्यादा तीखा नहीं।',
        note: '‘Kaaram’ means chilli-hot; ‘kaaram thakkuva’ asks for less of it.',
      },
    ],
    'restaurant.6': ['బిల్ ఇవ్వండి.', 'Bill ivvandi.'],
    'restaurant.7': ['తొంభై రూపాయలు.', 'Thombhai roopaayalu.'],
    'restaurant.x1': ['ఇది వెజ్ ఐటమేనా?', 'Idhi veg ite-menaa?'],
    'restaurant.x2': ['కొంచెం నీళ్ళు ఇవ్వండి.', 'Konchem neellu ivvandi.'],
    'restaurant.x3': [
      'పార్సిల్ కట్టండి.',
      'Parcel kattandi.',
      { note: 'Takeaway is always ‘parcel’ in Hyderabad.' },
    ],

    // doctor
    'doctor.1': ['ఏంటి ప్రాబ్లమ్?', 'Enti problem?'],
    'doctor.2': ['నాకు జ్వరం, తలనొప్పి ఉన్నాయి.', 'Naaku jwaram, thala-noppi unnaayi.'],
    'doctor.3': ['ఎప్పటి నుంచి?', 'Eppati nunchi?'],
    'doctor.4': ['నిన్న రాత్రి నుంచి.', 'Ninna raathri nunchi.'],
    'doctor.5': [
      'ఈ టాబ్లెట్ రోజుకు రెండుసార్లు వేసుకోండి, అన్నం తిన్నాక.',
      'Ee tablet rojuku rendu-saarlu vesu-kondi, annam thinnaaka.',
    ],
    'doctor.6': ['ఈ మందు ఉందా?', 'Ee mandhu undhaa?'],
    'doctor.7': ['ఉంది. డెబ్బై రూపాయలు.', 'Undhi. Debbai roopaayalu.'],
    'doctor.x1': ['కడుపు నొప్పిగా ఉంది.', 'Kadupu noppigaa undhi.'],
    'doctor.x2': ['దగ్గు, జలుబు ఉన్నాయి.', 'Dhaggu, jalubu unnaayi.'],
    'doctor.x3': [
      'దగ్గర్లో హాస్పిటల్ ఉందా?',
      'Dhaggarlo hospital undhaa?',
      { note: 'Hyderabad also says the Dakhini ‘dawakhaana’ for a clinic or hospital.' },
    ],

    // emergency
    'emergency.1': [
      'కాపాడండి! ఎవరైనా సాయం చేయండి!',
      'Kaapaadandi! Evarainaa saayam cheyandi!',
      { note: 'In any emergency anywhere in India, dial 112.' },
    ],
    'emergency.2': ['ఏమైంది?', 'Emaindhi?'],
    'emergency.3': [
      'యాక్సిడెంట్ అయింది. అంబులెన్స్‌కి ఫోన్ చేయండి!',
      'Accident ayindhi. Ambulance-ki phone cheyandi!',
    ],
    'emergency.4': [
      'ఇప్పుడే ఫోన్ చేస్తున్నా. టెన్షన్ పడకండి.',
      'Ippude phone chesthunnaa. Tension padakandi.',
    ],
    'emergency.5': ['పోలీస్ స్టేషన్ ఎక్కడ?', 'Police station ekkada?'],
    'emergency.6': ['మెయిన్ రోడ్డు దగ్గర.', 'Main roddu dhaggara.'],
    'emergency.7': ['నా ఫోన్ దొంగతనం అయింది.', 'Naa phone dhonga-thanam ayindhi.'],
    'emergency.x1': ['మంటలు అంటుకున్నాయి!', 'Mantalu antukun-naayi!'],
    'emergency.x2': ['పోలీసులకి ఫోన్ చేయండి!', 'Poleesulaki phone cheyandi!'],
    'emergency.x3': ['అర్జెంట్‌గా డాక్టర్ కావాలి.', 'Urgent-gaa doctor kaavaali.'],

    // delivery
    'delivery.1': [
      'హలో, మీ ఫుడ్ ఆర్డర్ వచ్చింది.',
      'Hello, mee food order vacchindhi.',
      { note: 'Many delivery riders here speak Hindi or Dakhini, but Telugu works too.' },
    ],
    'delivery.2': ['హలో. మీరు ఎక్కడున్నారు?', 'Hello. Meeru ekkadun-naaru?'],
    'delivery.3': ['గేట్ దగ్గర. ఎన్నో ఫ్లోర్?', 'Gate dhaggara. Enno floor?'],
    'delivery.4': ['మూడో ఫ్లోర్. పైకి వచ్చేయండి.', 'Moodo floor. Paiki vacche-yandi.'],
    'delivery.5': [
      'లిఫ్ట్ పని చేస్తలేదు.',
      'Lift pani chestha-ledhu.',
      { note: 'The ‘-thaledhu’ ending (isn’t …-ing) is typical Hyderabad and Telangana speech.' },
    ],
    'delivery.6': ['సరే, ఆగండి. రెండు నిమిషాలు.', 'Sare, aagandi. Rendu nimishaalu.'],
    'delivery.x1': ['డోర్ దగ్గర పెట్టేయండి.', 'Door dhaggara pette-yandi.'],
    'delivery.x2': ['వచ్చాక ఫోన్ చేయండి.', 'Vacchaaka phone cheyandi.'],
    'delivery.x3': ['ఎవరు మాట్లాడుతున్నారు?', 'Evaru maatlaadu-thunnaaru?'],

    // festival
    'festival.1': [
      'పండగ శుభాకాంక్షలు! రేపు ఇంటికి రండి.',
      'Pandaga shubhaa-kaankshalu! Repu intiki randi.',
      { note: 'Hyderabad celebrates Bonalu, Bathukamma, Sankranti, Ugadi, Dasara and Diwali.' },
    ],
    'festival.2': ['థ్యాంక్స్! మీకు కూడా శుభాకాంక్షలు.', 'Thanks! Meeku kooda shubhaa-kaankshalu.'],
    'festival.3': [
      'స్వీట్లు చేస్తున్నాం. ఒంటిగంటకి భోజనం.',
      'Sweet-lu chesthunnaam. Ontigantaki bhojanam.',
    ],
    'festival.4': ['భలే! ఏమైనా తేవాలా?', 'Bhale! Emainaa thevaalaa?'],
    'festival.5': ['ఏమీ వద్దు, ఫ్యామిలీతో రండి చాలు.', 'Emee vaddhu, family-tho randi chaalu.'],
    'festival.6': [
      'చాలు, చాలు! కడుపు నిండిపోయింది.',
      'Chaalu, chaalu! Kadupu nindi-poyindhi.',
      { note: 'Hosts keep serving; a firm, smiling ‘chaalu’ (enough) is how to stop them.' },
    ],
    'festival.x1': ['ఈ పండగని ఏమంటారు?', 'Ee pandagani emantaaru?'],
    'festival.x2': ['ఈ స్వీట్ చాలా బాగుంది!', 'Ee sweet chaalaa baagundhi!'],

    // wedding
    'wedding.1': ['వచ్చేశారు! రండి, పెళ్ళికి స్వాగతం.', 'Vacche-saaru! Randi, pelliki swaagatham.'],
    'wedding.2': [
      'కంగ్రాట్స్! పెళ్ళికూతురు, పెళ్ళికొడుకు ఎక్కడ?',
      'Congrats! Pelli-koothuru, pelli-koduku ekkada?',
    ],
    'wedding.3': ['స్టేజ్ మీద ఉన్నారు. భోజనం చేశారా?', 'Stage meedha unnaaru. Bhojanam chesaaraa?'],
    'wedding.4': [
      'ఇంకా లేదు. ముందు గిఫ్ట్ ఇచ్చేసి వస్తా.',
      'Inkaa ledhu. Mundhu gift icchesi vasthaa.',
    ],
    'wedding.5': ['రండి, తర్వాత కలిసి తిందాం.', 'Randi, tharvaatha kalisi thindhaam.'],
    'wedding.6': ['డెకరేషన్ చాలా బాగుంది!', 'Decoration chaalaa baagundhi!'],
    'wedding.x1': [
      'మీ ఇద్దరూ నూరేళ్ళు సంతోషంగా ఉండాలి!',
      'Mee iddharoo noorellu santhoshangaa undaali!',
      { note: '‘Noorellu’ (a hundred years) is the classic Telugu blessing for a couple.' },
    ],
    'wedding.x2': ['భోజనం అదిరిపోయింది!', 'Bhojanam adhiri-poyindhi!'],

    // cricket
    'cricket.1': ['నిన్న మ్యాచ్ చూశావా?', 'Ninna match choosaavaa?'],
    'cricket.2': [
      'చూశా! ఆ లాస్ట్ ఓవర్ మామూలుగా లేదు!',
      'Choosaa! Aa last over maamoolugaa ledhu!',
      { note: '‘Maamoolugaa ledhu’ (it wasn’t ordinary) is how Telugu says ‘what a …!’.' },
    ],
    'cricket.3': ['నువ్వు ఏ టీమ్ సపోర్ట్ చేస్తావ్?', 'Nuvvu e team support chesthaav?'],
    'cricket.4': [
      'ఇకనుంచి మన హైదరాబాద్ టీమ్‌కే!',
      'Ika-nunchi mana Hyderabad team-ke!',
      { note: 'The city’s IPL team is Sunrisers Hyderabad, ‘SRH’ to fans.' },
    ],
    'cricket.5': ['అయితే నెక్స్ట్ మ్యాచ్ కలిసి చూద్దాం.', 'Ayithe next match kalisi chooddhaam.'],
    'cricket.6': ['పక్కా! స్నాక్స్ నా ట్రీట్.', 'Pakkaa! Snacks naa treat.'],
    'cricket.x1': ['స్కోర్ ఎంత?', 'Score entha?'],
    'cricket.x2': ['ఏం షాట్ కొట్టాడు!', 'Em shot kottaadu!'],

    // movies
    'movies.1': [
      'కొత్త సినిమా వచ్చింది. సండే పోదామా?',
      'Kottha cinema vacchindhi. Sunday podhaamaa?',
    ],
    'movies.2': ['పోదాం! హీరో ఎవరు?', 'Podhaam! Hero evaru?'],
    'movies.3': [
      'పెద్ద స్టార్. అందరూ సూపర్ అంటున్నారు.',
      'Peddha star. Andharoo super antun-naaru.',
    ],
    'movies.4': ['సబ్‌టైటిల్స్ ఉన్న షో ఉందా?', 'Subtitles unna show undhaa?'],
    'movies.5': ['ఉంది, సాయంత్రం ఆరింటి షో.', 'Undhi, saayanthram aarinti show.'],
    'movies.6': [
      'రెండు టికెట్లు బుక్ చేయ్. పాప్‌కార్న్ నాది!',
      'Rendu ticket-lu book chey. Popcorn naadhi!',
    ],
    'movies.x1': [
      'సినిమా కేక!',
      'Cinema keka!',
      { note: '‘Keka’ is Telugu slang for awesome; ‘adhiripoyindhi’ means the same.' },
    ],
    'movies.x2': ['క్లైమాక్స్ నాకు అర్థం కాలేదు.', 'Climax naaku artham kaaledhu.'],

    // teacher
    'teacher.1': [
      'నమస్తే మేడమ్. మా బాబు మూడో క్లాస్ చదువుతున్నాడు.',
      'Namasthe madam. Maa baabu moodo class chaduvu-thunnaadu.',
      { note: 'Say ‘maa baabu’ for a son and ‘maa paapa’ for a daughter (then ‘chaduvuthondhi’).' },
    ],
    'teacher.2': [
      'నమస్తే. బాబు ఇక్కడ హ్యాపీగా ఉన్నాడా?',
      'Namasthe. Baabu ikkada happy-gaa unnaadaa?',
    ],
    'teacher.3': ['ఉన్నాడు, కానీ భాష కొత్త కదా.', 'Unnaadu, kaani bhaasha kottha kadhaa.'],
    'teacher.4': [
      'ఏం పర్లేదు, పిల్లలు తొందరగా నేర్చుకుంటారు.',
      'Em parledhu, pillalu thondharagaa nerchu-kuntaaru.',
    ],
    'teacher.5': ['స్కూల్ ఎన్ని గంటలకు అయిపోతుంది?', 'School enni gantalaku ayipo-thundhi?'],
    'teacher.6': ['మూడున్నరకి.', 'Moodun-naraki.'],
    'teacher.x1': ['ఇవాళ హోంవర్క్ ఉందా?', 'Ivaala homework undhaa?'],
    'teacher.x2': ['ఇవాళ బాబుకి ఒంట్లో బాగాలేదు.', 'Ivaala baabuki ontlo baagaaledhu.'],
    'teacher.x3': ['పేరెంట్స్ మీటింగ్ ఎప్పుడు?', 'Parents meeting eppudu?'],

    // parents
    'parents.1': ['మీ బాబు ఈ క్లాస్‌కి కొత్తా?', 'Mee baabu ee class-ki kotthaa?'],
    'parents.2': ['అవును, మేము వేరే ఊరి నుంచి వచ్చాం.', 'Avunu, memu vere oori nunchi vacchaam.'],
    'parents.3': ['మా పాప కూడా ఇదే క్లాస్.', 'Maa paapa kooda idhe class.'],
    'parents.4': ['అరే, భలే! స్కూల్ బాగుంటుందా?', 'Are, bhale! School baagun-tundhaa?'],
    'parents.5': [
      'చాలా బాగుంటుంది. సండే పార్క్‌కి రండి, పిల్లలు ఆడుకుంటారు.',
      'Chaalaa baagun-tundhi. Sunday park-ki randi, pillalu aadu-kuntaaru.',
    ],
    'parents.6': [
      'తప్పకుండా! ఫోన్ నంబర్లు షేర్ చేసుకుందాం.',
      'Thappakundaa! Phone number-lu share chesu-kundhaam.',
    ],
    'parents.x1': ['స్కూల్ బస్ ఎన్ని గంటలకు వస్తుంది?', 'School bus enni gantalaku vasthundhi?'],
    'parents.x2': ['యూనిఫామ్ షాప్ ఎక్కడ ఉంది?', 'Uniform shop ekkada undhi?'],

    // bank
    'bank.1': ['నాకు సేవింగ్స్ అకౌంట్ ఓపెన్ చేయాలి.', 'Naaku savings account open cheyaali.'],
    'bank.2': ['ఆధార్, పాన్ కార్డ్ ఉన్నాయా?', 'Aadhaar, PAN card unnaayaa?'],
    'bank.3': ['అవును, రెండూ ఉన్నాయి.', 'Avunu, rendoo unnaayi.'],
    'bank.4': ['ఈ ఫామ్ నింపి, ఇక్కడ సైన్ చేయండి.', 'Ee form nimpi, ikkada sign cheyandi.'],
    'bank.5': ['డెబిట్ కార్డ్ ఎప్పుడు వస్తుంది?', 'Debit card eppudu vasthundhi?'],
    'bank.6': ['ఒక వారంలో, పోస్ట్‌లో వస్తుంది.', 'Oka vaaramlo, post-lo vasthundhi.'],
    'bank.x1': ['నాకు డబ్బులు డ్రా చేయాలి.', 'Naaku dabbulu draw cheyaali.'],
    'bank.x2': ['ఏటీఎం పని చేస్తుందా?', 'ATM pani chesthundhaa?'],

    // govtOffice
    'govtOffice.1': [
      'ఏమండి, అడ్రస్ మార్పు కోసం ఎక్కడ అప్లై చేయాలి?',
      'Emandi, address maarpu kosam ekkada apply cheyaali?',
      {
        note: 'Urdu is Telangana’s second official language, so office boards often show both scripts.',
      },
    ],
    'govtOffice.2': [
      'ఐదో కౌంటర్. ముందు టోకెన్ తీసుకోండి.',
      'Aidho counter. Mundhu token theesu-kondi.',
    ],
    'govtOffice.3': ['ఏమేం డాక్యుమెంట్స్ కావాలి?', 'Emem documents kaavaali?'],
    'govtOffice.4': [
      'రెంట్ అగ్రిమెంట్, ఆధార్ జిరాక్స్.',
      'Rent agreement, Aadhaar xerox.',
      { note: 'A photocopy is always a ‘xerox’ here.' },
    ],
    'govtOffice.5': ['ఇవిగోండి. ఎప్పటికి అవుతుంది?', 'Ivigondi. Eppatiki avuthundhi?'],
    'govtOffice.6': ['పది రోజుల తర్వాత రండి.', 'Padhi rojula tharvaatha randi.'],
    'govtOffice.x1': ['రసీదు ఇవ్వండి.', 'Raseedhu ivvandi.'],
    'govtOffice.x2': ['లైన్ ఎక్కడ?', 'Line ekkada?'],
    'govtOffice.x3': ['ఆఫీస్ ఎన్ని గంటలకు తెరుస్తారు?', 'Office enni gantalaku therusthaaru?'],

    // newFriends
    'newFriends.1': ['హాయ్! ఈ సీట్ ఖాళీనా?', 'Hi! Ee seat khaalee-naa?'],
    'newFriends.2': ['ఆ, కూర్చోండి! మీరు ఇక్కడ కొత్తా?', 'Aa, koorchondi! Meeru ikkada kotthaa?'],
    'newFriends.3': ['అవును. జాబ్ కోసం వచ్చా.', 'Avunu. Job kosam vacchaa.'],
    'newFriends.4': ['భలే! హైదరాబాద్ ఎలా ఉంది?', 'Bhale! Hyderabad elaa undhi?'],
    'newFriends.5': ['చాలా నచ్చింది. ఫుడ్ సూపర్!', 'Chaalaa nacchindhi. Food super!'],
    'newFriends.6': [
      'అప్పుడే మా తెలుగు మాట్లాడేస్తున్నారు!',
      'Appude maa Telugu maatlaade-sthunnaaru!',
    ],
    'newFriends.7': ['కొంచెమే! ఇంకా నేర్పించండి.', 'Konchame! Inkaa nerpin-chandi.'],
    'newFriends.x1': ['మీరు ఏం చేస్తుంటారు?', 'Meeru em chesthun-taaru?'],
    'newFriends.x2': ['మీ నంబర్ ఇస్తారా?', 'Mee number isthaaraa?'],

    // weekend
    'weekend.1': ['ఈ వీకెండ్ ఏంటి ప్లాన్?', 'Ee weekend enti plan?'],
    'weekend.2': ['ఇంకా ఏం లేదు. ఏమైనా ఐడియా ఉందా?', 'Inkaa em ledhu. Emainaa idea undhaa?'],
    'weekend.3': ['సండే బయట టిఫిన్ చేద్దాం.', 'Sunday bayata tiffin cheddhaam.'],
    'weekend.4': ['సూపర్! ఎక్కడ కలుద్దాం?', 'Super! Ekkada kaluddhaam?'],
    'weekend.5': ['మెట్రో స్టేషన్ దగ్గర, ఎనిమిదింటికి.', 'Metro station dhaggara, enimi-dhintiki.'],
    'weekend.6': [
      'ఎనిమిదంటే మరీ పొద్దున! తొమ్మిదికి?',
      'Enimi-dhante maree poddhuna! Thommi-dhiki?',
    ],
    'weekend.7': ['సరే, తొమ్మిదికే. లేట్ చేయకు!', 'Sare, thommi-dhike. Late cheyaku!'],
    'weekend.x1': ['దార్లో ఉన్నా.', 'Dhaarlo unnaa.'],
    'weekend.x2': ['సారీ, కొంచెం లేట్ అయింది.', 'Sorry, konchem late ayindhi.'],
  },
};
