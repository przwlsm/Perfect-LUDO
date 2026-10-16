import type { LanguagePack } from '../types';

/**
 * Marathi as spoken in Pune and Mumbai: everyday city Marathi that works in
 * both, with the colloquial spoken endings (कसं, झालं, बोलतंय) and the
 * English words people really use (मीटर, बिल, लिफ्ट, प्लॅन). Polite plural
 * तुम्ही with elders, officials and strangers; casual तू only with friends.
 * Lines said by "you" avoid gendered first-person verbs (आलो/आले,
 * करतो/करते): they use मला ... आहे, impersonal forms, the neutral future
 * (देईन, भेटू) or आम्ही.
 *
 * Romanisation: ा is always "aa"; ी/ू are "ee"/"oo" where said long (mee,
 * khoop, naveen) and "i"/"u" where Marathi says them short (naahi, kiti,
 * tumhi). Short अ is "a", and the final silent a is dropped (ghar, kaam).
 * Neuter endings in ं are written "a" (kasa, jhaala). t/d cover both dental
 * and retroflex; th/dh/kh/gh/bh/jh are the aspirates; च is "ch", छ "chh",
 * ळ "l", ण "n", श/ष "sh", व "v". English loans keep their familiar
 * spelling (meter, station, bill).
 *
 * Needs native-speaker review before launch.
 */
