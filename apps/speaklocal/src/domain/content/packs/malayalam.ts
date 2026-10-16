import type { LanguagePack } from '../types';

/**
 * Malayalam as spoken in Kochi: everyday colloquial central-Kerala speech, as in
 * films and chats ("evideyaa?", "povo?", "pedikkanda", "adipoli"), not the written
 * standard. Strangers, drivers and elders are "chetta"/"chechi", officials "saare";
 * peers and vendors get a friendly tone. English loanwords (meter, current, bill,
 * lift, form, plan, weekend) are kept, written in Malayalam script with chillu letters.
 *
 * Romanisation: long vowels doubled (aa, ee, oo); e/o for both short and long e/o
 * (ഏ = e, ഓ = o); ai for ഐ. "th"/"dh" for dental ത/ദ, "t"/"d" for retroflex ട/ഡ;
 * doubles written double: ത്ത = tth, ട്ട/റ്റ = tt, ച്ച = cch, ക്ക = kk, ണ്ണ/ന്ന = nn,
 * ള്ള/ല്ല = ll. "zh" for ഴ, "nj" for ഞ/ഞ്ഞ, "ng" for ങ്ങ, "nd" for ണ്ട/ന്ദ, "nt" for ന്റ;
 * "sh" for ശ/ഷ, "r" for both ര and റ, "l"/"n" for ള/ല and ണ/ന. Final closed -u is
 * written "u" ("undu", "nooru"). English loanwords keep their English spelling
 * ("meter", "bus", "Good morning"); hyphens split long words into sayable chunks.
 *
 * Needs native-speaker review before launch.
 */
export const MALAYALAM: LanguagePack = {
  lang: 'ml',
  lines: {
    // greetings
    'greetings.1': ['നമസ്കാരം! സുഖമാണോ?', 'Namaskaaram! Sukhamaano?'],
    'greetings.2': [
      'സുഖമാണ്, നന്ദി. നിങ്ങൾക്കോ?',
      'Sukhamaanu, nanni. Ningalkko?',
      { note: 'To an older neighbour, say “chettano?” or “chechikko?” instead of “ningalkko?”.' },
    ],
    'greetings.3': ['എനിക്കും സുഖം. ഇവിടെ പുതിയതാണോ?', 'Enikkum sukham. Ivide puthiyathaano?'],
    'greetings.4': ['അതെ, ഈ സ്ഥലം എനിക്ക് പുതിയതാ.', 'Athe, ee sthalam enikku puthiyathaa.'],
    'greetings.5': [
      'കുഴപ്പമില്ല! സ്വാഗതം.',
      'Kuzhappamilla! Swaagatham.',
      { note: '“Kuzhappamilla” (no problem, it’s fine) is one of the most used words in Kerala.' },
    ],
    'greetings.6': ['വളരെ നന്ദി. പിന്നെ കാണാം!', 'Valare nanni. Pinne kaanaam!'],
    'greetings.x1': ['സോറി, മനസ്സിലായില്ല.', 'Sorry, manassilaayilla.'],
    'greetings.x2': ['ഒന്നൂടെ പതുക്കെ പറയാമോ?', 'Onnoode pathukke parayaamo?'],
    'greetings.x3': ['ഇതിന് ഇവിടെ എന്താ പറയുന്നേ?', 'Ithinu ivide enthaa parayunne?'],

    // numbers
    'numbers.1': ['ഇതിനെത്രയാ?', 'Ithin-ethrayaa?'],
    'numbers.2': ['അമ്പത് രൂപ.', 'Ambathu roopa.'],
    'numbers.3': ['ഈ രണ്ടെണ്ണത്തിനോ?', 'Ee rendennat-thino?'],
    'numbers.4': ['രണ്ടിനും കൂടി നൂറ്.', 'Randinum koodi nooru.'],
    'numbers.5': [
      'ഇതാ ഇരുന്നൂറ്. ചില്ലറ ഉണ്ടോ?',
      'Ithaa irunnooru. Chillara undo?',
      { note: '“Chillara” is small change; shopkeepers often ask you for it.' },
    ],
    'numbers.6': ['ഉണ്ട്, ഇതാ നൂറ് ബാക്കി.', 'Undu, ithaa nooru baakki.'],
    'numbers.x1': ['ഒന്ന്, രണ്ട്, മൂന്ന്, നാല്, അഞ്ച്.', 'Onnu, randu, moonnu, naalu, anchu.'],
    'numbers.x2': ['ആറ്, ഏഴ്, എട്ട്, ഒമ്പത്, പത്ത്.', 'Aaru, ezhu, ettu, ombathu, patthu.'],
    'numbers.x3': [
      'യുപിഐ ചെയ്യാമോ?',
      'UPI cheyyaamo?',
      { note: 'Many people just say “GPay cheyyaamo?” for any UPI app.' },
    ],

    // auto
    'auto.1': [
      'ചേട്ടാ, റെയിൽവേ സ്റ്റേഷൻ പോവോ?',
      'Chettaa, railway station povo?',
      { note: '“Chetta” (elder brother) is the friendly, respectful way to call an auto driver.' },
    ],
    'auto.2': ['ആ, കേറിക്കോ. ഇരുന്നൂറ് രൂപ.', 'Aa, kerikko. Irunnooru roopa.'],
    'auto.3': [
      'മീറ്റർ ഇട്ട് പോകാമോ?',
      'Meter ittu pokaamo?',
      { note: '“Meter ittu” means with the meter switched on; ask before you get in.' },
    ],
    'auto.4': [
      'മീറ്ററും അമ്പതും, സാറേ.',
      'Meterum ambathum, saare.',
      { note: 'Drivers call men “saare” (sir); a woman passenger hears “chechi” or “madam”.' },
    ],
    'auto.5': [
      'ശരി. നേരെ പോയിട്ട് ഇടത്തോട്ട് തിരിച്ചോ.',
      'Shari. Nere poyittu idatthottu thiriccho.',
    ],
    'auto.6': ['ഇവിടെ നിർത്തിക്കോ, ചേട്ടാ.', 'Ivide nirtthikko, chettaa.'],
    'auto.x1': ['പതുക്കെ പോയാൽ മതി, ചേട്ടാ.', 'Pathukke poyaal mathi, chettaa.'],
    'auto.x2': ['എത്ര നേരമെടുക്കും?', 'Ethra neram-edukkum?'],
    'auto.x3': ['ഇവിടെ വലത്തോട്ട് തിരിച്ചോ.', 'Ivide valatthottu thiriccho.'],

    // shopping
    'shopping.1': ['തക്കാളിക്ക് എന്താ വില?', 'Thakkaalikku enthaa vila?'],
    'shopping.2': ['കിലോ അറുപത് രൂപ.', 'Kilo arupathu roopa.'],
    'shopping.3': ['ഭയങ്കര വിലയാണല്ലോ! അമ്പതിന് താ.', 'Bhayankara vilayaanallo! Ambathinu thaa.'],
    'shopping.4': ['അമ്പത്തഞ്ച്, അവസാന വില.', 'Ambatthanchu, avasaana vila.'],
    'shopping.5': [
      'ശരി, ഒരു കിലോ താ. പിന്നെ കുറച്ച് മല്ലിയിലയും.',
      'Shari, oru kilo thaa. Pinne kuracchu malliyilayum.',
      { note: 'Coriander leaves are “malliyila”; “malli” alone means coriander seeds.' },
    ],
    'shopping.6': ['മല്ലിയില നിങ്ങൾക്ക് ഫ്രീ!', 'Malliyila ningalkku free!'],
    'shopping.x1': ['ഫ്രഷ് ആണോ?', 'Fresh aano?'],
    'shopping.x2': ['അര കിലോ തന്നാൽ മതി.', 'Ara kilo thannaal mathi.'],
    'shopping.x3': ['അതൊന്ന് കാണിക്കാമോ?', 'Athonnu kaanikkaamo?'],

    // landlord
    'landlord.1': ['ഈ വീട് വാടകയ്ക്കാണോ?', 'Ee veedu vaadakaykkaano?'],
    'landlord.2': [
      'അതെ. രണ്ട് ബെഡ്റൂം. വാടക ഇരുപതിനായിരം.',
      'Athe. Randu bedroom. Vaadaka irupathi-naayiram.',
    ],
    'landlord.3': ['അഡ്വാൻസ് എത്രയാ?', 'Advance ethrayaa?'],
    'landlord.4': ['മൂന്ന് മാസത്തെ വാടക.', 'Moonnu maasatthe vaadaka.'],
    'landlord.5': ['വെള്ളം ദിവസം മുഴുവൻ ഉണ്ടാവോ?', 'Vellam divasam muzhuvan undaavo?'],
    'landlord.6': ['ഉണ്ട്, പാർക്കിംഗും ഉണ്ട്.', 'Undu, parkingum undu.'],
    'landlord.7': ['ഞങ്ങൾക്ക് വീടൊന്ന് കാണാമോ?', 'Njangalkku veedonnu kaanaamo?'],
    'landlord.x1': [
      'പൈപ്പ് ലീക്ക് ചെയ്യുന്നുണ്ട്.',
      'Pipe leak cheyyunnundu.',
      { note: 'In Kerala a tap is usually called a “pipe”.' },
    ],
    'landlord.x2': ['വാടക എപ്പോഴാ തരേണ്ടത്?', 'Vaadaka eppozhaa tharendathu?'],
    'landlord.x3': [
      'കറന്റ് പോയി.',
      'Current poyi.',
      { note: 'Electricity is “current”; a power cut is simply “current poyi”.' },
    ],

    // office
    'office.1': [
      'ഗുഡ് മോർണിംഗ്! കാപ്പി കുടിച്ചോ?',
      'Good morning! Kaappi kudiccho?',
      { note: '“Kaappi kudiccho?” (had coffee?) is how Malayalis ask if you’ve had breakfast.' },
    ],
    'office.2': ['ആ, കുടിച്ചു. നിങ്ങളോ?', 'Aa, kudicchu. Ningalo?'],
    'office.3': [
      'ഞാനും കുടിച്ചു. ഇന്ന് ഒരുപാട് പണിയുണ്ടോ?',
      'Njaanum kudicchu. Innu orupaadu paniyundo?',
    ],
    'office.4': ['ആ, പതിനൊന്ന് മണിക്ക് മീറ്റിംഗ് ഉണ്ട്.', 'Aa, pathinonnu manikku meeting undu.'],
    'office.5': ['നാലു മണിക്ക് ചായ കുടിക്കാൻ പോകാം.', 'Naalu manikku chaaya kudikkaan pokaam.'],
    'office.6': ['ശരി, അപ്പോ കാണാം.', 'Shari, appo kaanaam.'],
    'office.x1': ['ഓക്കേ, ബൈ! നാളെ കാണാം.', 'Okay, bye! Naale kaanaam.'],
    'office.x2': ['നിങ്ങൾ എവിടുന്നാ?', 'Ningal evidunnaa?'],
    'office.x3': ['വീക്കെൻഡ് എന്താ പ്ലാൻ?', 'Weekend enthaa plan?'],

    // neighbours
    'neighbours.1': ['അപ്പുറത്ത് പുതിയതായി വന്നവരല്ലേ?', 'Appuratthu puthiyathaayi vannavaralle?'],
    'neighbours.2': ['അതെ, കഴിഞ്ഞ ആഴ്ച വന്നതേയുള്ളൂ.', 'Athe, kazhinja aazhcha vannathe-yulloo.'],
    'neighbours.3': [
      'സ്വാഗതം! എന്താവശ്യമുണ്ടെങ്കിലും പറഞ്ഞാൽ മതി.',
      'Swaagatham! Enthaa-vashyam-undenkilum paranjaal mathi.',
    ],
    'neighbours.4': [
      'നന്ദി. വേസ്റ്റ് എടുക്കാൻ വണ്ടി എപ്പോഴാ വരുന്നേ?',
      'Nanni. Waste edukkaan vandi eppozhaa varunne?',
    ],
    'neighbours.5': ['എന്നും രാവിലെ ഏഴ് മണിക്ക്.', 'Ennum raavile ezhu manikku.'],
    'neighbours.6': [
      'താങ്ക്സ്! ഒരു ദിവസം ചായ കുടിക്കാൻ വീട്ടിലേക്ക് വരണേ.',
      'Thanks! Oru divasam chaaya kudikkaan veettilekku varane.',
    ],
    'neighbours.x1': ['ഇന്ന് പാൽ പാക്കറ്റ് വന്നില്ല.', 'Innu paal packet vannilla.'],
    'neighbours.x2': ['അടുത്ത് വല്ല കടയുമുണ്ടോ?', 'Adutthu valla kadayumundo?'],

    // directions
    'directions.1': [
      'ചേട്ടാ, ഈ മെട്രോ സ്റ്റേഷൻ എവിടെയാ?',
      'Chettaa, ee metro station evideyaa?',
      {
        note: 'Call a stranger “chetta” (older man) or “chechi” (older woman); younger ones “mone”/“mole”.',
      },
    ],
    'directions.2': [
      'നേരെ പോയിട്ട് വലത്തോട്ട് തിരിഞ്ഞാൽ മതി.',
      'Nere poyittu valatthottu thirinjaal mathi.',
    ],
    'directions.3': ['ദൂരമുണ്ടോ?', 'Dooramundo?'],
    'directions.4': [
      'ഇല്ല, അടുത്താ. നടന്നാൽ അഞ്ച് മിനിറ്റ്.',
      'Illa, adutthaa. Nadannaal anchu minute.',
    ],
    'directions.5': ['ബസ് സ്റ്റോപ്പിന്റെ അടുത്താണോ?', 'Bus stoppinte adutthaano?'],
    'directions.6': ['അതെ, തൊട്ട് എതിരെ.', 'Athe, thottu ethire.'],
    'directions.7': ['ഉപകാരം, ചേട്ടാ!', 'Upakaaram, chettaa!'],
    'directions.x1': ['ബാത്ത്റൂം എവിടെയാ?', 'Bathroom evideyaa?'],
    'directions.x2': ['എനിക്ക് വഴി അറിയില്ല.', 'Enikku vazhi ariyilla.'],
    'directions.x3': ['അങ്ങോട്ട് ഏത് ബസാ പോകുന്നേ?', 'Angottu ethu busaa pokunne?'],

    // restaurant
    'restaurant.1': [
      'ഒരു കാപ്പിയും ഒരു ചായയും.',
      'Oru kaappiyum oru chaayayum.',
      { note: 'Tea is “chaaya”, coffee “kaappi”; ask for “kattan chaaya” for black tea.' },
    ],
    'restaurant.2': ['കഴിക്കാൻ എന്തെങ്കിലും വേണോ?', 'Kazhikkaan enthenkilum veno?'],
    'restaurant.3': ['എന്തൊക്കെയുണ്ട്?', 'Enthokkeyundu?'],
    'restaurant.4': [
      'പുട്ട്, അപ്പം, പഴംപൊരി ഒക്കെ റെഡിയാണ്.',
      'Puttu, appam, pazhampori okke ready-aanu.',
      {
        en: 'Puttu, appam and pazhampori are ready.',
        hi: 'पुट्टु, अप्पम और पझमपोरी तैयार हैं।',
        note: 'Puttu is steamed rice cake; pazhampori is a fried banana fritter, a tea-time favourite.',
      },
    ],
    'restaurant.5': [
      'ഒരു പ്ലേറ്റ് പുട്ടും കടലയും. എരിവ് കുറച്ച് മതി.',
      'Oru plate puttum kadalayum. Erivu kuracchu mathi.',
      {
        en: 'One plate of puttu and kadala curry. Not too spicy.',
        hi: 'एक प्लेट पुट्टु और कडला करी। ज़्यादा तीखा नहीं।',
        note: 'Kadala is black chickpea curry; “erivu kuracchu mathi” asks for less chilli.',
      },
    ],
    'restaurant.6': ['ബില്ല് തരാമോ?', 'Billu tharaamo?'],
    'restaurant.7': ['തൊണ്ണൂറ് രൂപ.', 'Thonnooru roopa.'],
    'restaurant.x1': ['ഇത് വെജ് ആണോ?', 'Ithu veg aano?'],
    'restaurant.x2': [
      'കുറച്ച് വെള്ളം തരാമോ?',
      'Kuracchu vellam tharaamo?',
      {
        note: 'Many Kerala eateries serve warm herbal water (jeerakavellam) unless you ask for cold.',
      },
    ],
    'restaurant.x3': ['പാഴ്സൽ ആക്കി തരാമോ?', 'Parcel aakki tharaamo?'],

    // doctor
    'doctor.1': ['എന്താ ബുദ്ധിമുട്ട്?', 'Enthaa buddhimuttu?'],
    'doctor.2': ['പനിയും തലവേദനയും ഉണ്ട്.', 'Paniyum thalavedanayum undu.'],
    'doctor.3': ['എപ്പോ മുതൽ?', 'Eppo muthal?'],
    'doctor.4': ['ഇന്നലെ രാത്രി മുതൽ.', 'Innale raathri muthal.'],
    'doctor.5': [
      'ഈ ഗുളിക ദിവസം രണ്ട് നേരം, ഭക്ഷണം കഴിച്ചിട്ട് കഴിക്കണം.',
      'Ee gulika divasam randu neram, bhakshanam kazhicchittu kazhikkanam.',
    ],
    'doctor.6': [
      'ഈ മരുന്ന് ഉണ്ടോ?',
      'Ee marunnu undo?',
      { note: 'A chemist is a “medical shop” in Kerala.' },
    ],
    'doctor.7': ['ഉണ്ട്. എഴുപത് രൂപ.', 'Undu. Ezhupathu roopa.'],
    'doctor.x1': ['വയറുവേദനയുണ്ട്.', 'Vayaru-vedana-yundu.'],
    'doctor.x2': ['ചുമയും ജലദോഷവും ഉണ്ട്.', 'Chumayum jaladoshavum undu.'],
    'doctor.x3': ['അടുത്ത് വല്ല ഹോസ്പിറ്റലുമുണ്ടോ?', 'Adutthu valla hospitalumundo?'],

    // emergency
    'emergency.1': [
      'രക്ഷിക്കണേ! ഒന്ന് സഹായിക്കണേ!',
      'Rakshikkane! Onnu sahaayikkane!',
      { note: 'Dial 112 for any emergency in India; 108 also brings an ambulance in Kerala.' },
    ],
    'emergency.2': ['എന്ത് പറ്റി?', 'Enthu patti?'],
    'emergency.3': [
      'ഒരു ആക്സിഡന്റ് ആയി. ആംബുലൻസ് വിളിക്കണേ!',
      'Oru accident aayi. Ambulance vilikkane!',
    ],
    'emergency.4': ['ഇപ്പോ വിളിക്കാം. പേടിക്കണ്ട.', 'Ippo vilikkaam. Pedikkanda.'],
    'emergency.5': ['പോലീസ് സ്റ്റേഷൻ എവിടെയാ?', 'Police station evideyaa?'],
    'emergency.6': ['മെയിൻ റോഡിന്റെ അടുത്താ.', 'Main roadinte adutthaa.'],
    'emergency.7': ['എന്റെ ഫോൺ ആരോ മോഷ്ടിച്ചു.', 'Ente phone aaro moshticchu.'],
    'emergency.x1': ['തീ! തീ പിടിച്ചു!', 'Thee! Thee pidicchu!'],
    'emergency.x2': ['പോലീസിനെ വിളിക്കണേ!', 'Poleesine vilikkane!'],
    'emergency.x3': [
      'എനിക്ക് പെട്ടെന്ന് ഒരു ഡോക്ടറെ കാണണം.',
      'Enikku pettennu oru doctore kaananam.',
    ],

    // delivery
    'delivery.1': ['ഹലോ, ഫുഡ് ഓർഡർ ഉണ്ട്.', 'Hello, food order undu.'],
    'delivery.2': ['ഹലോ. എവിടെയാ ഉള്ളത്?', 'Hello. Evideyaa ullathu?'],
    'delivery.3': ['ഗേറ്റിന്റെ അടുത്തുണ്ട്. ഏത് ഫ്ലോറാ?', 'Gate-inte adutthundu. Ethu floor-aa?'],
    'delivery.4': [
      'മൂന്നാമത്തെ ഫ്ലോർ. മുകളിലേക്ക് വന്നോളൂ.',
      'Moonnaamatthe floor. Mukalilekku vannoloo.',
    ],
    'delivery.5': ['ലിഫ്റ്റ് വർക്ക് ചെയ്യുന്നില്ല.', 'Lift work cheyyunnilla.'],
    'delivery.6': ['ശരി, ഒന്ന് നിൽക്കണേ. രണ്ട് മിനിറ്റ്.', 'Shari, onnu nilkkane. Randu minute.'],
    'delivery.x1': ['വാതിൽക്കൽ വെച്ചേക്കൂ.', 'Vaathilkkal vecchekkoo.'],
    'delivery.x2': ['എത്തുമ്പോ വിളിക്കണേ.', 'Etthumbo vilikkane.'],
    'delivery.x3': ['ആരാ സംസാരിക്കുന്നേ?', 'Aaraa samsaarikkunne?'],

    // festival
    'festival.1': [
      'ഓണാശംസകൾ! നാളെ വീട്ടിലേക്ക് വരണേ.',
      'Onaa-shamsakal! Naale veettilekku varane.',
      {
        en: 'Happy Onam! Come home tomorrow.',
        hi: 'ओणम की शुभकामनाएँ! कल घर आइए।',
        note: 'Onam (Aug–Sep) is Kerala’s harvest festival; “Happy Onam” is heard just as often.',
      },
    ],
    'festival.2': [
      'താങ്ക്സ്! നിങ്ങൾക്കും ഓണാശംസകൾ.',
      'Thanks! Ningalkkum onaa-shamsakal.',
      { en: 'Thank you! Happy Onam to you too.', hi: 'धन्यवाद! आपको भी ओणम की शुभकामनाएँ।' },
    ],
    'festival.3': [
      'പായസം ഉണ്ടാക്കുന്നുണ്ട്. ഒരു മണിക്കാ സദ്യ.',
      'Paayasam undaakkunnundu. Oru manikkaa sadya.',
      {
        en: 'We’re making payasam. The feast is at one.',
        hi: 'हम पायसम बना रहे हैं। एक बजे दावत है।',
        note: 'Sadya is the feast served on a banana leaf; payasam is the sweet pudding that ends it.',
      },
    ],
    'festival.4': [
      'അടിപൊളി! ഞാൻ എന്തെങ്കിലും കൊണ്ടുവരണോ?',
      'Adipoli! Njaan enthenkilum kondu-varano?',
      { note: '“Adipoli” (superb, awesome) is Kerala’s favourite slang word.' },
    ],
    'festival.5': [
      'ഒന്നും വേണ്ട, ഫാമിലിയെയും കൂട്ടി വന്നാൽ മതി.',
      'Onnum venda, familiyeyum kootti vannaal mathi.',
    ],
    'festival.6': ['മതി, മതി! വയറ് നിറഞ്ഞു.', 'Mathi, mathi! Vayaru niranju.'],
    'festival.x1': [
      'ഈ ആഘോഷത്തിന് എന്താ പേര്?',
      'Ee aaghoshat-thinu enthaa peru?',
      { note: 'Other big days in Kochi: Vishu (April), Christmas and Eid, all widely celebrated.' },
    ],
    'festival.x2': [
      'പായസം അടിപൊളി!',
      'Paayasam adipoli!',
      { en: 'The payasam is superb!', hi: 'पायसम बहुत बढ़िया है!' },
    ],

    // wedding
    'wedding.1': [
      'വന്നല്ലോ! കല്യാണത്തിലേക്ക് സ്വാഗതം.',
      'Vannallo! Kalyaanatthi-lekku swaagatham.',
    ],
    'wedding.2': [
      'കൺഗ്രാജുലേഷൻസ്! പെണ്ണും ചെക്കനും എവിടെ?',
      'Congratulations! Pennum chekkanum evide?',
      {
        note: '“Pennum chekkanum” (the girl and the boy) is the everyday way to say bride and groom.',
      },
    ],
    'wedding.3': ['സ്റ്റേജിലുണ്ട്. ഫുഡ് കഴിച്ചോ?', 'Stage-ilundu. Food kazhiccho?'],
    'wedding.4': ['ഇല്ല. ആദ്യം ഗിഫ്റ്റ് കൊടുക്കട്ടെ.', 'Illa. Aadyam gift kodukkatte.'],
    'wedding.5': [
      'വാ, അത് കഴിഞ്ഞ് നമുക്ക് ഒരുമിച്ച് കഴിക്കാം.',
      'Vaa, athu kazhinju namukku orumicchu kazhikkaam.',
    ],
    'wedding.6': ['ഡെക്കറേഷൻ അടിപൊളി ആയിട്ടുണ്ട്!', 'Decoration adipoli aayittundu!'],
    'wedding.x1': [
      'രണ്ടുപേർക്കും നല്ലൊരു ജീവിതം ആശംസിക്കുന്നു!',
      'Randu-perkkum nalloru jeevitham aashamsikkunnu!',
    ],
    'wedding.x2': ['സദ്യ അടിപൊളി ആയിരുന്നു!', 'Sadya adipoli aayirunnu!'],

    // cricket
    'cricket.1': ['ഇന്നലത്തെ മാച്ച് കണ്ടോ?', 'Innalatthe match kando?'],
    'cricket.2': ['കണ്ടു! എന്തൊരു ലാസ്റ്റ് ഓവർ!', 'Kandu! Enthoru last over!'],
    'cricket.3': ['ഏത് ടീമിന്റെ ഫാനാ?', 'Ethu team-inte fan-aa?'],
    'cricket.4': [
      'ഇനി മുതൽ, നമ്മുടെ നാട്ടിലെ ടീം!',
      'Ini muthal, nammude naattile team!',
      { note: 'Kerala loves football too: Kerala Blasters games pack the stadium in Kochi.' },
    ],
    'cricket.5': ['എന്നാ അടുത്ത മാച്ച് ഒരുമിച്ച് കാണാം.', 'Enna aduttha match orumicchu kaanaam.'],
    'cricket.6': [
      'ഉറപ്പ്! സ്നാക്സ് എന്റെ വക.',
      'Urappu! Snacks ente vaka.',
      { note: '“Ente vaka” means it’s on me, my treat.' },
    ],
    'cricket.x1': ['സ്കോർ എത്രയായി?', 'Score ethrayaayi?'],
    'cricket.x2': ['എന്തൊരു ഷോട്ട്!', 'Enthoru shot!'],

    // movies
    'movies.1': [
      'പുതിയ പടം ഇറങ്ങിയിട്ടുണ്ട്. ഞായറാഴ്ച പോയാലോ?',
      'Puthiya padam irangiyittundu. Njaayar-aazhcha poyaalo?',
      { note: 'A film is a “padam” in everyday talk; “cinema” is common too.' },
    ],
    'movies.2': ['പോകാം! ആരാ ഹീറോ?', 'Pokaam! Aaraa hero?'],
    'movies.3': [
      'വലിയ സ്റ്റാറാ. പടം അടിപൊളിയാണെന്നാ എല്ലാരും പറയുന്നേ.',
      'Valiya star-aa. Padam adipoliyaa-nennaa ellaarum parayunne.',
    ],
    'movies.4': ['സബ്ടൈറ്റിൽ ഉള്ള ഷോ ഉണ്ടോ?', 'Subtitle ulla show undo?'],
    'movies.5': ['ഉണ്ട്, വൈകിട്ട് ആറ് മണിയുടെ ഷോ.', 'Undu, vaikittu aaru maniyude show.'],
    'movies.6': [
      'രണ്ട് ടിക്കറ്റ് ബുക്ക് ചെയ്യ്. പോപ്കോൺ എന്റെ വക!',
      'Randu ticket book cheyyu. Popcorn ente vaka!',
    ],
    'movies.x1': ['പടം അടിപൊളി ആയിരുന്നു!', 'Padam adipoli aayirunnu!'],
    'movies.x2': ['എനിക്ക് ക്ലൈമാക്സ് മനസ്സിലായില്ല.', 'Enikku climax manassilaayilla.'],

    // teacher
    'teacher.1': [
      'ഗുഡ് മോർണിംഗ്, ടീച്ചർ. എന്റെ കുട്ടി മൂന്നാം ക്ലാസിലാണ്.',
      'Good morning, teacher. Ente kutti moonnaam classilaanu.',
      { note: 'In Kerala you address a teacher simply as “teacher” (or “sir”), not “ma’am”.' },
    ],
    'teacher.2': [
      'ഗുഡ് മോർണിംഗ്. കുട്ടിക്ക് ഇവിടെ ഇഷ്ടമായോ?',
      'Good morning. Kuttikku ivide ishtamaayo?',
    ],
    'teacher.3': ['അതെ, പക്ഷേ ഭാഷ പുതിയതാ.', 'Athe, pakshe bhaasha puthiyathaa.'],
    'teacher.4': [
      'വിഷമിക്കണ്ട, കുട്ടികൾ പെട്ടെന്ന് പഠിക്കും.',
      'Vishamikkanda, kuttikal pettennu padikkum.',
    ],
    'teacher.5': ['സ്കൂൾ എത്ര മണിക്കാ വിടുന്നത്?', 'School ethra manikkaa vidunnathu?'],
    'teacher.6': ['മൂന്നര മണിക്ക്.', 'Moonnara manikku.'],
    'teacher.x1': ['ഇന്ന് ഹോംവർക്ക് ഉണ്ടോ?', 'Innu homework undo?'],
    'teacher.x2': ['എന്റെ കുട്ടിക്ക് ഇന്ന് സുഖമില്ല.', 'Ente kuttikku innu sukhamilla.'],
    'teacher.x3': [
      'പിടിഎ മീറ്റിംഗ് എന്നാ?',
      'PTA meeting ennaa?',
      { note: 'Kerala schools call the parents’ meeting the “PTA meeting”.' },
    ],

    // parents
    'parents.1': ['നിങ്ങടെ കുട്ടി ഈ ക്ലാസിൽ പുതിയതാണോ?', 'Ningade kutti ee classil puthiyathaano?'],
    'parents.2': [
      'അതെ, ഞങ്ങൾ വേറൊരു സിറ്റിയിൽ നിന്നാ വന്നത്.',
      'Athe, njangal veroru cityil ninnaa vannathu.',
    ],
    'parents.3': ['എന്റെ മോളും ഇതേ ക്ലാസിലാ.', 'Ente molum ithe classilaa.'],
    'parents.4': ['ആഹാ, കൊള്ളാമല്ലോ! സ്കൂൾ നല്ലതാണോ?', 'Aahaa, kollaamallo! School nallathaano?'],
    'parents.5': [
      'നല്ല സ്കൂളാ. ഞായറാഴ്ച പാർക്കിലേക്ക് വന്നോളൂ, പിള്ളേർക്ക് കളിക്കാം.',
      'Nalla schoolaa. Njaayar-aazhcha parkilekku vannoloo, pillerkku kalikkaam.',
    ],
    'parents.6': [
      'ഉറപ്പായും! നമുക്ക് നമ്പർ ഷെയർ ചെയ്യാം.',
      'Urappaayum! Namukku number share cheyyaam.',
    ],
    'parents.x1': ['സ്കൂൾ ബസ് എത്ര മണിക്കാ വരുന്നത്?', 'School bus ethra manikkaa varunnathu?'],
    'parents.x2': ['യൂണിഫോം കട എവിടെയാ?', 'Uniform kada evideyaa?'],

    // bank
    'bank.1': [
      'എനിക്ക് ഒരു സേവിംഗ്സ് അക്കൗണ്ട് തുടങ്ങണം.',
      'Enikku oru savings account thudanganam.',
    ],
    'bank.2': ['ആധാറും പാൻ കാർഡും ഉണ്ടോ?', 'Aadhaarum PAN cardum undo?'],
    'bank.3': ['ഉണ്ട്, രണ്ടും ഉണ്ട്.', 'Undu, randum undu.'],
    'bank.4': ['ഈ ഫോം ഫിൽ ചെയ്തിട്ട് ഇവിടെ ഒപ്പിടണം.', 'Ee form fill cheythittu ivide oppidanam.'],
    'bank.5': ['ഡെബിറ്റ് കാർഡ് എപ്പോ കിട്ടും?', 'Debit card eppo kittum?'],
    'bank.6': ['ഒരാഴ്ചക്കുള്ളിൽ, പോസ്റ്റിൽ വരും.', 'Oraazhcha-kkullil, postil varum.'],
    'bank.x1': ['എനിക്ക് കുറച്ച് പൈസ എടുക്കണം.', 'Enikku kuracchu paisa edukkanam.'],
    'bank.x2': ['എടിഎം വർക്ക് ചെയ്യുന്നുണ്ടോ?', 'ATM work cheyyunnundo?'],

    // govtOffice
    'govtOffice.1': [
      'സാറേ, അഡ്രസ്സ് മാറ്റാൻ എവിടെയാ അപേക്ഷ കൊടുക്കേണ്ടത്?',
      'Saare, address maattaan evideyaa apeksha kodukkendathu?',
      { note: 'Call officials “saare” (sir) or “madam”; it is expected at counters and banks.' },
    ],
    'govtOffice.2': [
      'അഞ്ചാം നമ്പർ കൗണ്ടർ. ആദ്യം ടോക്കൺ എടുക്കണം.',
      'Anchaam number counter. Aadyam token edukkanam.',
    ],
    'govtOffice.3': ['എന്തൊക്കെ പേപ്പറുകൾ വേണം?', 'Enthokke paperukal venam?'],
    'govtOffice.4': [
      'വാടക എഗ്രിമെന്റും ആധാറിന്റെ കോപ്പിയും.',
      'Vaadaka agreementum aadhaarinte copyum.',
    ],
    'govtOffice.5': ['ഇതാ. എപ്പോ ശരിയാകും?', 'Ithaa. Eppo shariyaakum?'],
    'govtOffice.6': ['പത്ത് ദിവസം കഴിഞ്ഞ് വരൂ.', 'Patthu divasam kazhinju varoo.'],
    'govtOffice.x1': ['ഒരു രസീത് തരാമോ?', 'Oru raseethu tharaamo?'],
    'govtOffice.x2': ['ക്യൂ എവിടെയാ?', 'Queue evideyaa?'],
    'govtOffice.x3': ['ഓഫീസ് എപ്പോഴാ തുറക്കുന്നത്?', 'Office eppozhaa thurakkunnathu?'],

    // newFriends
    'newFriends.1': ['ഹായ്! ഈ സീറ്റിൽ ആരെങ്കിലും ഉണ്ടോ?', 'Hi! Ee seatil aarenkilum undo?'],
    'newFriends.2': ['ഇല്ല, ഇരുന്നോളൂ! ഇവിടെ പുതിയതാണോ?', 'Illa, irunnoloo! Ivide puthiyathaano?'],
    'newFriends.3': ['അതെ. ജോലിക്ക് വേണ്ടി വന്നതാ.', 'Athe. Jolikku vendi vannathaa.'],
    'newFriends.4': ['കൊള്ളാം! കൊച്ചി എങ്ങനെയുണ്ട്?', 'Kollaam! Kochi enganeyundu?'],
    'newFriends.5': ['ഒരുപാട് ഇഷ്ടമായി. ഫുഡ് അടിപൊളിയാ!', 'Orupaadu ishtamaayi. Food adipoliyaa!'],
    'newFriends.6': [
      'അല്ലാ, ഇപ്പോഴേ മലയാളം പറയാൻ തുടങ്ങിയോ!',
      'Allaa, ippozhe Malayaalam parayaan thudangiyo!',
    ],
    'newFriends.7': [
      'കുറച്ചൊക്കെ! ഇനിയും പഠിപ്പിച്ചു തരണേ.',
      'Kuracchokke! Iniyum padippicchu tharane.',
    ],
    'newFriends.x1': ['എന്താ ജോലി?', 'Enthaa joli?'],
    'newFriends.x2': ['നമ്പർ ഒന്ന് തരാമോ?', 'Number onnu tharaamo?'],

    // weekend
    'weekend.1': [
      'ഈ വീക്കെൻഡ് എന്താ പരിപാടി?',
      'Ee weekend enthaa paripaadi?',
      { note: '“Paripaadi” means plan; Kochi friends often open with “machaane” (bro).' },
    ],
    'weekend.2': [
      'ഇതുവരെ ഒന്നുമില്ല. എന്തെങ്കിലും ഐഡിയ ഉണ്ടോ?',
      'Ithuvare onnumilla. Enthenkilum idea undo?',
    ],
    'weekend.3': [
      'ഞായറാഴ്ച പുറത്ത് പോയി ബ്രേക്ക്ഫാസ്റ്റ് കഴിച്ചാലോ?',
      'Njaayar-aazhcha puratthu poyi breakfast kazhicchaalo?',
    ],
    'weekend.4': ['അടിപൊളി! എവിടെ വെച്ച് കാണും?', 'Adipoli! Evide vecchu kaanum?'],
    'weekend.5': ['മെട്രോ സ്റ്റേഷനിൽ, എട്ട് മണിക്ക്.', 'Metro stationil, ettu manikku.'],
    'weekend.6': [
      'എട്ട് ഭയങ്കര നേരത്തെയാ! ഒമ്പത് ആയാലോ?',
      'Ettu bhayankara neratthe-yaa! Ombathu aayaalo?',
    ],
    'weekend.7': ['ശരി, ഒമ്പത്. ലേറ്റ് ആക്കല്ലേ!', 'Shari, ombathu. Late aakkalle!'],
    'weekend.x1': ['ഞാൻ വഴിയിലുണ്ട്.', 'Njaan vazhiyilundu.'],
    'weekend.x2': ['സോറി, കുറച്ച് ലേറ്റ് ആയി.', 'Sorry, kuracchu late aayi.'],
  },
};