export const MARATHI: LanguagePack = {
  lang: 'mr',
  lines: {
    // greetings
    'greetings.1': [
      'नमस्कार! कसं काय?',
      'Namaskaar! Kasa kaay?',
      { note: '“Kasa kaay?” is the everyday “how are you”; namaskaar is the polite hello.' },
    ],
    'greetings.2': [
      'मी मजेत आहे, धन्यवाद. आणि तुम्ही?',
      'Mee majet aahe, dhanyavaad. Aani tumhi?',
      { note: '“Majet” (doing well) works for everyone, unlike the gendered bara/bari.' },
    ],
    'greetings.3': [
      'मी पण मजेत. तुम्ही इथे नवीन आहात का?',
      'Mee pan majet. Tumhi ithe naveen aahaat kaa?',
    ],
    'greetings.4': [
      'हो, हे शहर मला नवीन आहे.',
      'Ho, he shahar mala naveen aahe.',
      { note: 'Marathi says “ho” for yes, not “haan”.' },
    ],
    'greetings.5': [
      'काही प्रॉब्लेम नाही! तुमचं स्वागत आहे.',
      'Kaahi problem naahi! Tumcha swaagat aahe.',
    ],
    'greetings.6': [
      'खूप धन्यवाद. नंतर भेटू!',
      'Khoop dhanyavaad. Nantar bhetu!',
      { note: 'Leaving, men say “yeto” and women “yete”; “bhetu” (we’ll meet) suits everyone.' },
    ],
    'greetings.x1': ['माफ करा, मला कळलं नाही.', 'Maaf karaa, mala kalla naahi.'],
    'greetings.x2': ['परत एकदा सांगा ना, हळू हळू.', 'Parat ekdaa saangaa naa, halu halu.'],
    'greetings.x3': ['याला इथे काय म्हणतात?', 'Yaalaa ithe kaay mhantaat?'],

    // numbers
    'numbers.1': ['हे कितीला आहे?', 'He kitilaa aahe?'],
    'numbers.2': ['पन्नास रुपये.', 'Pannaas rupaye.'],
    'numbers.3': ['आणि हे दोन?', 'Aani he don?'],
    'numbers.4': ['दोन्ही मिळून शंभर रुपये.', 'Donhi milun shambhar rupaye.'],
    'numbers.5': [
      'हे घ्या दोनशे. सुट्टे आहेत का?',
      'He ghyaa donshe. Sutte aahet kaa?',
      { note: '“Sutte” means small change; vendors often run short of it.' },
    ],
    'numbers.6': ['हो, हे घ्या शंभर परत.', 'Ho, he ghyaa shambhar parat.'],
    'numbers.x1': ['एक, दोन, तीन, चार, पाच.', 'Ek, don, teen, chaar, paach.'],
    'numbers.x2': ['सहा, सात, आठ, नऊ, दहा.', 'Sahaa, saat, aath, nau, dahaa.'],
    'numbers.x3': ['यूपीआयने पैसे देऊ का?', 'UPI-ne paise deu kaa?'],

    // auto
    'auto.1': [
      'दादा, रेल्वे स्टेशनला येणार का?',
      'Daadaa, railway station-laa yenaar kaa?',
      { note: 'Call a driver “Dada” (brother), or “Kaka” (uncle) if he is older.' },
    ],
    'auto.2': ['हो, बसा. दोनशे रुपये.', 'Ho, basaa. Donshe rupaye.'],
    'auto.3': [
      'मीटरने चला ना, दादा.',
      'Meter-ne chalaa naa, daadaa.',
      { note: 'Adding “naa” softens a request, like saying please.' },
    ],
    'auto.4': [
      'मीटरपेक्षा पन्नास जास्त, साहेब.',
      'Meter-peksha pannaas jaast, saaheb.',
      { note: '“Saheb” is the respectful “sir”.' },
    ],
    'auto.5': [
      'ठीक आहे. सरळ चला, मग डावीकडे वळा.',
      'Theek aahe. Saral chalaa, mag daavikade valaa.',
    ],
    'auto.6': ['इथेच थांबवा ना.', 'Ithech thaambvaa naa.'],
    'auto.x1': ['जरा हळू चालवा ना.', 'Jaraa halu chaalvaa naa.'],
    'auto.x2': ['किती वेळ लागेल?', 'Kiti vel laagel?'],
    'auto.x3': ['इथे उजवीकडे वळा.', 'Ithe ujvikade valaa.'],

    // shopping
    'shopping.1': [
      'टोमॅटो कसे दिले?',
      'Tomato kase dile?',
      { note: '“Kase dile?” is how Marathi shoppers ask a vendor’s rate.' },
    ],
    'shopping.2': ['साठ रुपये किलो.', 'Saath rupaye kilo.'],
    'shopping.3': [
      'खूप जास्त आहे! पन्नासला दे ना.',
      'Khoop jaast aahe! Pannaas-laa de naa.',
      { note: 'Casual “de” (give) suits a friendly vendor; “dyaa” is the polite form.' },
    ],
    'shopping.4': ['पंचावन्न, शेवटचा भाव.', 'Panchaavanna, shevatchaa bhaav.'],
    'shopping.5': [
      'बरं, एक किलो दे. आणि थोडी कोथिंबीर.',
      'Bara, ek kilo de. Aani thodi kothimbir.',
      { note: '“Kothimbir” is coriander; asking for a little extra is normal.' },
    ],
    'shopping.6': ['कोथिंबीर तुम्हाला फुकट!', 'Kothimbir tumhaalaa phukat!'],
    'shopping.x1': ['ताजं आहे का?', 'Taaja aahe kaa?'],
    'shopping.x2': ['अर्धा किलो द्या.', 'Ardhaa kilo dyaa.'],
    'shopping.x3': ['ते दाखवा ना.', 'Te daakhvaa naa.'],

    // landlord
    'landlord.1': ['हे घर भाड्याने आहे का?', 'He ghar bhaadyaane aahe kaa?'],
    'landlord.2': [
      'हो. दोन बेडरूम. भाडं वीस हजार आहे.',
      'Ho. Don bedroom. Bhaada vees hajaar aahe.',
    ],
    'landlord.3': [
      'डिपॉझिट किती आहे?',
      'Deposit kiti aahe?',
      { note: 'Locals call the advance the “deposit”.' },
    ],
    'landlord.4': ['तीन महिन्यांचं भाडं.', 'Teen mahinyaancha bhaada.'],
    'landlord.5': ['पाणी दिवसभर येतं का?', 'Paani divasbhar yeta kaa?'],
    'landlord.6': ['हो, आणि पार्किंग पण आहे.', 'Ho, aani parking pan aahe.'],
    'landlord.7': ['घर बघता येईल का?', 'Ghar baghtaa yeil kaa?'],
    'landlord.x1': ['नळ गळतोय.', 'Nal galtoy.'],
    'landlord.x2': ['भाडं कधी द्यायचं?', 'Bhaada kadhi dyaaycha?'],
    'landlord.x3': [
      'लाईट गेली आहे.',
      'Light geli aahe.',
      { note: 'Everyone says “light geli” for a power cut.' },
    ],

    // office
    'office.1': ['गुड मॉर्निंग! नाश्ता झाला?', 'Good morning! Naashtaa jhaalaa?'],
    'office.2': ['हो, झाला. तुमचा?', 'Ho, jhaalaa. Tumchaa?'],
    'office.3': ['झाला. आज खूप काम आहे का?', 'Jhaalaa. Aaj khoop kaam aahe kaa?'],
    'office.4': ['हो, अकरा वाजता मीटिंग आहे.', 'Ho, akraa vaajtaa meeting aahe.'],
    'office.5': ['चार वाजता चहा प्यायला जाऊया.', 'Chaar vaajtaa chahaa pyaaylaa jaauyaa.'],
    'office.6': ['नक्की, तेव्हा भेटू.', 'Nakki, tevhaa bhetu.'],
    'office.x1': ['बरं, बाय! उद्या भेटू.', 'Bara, bye! Udyaa bhetu.'],
    'office.x2': [
      'तुमचं गाव कुठलं?',
      'Tumcha gaav kuthla?',
      { note: '“Gaav” is your hometown; this is the friendly way to ask where you are from.' },
    ],
    'office.x3': ['वीकेंडचा काय प्लॅन आहे?', 'Weekend-chaa kaay plan aahe?'],

    // neighbours
    'neighbours.1': [
      'तुम्ही शेजारी नवीन राहायला आलात ना?',
      'Tumhi shejaari naveen raahaaylaa aalaat naa?',
    ],
    'neighbours.2': ['हो, आम्ही मागच्या आठवड्यात आलो.', 'Ho, aamhi maagchyaa aathvadyaat aalo.'],
    'neighbours.3': [
      'स्वागत आहे! काही लागलं तर नक्की सांगा.',
      'Swaagat aahe! Kaahi laagla tar nakki saangaa.',
    ],
    'neighbours.4': [
      'धन्यवाद. कचऱ्याची गाडी कधी येते?',
      'Dhanyavaad. Kachryaachi gaadi kadhi yete?',
    ],
    'neighbours.5': ['रोज सकाळी सात वाजता.', 'Roj sakaali saat vaajtaa.'],
    'neighbours.6': [
      'धन्यवाद! कधीतरी चहाला घरी या ना.',
      'Dhanyavaad! Kadhitari chahaalaa ghari yaa naa.',
    ],
    'neighbours.x1': [
      'आज दुधाची पिशवी आली नाही.',
      'Aaj dudhaachi pishvi aali naahi.',
      { note: 'Milk comes in a “pishvi” (plastic pouch), often left at the door.' },
    ],
    'neighbours.x2': ['जवळ कुठे दुकान आहे का?', 'Javal kuthe dukaan aahe kaa?'],

    // directions
    'directions.1': [
      'जरा ऐका, मेट्रो स्टेशन कुठे आहे?',
      'Jaraa aikaa, metro station kuthe aahe?',
      { note: '“Jara aika” (just listen) is the polite way to stop a stranger.' },
    ],
    'directions.2': ['सरळ जा आणि उजवीकडे वळा.', 'Saral jaa aani ujvikade valaa.'],
    'directions.3': [
      'लांब आहे का?',
      'Laamb aahe kaa?',
      { note: '“Laamb” means far as well as long.' },
    ],
    'directions.4': [
      'नाही, जवळच आहे. चालत पाच मिनिटं.',
      'Naahi, javalach aahe. Chaalat paach minita.',
    ],
    'directions.5': ['बस स्टॉपजवळ आहे का?', 'Bus stop-javal aahe kaa?'],
    'directions.6': ['हो, अगदी समोर.', 'Ho, agdi samor.'],
    'directions.7': ['धन्यवाद!', 'Dhanyavaad!'],
    'directions.x1': ['टॉयलेट कुठे आहे?', 'Toilet kuthe aahe?'],
    'directions.x2': ['मला रस्ता माहीत नाही.', 'Mala rastaa maahit naahi.'],
    'directions.x3': ['तिकडे कोणती बस जाते?', 'Tikde konti bus jaate?'],

    // restaurant
    'restaurant.1': ['एक कॉफी आणि एक चहा द्या.', 'Ek coffee aani ek chahaa dyaa.'],
    'restaurant.2': ['खायला काही?', 'Khaaylaa kaahi?'],
    'restaurant.3': ['काय काय आहे?', 'Kaay kaay aahe?'],
    'restaurant.4': [
      'पोहे, मिसळ आणि वडापाव तयार आहेत.',
      'Pohe, misal aani vadaa-paav tayaar aahet.',
      {
        en: 'Poha, misal and vada pav are ready.',
        hi: 'पोहा, मिसल और वड़ा पाव तैयार हैं।',
        note: 'Pohe is flattened rice; misal is a spicy sprout curry eaten with pav.',
      },
    ],
    'restaurant.5': [
      'एक प्लेट मिसळ. जास्त तिखट नको.',
      'Ek plate misal. Jaast tikhat nako.',
      {
        en: 'One plate of misal. Not too spicy.',
        hi: 'एक प्लेट मिसल। ज़्यादा तीखा नहीं।',
        note: 'Misal comes with a fiery “tarri” gravy, so asking for less spice is common.',
      },
    ],
    'restaurant.6': ['बिल आणा ना.', 'Bill aanaa naa.'],
    'restaurant.7': ['नव्वद रुपये.', 'Navvad rupaye.'],
    'restaurant.x1': ['हे व्हेज आहे का?', 'He veg aahe kaa?'],
    'restaurant.x2': ['थोडं पाणी द्या ना.', 'Thoda paani dyaa naa.'],
    'restaurant.x3': ['पार्सल करून द्या.', 'Parcel karun dyaa.'],

    // doctor
    'doctor.1': ['काय त्रास होतोय?', 'Kaay traas hotoy?'],
    'doctor.2': ['मला ताप आहे आणि डोकं दुखतंय.', 'Mala taap aahe aani doka dukhtay.'],
    'doctor.3': ['कधीपासून?', 'Kadhi-paasun?'],
    'doctor.4': ['काल रात्रीपासून.', 'Kaal raatri-paasun.'],
    'doctor.5': [
      'ही गोळी दिवसातून दोनदा घ्या, जेवणानंतर.',
      'Hee goli divsaatun dondaa ghyaa, jevnaa-nantar.',
    ],
    'doctor.6': ['हे औषध आहे का?', 'He aushadh aahe kaa?'],
    'doctor.7': ['हो. सत्तर रुपये.', 'Ho. Sattar rupaye.'],
    'doctor.x1': ['माझं पोट दुखतंय.', 'Maajha pot dukhtay.'],
    'doctor.x2': ['मला खोकला आणि सर्दी आहे.', 'Mala khoklaa aani sardi aahe.'],
    'doctor.x3': ['जवळ कुठे हॉस्पिटल आहे का?', 'Javal kuthe hospital aahe kaa?'],

    // emergency
    'emergency.1': [
      'वाचवा! मदत करा!',
      'Vaachvaa! Madat karaa!',
      { note: 'Dial 112 for police, fire or ambulance anywhere in India.' },
    ],
    'emergency.2': ['काय झालं?', 'Kaay jhaala?'],
    'emergency.3': ['ॲक्सिडेंट झालाय. ॲम्ब्युलन्स बोलवा!', 'Accident jhaalaay. Ambulance bolvaa!'],
    'emergency.4': [
      'मी आत्ता फोन करतो. काळजी करू नका.',
      'Mee aatta phone karto. Kaalji karu nakaa.',
    ],
    'emergency.5': ['पोलीस स्टेशन कुठे आहे?', 'Police station kuthe aahe?'],
    'emergency.6': ['मेन रोडजवळ.', 'Main road-javal.'],
    'emergency.7': ['माझा फोन चोरीला गेला.', 'Maajhaa phone chorilaa gelaa.'],
    'emergency.x1': ['आग लागली आहे!', 'Aag laagli aahe!'],
    'emergency.x2': ['पोलिसांना बोलवा!', 'Polisaannaa bolvaa!'],
    'emergency.x3': ['मला लगेच डॉक्टर पाहिजे.', 'Mala lagech doctor paahije.'],

    // delivery
    'delivery.1': ['हॅलो, तुमची फूड ऑर्डर घेऊन आलोय.', 'Hello, tumchi food order gheun aaloy.'],
    'delivery.2': ['हॅलो. तुम्ही कुठे आहात?', 'Hello. Tumhi kuthe aahaat?'],
    'delivery.3': ['गेटजवळ. कितवा मजला?', 'Gate-javal. Kitvaa majlaa?'],
    'delivery.4': ['तिसरा मजला. वर या ना.', 'Tisraa majlaa. Var yaa naa.'],
    'delivery.5': ['लिफ्ट बंद आहे.', 'Lift band aahe.'],
    'delivery.6': ['बरं, थांबा. दोन मिनिटं.', 'Bara, thaambaa. Don minita.'],
    'delivery.x1': ['दारात ठेवा.', 'Daaraat thevaa.'],
    'delivery.x2': ['पोहोचल्यावर फोन करा.', 'Pohochlyaavar phone karaa.'],
    'delivery.x3': ['कोण बोलतंय?', 'Kon boltay?'],

    // festival
    'festival.1': [
      'सणाच्या शुभेच्छा! उद्या घरी या.',
      'Sanaachyaa shubhech-chhaa! Udyaa ghari yaa.',
      { note: '“Shubhechchha” means best wishes; put the festival’s name before it.' },
    ],
    'festival.2': ['धन्यवाद! तुम्हालाही शुभेच्छा.', 'Dhanyavaad! Tumhaalaahi shubhech-chhaa.'],
    'festival.3': [
      'आम्ही गोडधोड करतोय. एक वाजता जेवण आहे.',
      'Aamhi god-dhod kartoy. Ek vaajtaa jevan aahe.',
    ],
    'festival.4': ['छान! काही आणू का?', 'Chhaan! Kaahi aanu kaa?'],
    'festival.5': [
      'काही नको, फक्त घरच्यांना घेऊन या.',
      'Kaahi nako, phakt gharchyaannaa gheun yaa.',
    ],
    'festival.6': ['बस, बस! पोट भरलं.', 'Bas, bas! Pot bharla.'],
    'festival.x1': [
      'या सणाला काय म्हणतात?',
      'Yaa sanaalaa kaay mhantaat?',
      { note: 'The big ones here are Ganeshotsav, Gudi Padwa, Diwali and Makar Sankranti.' },
    ],
    'festival.x2': ['ही मिठाई एकदम मस्त आहे!', 'Hee mithaai ekdam mast aahe!'],

    // wedding
    'wedding.1': [
      'तुम्ही आलात! लग्नात तुमचं स्वागत आहे.',
      'Tumhi aalaat! Lagnaat tumcha swaagat aahe.',
    ],
    'wedding.2': ['अभिनंदन! नवरा-नवरी कुठे आहेत?', 'Abhinandan! Navraa-navri kuthe aahet?'],
    'wedding.3': ['स्टेजवर. जेवलात का?', 'Stage-var. Jevlaat kaa?'],
    'wedding.4': [
      'अजून नाही. आधी आहेर देईन.',
      'Ajun naahi. Aadhi aaher de-een.',
      { note: '“Aaher” is the gift given at a wedding.' },
    ],
    'wedding.5': ['चला, मग एकत्र जेवूया.', 'Chalaa, mag ekatra jevuyaa.'],
    'wedding.6': ['सजावट खूप सुंदर आहे!', 'Sajaavat khoop sundar aahe!'],
    'wedding.x1': [
      'तुम्हा दोघांना सुखी संसाराच्या शुभेच्छा!',
      'Tumhaa doghaannaa sukhi sansaaraachyaa shubhech-chhaa!',
    ],
    'wedding.x2': ['जेवण खूप छान होतं!', 'Jevan khoop chhaan hota!'],

    // cricket
    'cricket.1': ['कालची मॅच पाहिलीस का?', 'Kaalchi match paahilis kaa?'],
    'cricket.2': ['हो! काय शेवटची ओव्हर होती!', 'Ho! Kaay shevatchi over hoti!'],
    'cricket.3': ['तुझी टीम कोणती?', 'Tujhi team konti?'],
    'cricket.4': ['आतापासून, आपल्या शहराची टीम!', 'Aataa-paasun, aaplyaa shaharaachi team!'],
    'cricket.5': ['मग पुढची मॅच एकत्र बघूया.', 'Mag pudhchi match ekatra baghuyaa.'],
    'cricket.6': ['ठरलं! स्नॅक्स माझ्याकडून.', 'Tharla! Snacks maajhyaakadun.'],
    'cricket.x1': ['स्कोअर किती झाला?', 'Score kiti jhaalaa?'],
    'cricket.x2': ['काय शॉट मारलाय!', 'Kaay shot maarlaay!'],

    // movies
    'movies.1': [
      'नवीन पिक्चर आलाय. रविवारी जायचं का?',
      'Naveen picture aalaay. Ravivaari jaaycha kaa?',
      { note: 'People usually say “picture” for a movie.' },
    ],
    'movies.2': ['हो! हिरो कोण आहे?', 'Ho! Hero kon aahe?'],
    'movies.3': [
      'मोठा स्टार आहे. सगळे म्हणतायत एकदम भारी आहे.',
      'Mothaa star aahe. Sagle mhantaayat ekdam bhaari aahe.',
      { note: '“Bhaari” is everyday slang for awesome.' },
    ],
    'movies.4': ['सबटायटल असलेला शो आहे का?', 'Subtitle aslelaa show aahe kaa?'],
    'movies.5': ['हो, संध्याकाळी सहाचा शो.', 'Ho, sandhyaakaali sahaachaa show.'],
    'movies.6': [
      'दोन तिकिटं बुक कर. पॉपकॉर्न माझ्याकडून!',
      'Don tikita book kar. Popcorn maajhyaakadun!',
    ],
    'movies.x1': ['पिक्चर एकदम भारी होता!', 'Picture ekdam bhaari hotaa!'],
    'movies.x2': ['मला शेवट कळला नाही.', 'Mala shevat kallaa naahi.'],

    // teacher
    'teacher.1': [
      'नमस्कार मॅडम. माझं मूल तिसरीत आहे.',
      'Namaskaar madam. Maajha mool tisrit aahe.',
      { note: '“Tisrit” is short for “in the third standard”.' },
    ],
    'teacher.2': ['नमस्कार. इथे शाळेत आवडतंय ना?', 'Namaskaar. Ithe shaalet aavadtay naa?'],
    'teacher.3': ['हो, पण भाषा नवीन आहे.', 'Ho, pan bhaashaa naveen aahe.'],
    'teacher.4': ['काळजी करू नका, मुलं लवकर शिकतात.', 'Kaalji karu nakaa, mula lavkar shiktaat.'],
    'teacher.5': ['शाळा किती वाजता सुटते?', 'Shaalaa kiti vaajtaa sutte?'],
    'teacher.6': ['साडेतीन वाजता.', 'Saade-teen vaajtaa.'],
    'teacher.x1': ['आज होमवर्क आहे का?', 'Aaj homework aahe kaa?'],
    'teacher.x2': ['आज माझ्या मुलाला बरं नाही.', 'Aaj maajhyaa mulaalaa bara naahi.'],
    'teacher.x3': ['पेरेंट्स मीटिंग कधी आहे?', 'Parents meeting kadhi aahe?'],

    // parents
    'parents.1': ['तुमचं मूल या वर्गात नवीन आहे का?', 'Tumcha mool yaa vargaat naveen aahe kaa?'],
    'parents.2': ['हो, आम्ही दुसऱ्या शहरातून आलो.', 'Ho, aamhi dusryaa shaharaatun aalo.'],
    'parents.3': ['माझी मुलगी पण याच वर्गात आहे.', 'Maajhi mulgi pan yaach vargaat aahe.'],
    'parents.4': ['अरे वा! शाळा चांगली आहे का?', 'Are vaa! Shaalaa chaangli aahe kaa?'],
    'parents.5': [
      'खूप छान. रविवारी बागेत या, मुलं एकत्र खेळतील.',
      'Khoop chhaan. Ravivaari baaget yaa, mula ekatra kheltil.',
      { note: '“Baag” is the everyday word for a park or garden.' },
    ],
    'parents.6': ['नक्की! एकमेकांचे नंबर घेऊया.', 'Nakki! Ekmekaanche number gheuyaa.'],
    'parents.x1': ['स्कूल बस किती वाजता येते?', 'School bus kiti vaajtaa yete?'],
    'parents.x2': ['युनिफॉर्मचं दुकान कुठे आहे?', 'Uniform-cha dukaan kuthe aahe?'],

    // bank
    'bank.1': ['मला सेव्हिंग्ज खातं उघडायचं आहे.', 'Mala savings khaata ughadaaycha aahe.'],
    'bank.2': ['आधार आणि पॅन कार्ड आहे का?', 'Aadhaar aani PAN card aahe kaa?'],
    'bank.3': ['हो, दोन्ही आहेत.', 'Ho, donhi aahet.'],
    'bank.4': ['हा फॉर्म भरा आणि इथे सही करा.', 'Haa form bharaa aani ithe sahi karaa.'],
    'bank.5': ['डेबिट कार्ड कधी मिळेल?', 'Debit card kadhi milel?'],
    'bank.6': ['एका आठवड्यात, पोस्टाने.', 'Ekaa aathvadyaat, postaane.'],
    'bank.x1': ['मला पैसे काढायचे आहेत.', 'Mala paise kaadhaayche aahet.'],
    'bank.x2': ['एटीएम चालू आहे का?', 'ATM chaalu aahe kaa?'],

    // govtOffice
    'govtOffice.1': [
      'नमस्कार, पत्ता बदलण्यासाठी अर्ज कुठे करायचा?',
      'Namaskaar, pattaa badalnyaa-saathi arj kuthe karaaychaa?',
    ],
    'govtOffice.2': ['काउंटर पाच. आधी टोकन घ्या.', 'Counter paach. Aadhi token ghyaa.'],
    'govtOffice.3': ['कोणती कागदपत्रं लागतील?', 'Konti kaagadpatra laagtil?'],
    'govtOffice.4': [
      'रेंट ॲग्रीमेंट आणि आधारची झेरॉक्स.',
      'Rent agreement aani aadhaar-chi xerox.',
      { note: 'Say “xerox” for a photocopy; rent agreements here are called “leave and licence”.' },
    ],
    'govtOffice.5': ['हे घ्या. कधीपर्यंत होईल?', 'He ghyaa. Kadhi-paryant hoil?'],
    'govtOffice.6': ['दहा दिवसांनी या.', 'Dahaa divsaanni yaa.'],
    'govtOffice.x1': [
      'पावती द्या ना.',
      'Paavti dyaa naa.',
      { note: '“Paavti” is a receipt; always ask for one at offices.' },
    ],
    'govtOffice.x2': ['रांग कुठे आहे?', 'Raang kuthe aahe?'],
    'govtOffice.x3': ['ऑफिस कधी उघडतं?', 'Office kadhi ughadta?'],

    // newFriends
    'newFriends.1': ['हाय! ही सीट रिकामी आहे का?', 'Hi! Hee seat rikaami aahe kaa?'],
    'newFriends.2': [
      'हो, बसा ना! तुम्ही इथे नवीन आहात का?',
      'Ho, basaa naa! Tumhi ithe naveen aahaat kaa?',
    ],
    'newFriends.3': ['हो. कामासाठी इथे यावं लागलं.', 'Ho. Kaamaa-saathi ithe yaava laagla.'],
    'newFriends.4': ['छान! शहर कसं वाटलं?', 'Chhaan! Shahar kasa vaatla?'],
    'newFriends.5': [
      'खूप आवडलं. जेवण तर एकदम भारी आहे!',
      'Khoop aavadla. Jevan tar ekdam bhaari aahe!',
    ],
    'newFriends.6': ['तुम्ही तर आत्ताच मराठी बोलताय!', 'Tumhi tar aattaach Marathi boltaay!'],
    'newFriends.7': ['थोडंसंच! अजून शिकवा ना.', 'Thodasach! Ajun shikvaa naa.'],
    'newFriends.x1': ['तुम्ही काय करता?', 'Tumhi kaay kartaa?'],
    'newFriends.x2': ['तुमचा नंबर मिळेल का?', 'Tumchaa number milel kaa?'],

    // weekend
    'weekend.1': ['या वीकेंडला काय प्लॅन?', 'Yaa weekend-laa kaay plan?'],
    'weekend.2': ['अजून काही नाही. काही आयडिया?', 'Ajun kaahi naahi. Kaahi idea?'],
    'weekend.3': ['रविवारी नाश्त्याला बाहेर जाऊया.', 'Ravivaari naashtyaalaa baaher jaauyaa.'],
    'weekend.4': ['भारी! कुठे भेटायचं?', 'Bhaari! Kuthe bhetaaycha?'],
    'weekend.5': ['मेट्रो स्टेशनला, आठ वाजता.', 'Metro station-laa, aath vaajtaa.'],
    'weekend.6': ['आठ म्हणजे खूप लवकर! नऊ?', 'Aath mhanje khoop lavkar! Nau?'],
    'weekend.7': ['बरं, नऊ. उशीर करू नकोस!', 'Bara, nau. Ushir karu nakos!'],
    'weekend.x1': [
      'मी रस्त्यात आहे.',
      'Mee rastyaat aahe.',
      { note: 'This avoids “nighaloy/nighaley” (I’ve left), which change with your gender.' },
    ],
    'weekend.x2': ['सॉरी, थोडा उशीर झाला.', 'Sorry, thodaa ushir jhaalaa.'],
  },
};
