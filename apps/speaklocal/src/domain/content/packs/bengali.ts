import type { LanguagePack } from '../types';

/**
 * Bengali as spoken in Kolkata: colloquial cholito bhasha (bujhlam, korchhi,
 * gechhe), never the literary sadhu forms. Polite lines use apni (achhen,
 * korun, ashun); casual lines with friends and colleagues use tumi (kheyechho,
 * cholo). English words Kolkata really uses (meter, current, form fill-up,
 * weekend, plan) are kept, written in Bangla script.
 *
 * Romanisation: the way Bengalis type in chats. The inherent vowel is "o"
 * where it is said (Kemon, notun, dhonnobad) and dropped where it is silent.
 * Bengali has no spoken vowel length, so vowels stay single: a, i, u, e, o.
 * Aspirates take "h": kh, gh, chh (ছ), jh, th (ঠ/থ), dh (ঢ/ধ), bh; plain
 * t/d cover both dental and retroflex, as in chats. ড়/ঢ় are "r", ফ is "f",
 * শ/ষ/স are "sh" where said sh and "s" in clusters (aste, rasta), ক্ষ is
 * "kkh". Double consonants are written double (ekta, Achha, shottor). English
 * loanwords keep their English spelling (station, meter, phone), with a
 * hyphen before a Bangla ending (Meter-e, bill-ta). হ্যাঁ is "Hyan".
 *
 * Needs native-speaker review before launch.
 */
export const BENGALI: LanguagePack = {
  lang: 'bn',
  lines: {
    // greetings
    'greetings.1': [
      'নমস্কার! কেমন আছেন?',
      'Nomoshkar! Kemon achhen?',
      {
        note: 'Say nomoshkar with folded hands; “apni” (achhen) is the respectful you for elders and strangers.',
      },
    ],
    'greetings.2': ['ভালো আছি, ধন্যবাদ। আর আপনি?', 'Bhalo achhi, dhonnobad. Ar apni?'],
    'greetings.3': ['আমিও ভালো আছি। আপনি এখানে নতুন?', 'Amio bhalo achhi. Apni ekhane notun?'],
    'greetings.4': ['হ্যাঁ, এই শহরটা আমার কাছে নতুন।', 'Hyan, ei shohor-ta amar kachhe notun.'],
    'greetings.5': [
      'কোনো ব্যাপার না! পাড়ায় স্বাগত।',
      'Kono byapar na! Paray swagoto.',
      { note: '“Para” is your neighbourhood; Kolkata life revolves around it.' },
    ],
    'greetings.6': ['অনেক ধন্যবাদ। পরে দেখা হবে!', 'Onek dhonnobad. Pore dekha hobe!'],
    'greetings.x1': ['মাফ করবেন, বুঝতে পারলাম না।', 'Maf korben, bujhte parlam na.'],
    'greetings.x2': ['আর একবার বলবেন, একটু আস্তে?', 'Ar ekbar bolben, ektu aste?'],
    'greetings.x3': ['এটাকে এখানে কী বলে?', 'Eta-ke ekhane ki bole?'],

    // numbers
    'numbers.1': ['এটা কত?', 'Eta koto?'],
    'numbers.2': ['পঞ্চাশ টাকা।', 'Ponchash taka.'],
    'numbers.3': ['আর এই দুটো?', 'Ar ei duto?'],
    'numbers.4': ['দুটো মিলিয়ে একশো।', 'Duto miliye eksho.'],
    'numbers.5': [
      'এই নিন দুশো। খুচরো আছে?',
      'Ei nin dusho. Khuchro achhe?',
      {
        note: '“Khuchro” is small change; shopkeepers often ask for it, so keep small notes handy.',
      },
    ],
    'numbers.6': ['হ্যাঁ, এই নিন একশো ফেরত।', 'Hyan, ei nin eksho ferot.'],
    'numbers.x1': ['এক, দুই, তিন, চার, পাঁচ।', 'Ek, dui, tin, char, panch.'],
    'numbers.x2': ['ছয়, সাত, আট, নয়, দশ।', 'Chhoy, shat, at, noy, dosh.'],
    'numbers.x3': ['ইউপিআই-তে দেওয়া যাবে?', 'UPI-te deoa jabe?'],

    // auto
    'auto.1': [
      'দাদা, রেল স্টেশন যাবেন?',
      'Dada, rail station jaben?',
      { note: 'Call drivers “Dada” (elder brother); the big stations are Howrah and Sealdah.' },
    ],
    'auto.2': ['হ্যাঁ, উঠুন। দুশো টাকা।', 'Hyan, uthun. Dusho taka.'],
    'auto.3': [
      'মিটারে চলুন না।',
      'Meter-e cholun na.',
      { note: 'A “na” at the end of a request softens it, like “please”.' },
    ],
    'auto.4': ['মিটারের থেকে পঞ্চাশ বেশি, স্যার।', 'Meter-er theke ponchash beshi, sir.'],
    'auto.5': [
      'ঠিক আছে। সোজা চলুন, তারপর বাঁদিকে ঘুরবেন।',
      'Thik achhe. Shoja cholun, tarpor bandike ghurben.',
    ],
    'auto.6': ['এখানেই দাঁড়ান।', 'Ekhanei daran.'],
    'auto.x1': ['একটু আস্তে চালান।', 'Ektu aste chalan.'],
    'auto.x2': ['কতক্ষণ লাগবে?', 'Kotokkhon lagbe?'],
    'auto.x3': ['এখানে ডানদিকে ঘুরুন।', 'Ekhane dandike ghurun.'],

    // shopping
    'shopping.1': [
      'টমেটো কত করে?',
      'Tomato koto kore?',
      { note: '“Koto kore?” asks the rate per kilo or piece, the usual way to ask at the bazaar.' },
    ],
    'shopping.2': ['ষাট টাকা কিলো।', 'Shat taka kilo.'],
    'shopping.3': ['বড্ড বেশি! পঞ্চাশে দাও।', 'Boddo beshi! Ponchash-e dao.'],
    'shopping.4': ['পঞ্চান্ন, শেষ দাম।', 'Ponchanno, shesh dam.'],
    'shopping.5': [
      'ঠিক আছে, এক কিলো দাও। আর একটু ধনেপাতা।',
      'Thik achhe, ek kilo dao. Ar ektu dhonepata.',
    ],
    'shopping.6': ['ধনেপাতা আপনার জন্য ফ্রি!', 'Dhonepata apnar jonno free!'],
    'shopping.x1': ['টাটকা তো?', 'Tatka to?'],
    'shopping.x2': ['আধ কিলো দিন।', 'Adh kilo din.'],
    'shopping.x3': ['ওইটা দেখান তো।', 'Oi-ta dekhan to.'],

    // landlord
    'landlord.1': ['এই বাড়িটা কি ভাড়া দেওয়া হবে?', 'Ei bari-ta ki bhara deoa hobe?'],
    'landlord.2': [
      'হ্যাঁ। দুটো বেডরুম। ভাড়া কুড়ি হাজার।',
      'Hyan. Duto bedroom. Bhara kuri hajar.',
      { note: 'Kolkata says “kuri” for twenty; “bish” is understood too.' },
    ],
    'landlord.3': ['অ্যাডভান্স কত?', 'Advance koto?'],
    'landlord.4': ['তিন মাসের ভাড়া।', 'Tin mash-er bhara.'],
    'landlord.5': [
      'সারাদিন জল থাকে?',
      'Sharadin jol thake?',
      { note: 'Bengalis say “jol” for water, never “pani”.' },
    ],
    'landlord.6': ['হ্যাঁ, আর পার্কিংও আছে।', 'Hyan, ar parking-o achhe.'],
    'landlord.7': ['বাড়িটা একবার দেখা যাবে?', 'Bari-ta ekbar dekha jabe?'],
    'landlord.x1': ['কল থেকে জল পড়ছে।', 'Kol theke jol porchhe.'],
    'landlord.x2': ['ভাড়াটা কবে দিতে হবে?', 'Bhara-ta kobe dite hobe?'],
    'landlord.x3': [
      'কারেন্ট চলে গেছে।',
      'Current chole gechhe.',
      { note: 'A power cut is “current gechhe” in Kolkata, or “load-shedding”.' },
    ],

    // office
    'office.1': [
      'গুড মর্নিং! জলখাবার খেয়েছ?',
      'Good morning! Jolkhabar kheyechho?',
      { note: '“Jolkhabar” is breakfast; colleagues your age use tumi (kheyechho).' },
    ],
    'office.2': ['হ্যাঁ, খেয়েছি। তোমার?', 'Hyan, kheyechhi. Tomar?'],
    'office.3': ['আমারও হয়ে গেছে। আজ অনেক কাজ?', 'Amar-o hoye gechhe. Aj onek kaj?'],
    'office.4': ['হ্যাঁ, এগারোটায় একটা মিটিং আছে।', 'Hyan, egarotay ekta meeting achhe.'],
    'office.5': ['চারটেয় চা খেতে চলো।', 'Chartey cha khete cholo.'],
    'office.6': ['একদম, তখন দেখা হবে।', 'Ekdom, tokhon dekha hobe.'],
    'office.x1': ['আচ্ছা, বাই! কাল দেখা হবে।', 'Achha, bye! Kal dekha hobe.'],
    'office.x2': [
      'আপনার বাড়ি কোথায়?',
      'Apnar bari kothay?',
      { note: '“Bari kothay?” (where is your home?) is how Bengalis ask where you are from.' },
    ],
    'office.x3': ['উইকেন্ডে কী প্ল্যান?', 'Weekend-e ki plan?'],

    // neighbours
    'neighbours.1': [
      'আপনি পাশের ফ্ল্যাটে নতুন এসেছেন, তাই না?',
      'Apni pasher flat-e notun eshechhen, tai na?',
    ],
    'neighbours.2': ['হ্যাঁ, আমরা গত সপ্তাহে এসেছি।', 'Hyan, amra goto shoptahe eshechhi.'],
    'neighbours.3': ['স্বাগত! কিছু দরকার হলে বলবেন।', 'Swagoto! Kichhu dorkar hole bolben.'],
    'neighbours.4': ['ধন্যবাদ। ময়লার গাড়ি কখন আসে?', 'Dhonnobad. Moylar gari kokhon ashe?'],
    'neighbours.5': ['রোজ সকাল সাতটায়।', 'Roj shokal shattay.'],
    'neighbours.6': [
      'ধন্যবাদ! একদিন বাড়িতে চা খেতে আসুন।',
      'Dhonnobad! Ekdin barite cha khete ashun.',
    ],
    'neighbours.x1': ['আজ দুধের প্যাকেট আসেনি।', 'Aj dudher packet asheni.'],
    'neighbours.x2': ['কাছাকাছি কোনো দোকান আছে?', 'Kachhakachhi kono dokan achhe?'],

    // directions
    'directions.1': [
      'শুনছেন, মেট্রো স্টেশনটা কোথায়?',
      'Shunchhen, metro station-ta kothay?',
      { note: '“Shunchhen?” (are you listening?) is how you politely stop a stranger.' },
    ],
    'directions.2': ['সোজা গিয়ে ডানদিকে ঘুরবেন।', 'Shoja giye dandike ghurben.'],
    'directions.3': ['অনেক দূর?', 'Onek dur?'],
    'directions.4': ['না, কাছেই। হেঁটে পাঁচ মিনিট।', 'Na, kachhei. Hente panch minute.'],
    'directions.5': ['বাস স্টপের কাছে?', 'Bus stop-er kachhe?'],
    'directions.6': ['হ্যাঁ, ঠিক উল্টো দিকে।', 'Hyan, thik ulto dike.'],
    'directions.7': ['ধন্যবাদ!', 'Dhonnobad!'],
    'directions.x1': ['টয়লেট কোথায়?', 'Toilet kothay?'],
    'directions.x2': ['আমি রাস্তা চিনি না।', 'Ami rasta chini na.'],
    'directions.x3': ['ওখানে কোন বাস যায়?', 'Okhane kon bus jay?'],

    // restaurant
    'restaurant.1': ['একটা কফি আর একটা চা দিন।', 'Ekta coffee ar ekta cha din.'],
    'restaurant.2': ['খাবার কিছু দেব?', 'Khabar kichhu debo?'],
    'restaurant.3': ['কী কী আছে?', 'Ki ki achhe?'],
    'restaurant.4': [
      'কচুরি, ঘুগনি আর সিঙাড়া রেডি আছে।',
      'Kochuri, ghugni ar shingara ready achhe.',
      {
        en: 'Kochuri, ghugni and singara are ready.',
        hi: 'कचौड़ी, घुगनी और समोसा तैयार हैं।',
        note: 'Ghugni is a spiced dried-pea curry; singara is Kolkata’s samosa.',
      },
    ],
    'restaurant.5': [
      'এক প্লেট ঘুগনি। বেশি ঝাল দেবেন না।',
      'Ek plate ghugni. Beshi jhal deben na.',
      {
        en: 'One plate of ghugni. Not too spicy.',
        hi: 'एक प्लेट घुगनी। ज़्यादा तीखा नहीं।',
        note: '“Jhal” means spicy-hot; “mishti” means sweet.',
      },
    ],
    'restaurant.6': ['বিলটা দিন।', 'Bill-ta din.'],
    'restaurant.7': ['নব্বই টাকা।', 'Nobboi taka.'],
    'restaurant.x1': [
      'এটা কি নিরামিষ?',
      'Eta ki niramish?',
      { note: '“Niramish” is vegetarian, “amish” is not; fish turns up in many dishes, so ask.' },
    ],
    'restaurant.x2': ['একটু জল দিন।', 'Ektu jol din.'],
    'restaurant.x3': ['পার্সেল করে দিন।', 'Parcel kore din.'],

    // doctor
    'doctor.1': ['কী হয়েছে বলুন?', 'Ki hoyechhe bolun?'],
    'doctor.2': ['আমার জ্বর আর মাথাব্যথা হয়েছে।', 'Amar jor ar matha-byatha hoyechhe.'],
    'doctor.3': ['কবে থেকে?', 'Kobe theke?'],
    'doctor.4': ['কাল রাত থেকে।', 'Kal rat theke.'],
    'doctor.5': [
      'এই ট্যাবলেটটা দিনে দুবার, খাবার পরে খাবেন।',
      'Ei tablet-ta dine dubar, khabar pore khaben.',
      { note: 'Bengalis “eat” medicine and water too: “oshudh khaoa”, “jol khaoa”.' },
    ],
    'doctor.6': ['এই ওষুধটা আছে?', 'Ei oshudh-ta achhe?'],
    'doctor.7': ['হ্যাঁ। সত্তর টাকা।', 'Hyan. Shottor taka.'],
    'doctor.x1': ['আমার পেট ব্যথা করছে।', 'Amar pet byatha korchhe.'],
    'doctor.x2': ['আমার সর্দি-কাশি হয়েছে।', 'Amar shordi-kashi hoyechhe.'],
    'doctor.x3': ['কাছাকাছি কোনো হাসপাতাল আছে?', 'Kachhakachhi kono hashpatal achhe?'],

    // emergency
    'emergency.1': [
      'বাঁচাও! কেউ সাহায্য করুন!',
      'Bachao! Keu shahajjo korun!',
      { note: 'In any emergency anywhere in India, dial 112.' },
    ],
    'emergency.2': ['কী হয়েছে?', 'Ki hoyechhe?'],
    'emergency.3': [
      'অ্যাক্সিডেন্ট হয়েছে। অ্যাম্বুলেন্স ডাকুন!',
      'Accident hoyechhe. Ambulance dakun!',
    ],
    'emergency.4': [
      'এক্ষুনি ফোন করছি। চিন্তা করবেন না।',
      'Ekkhuni phone korchhi. Chinta korben na.',
    ],
    'emergency.5': [
      'থানা কোথায়?',
      'Thana kothay?',
      { note: 'A police station is a “thana”; everyone understands the word.' },
    ],
    'emergency.6': ['বড় রাস্তার কাছে।', 'Boro rastar kachhe.'],
    'emergency.7': ['আমার ফোন চুরি হয়ে গেছে।', 'Amar phone churi hoye gechhe.'],
    'emergency.x1': ['আগুন লেগেছে!', 'Agun legechhe!'],
    'emergency.x2': ['পুলিশ ডাকুন!', 'Police dakun!'],
    'emergency.x3': ['এক্ষুনি একজন ডাক্তার লাগবে।', 'Ekkhuni ekjon daktar lagbe.'],

    // delivery
    'delivery.1': ['হ্যালো, আপনার খাবারের অর্ডার এসেছে।', 'Hello, apnar khabarer order eshechhe.'],
    'delivery.2': ['হ্যালো। আপনি কোথায়?', 'Hello. Apni kothay?'],
    'delivery.3': ['গেটের কাছে। কোন তলা?', 'Gate-er kachhe. Kon tola?'],
    'delivery.4': [
      'থার্ড ফ্লোর। ওপরে চলে আসুন।',
      'Third floor. Opore chole ashun.',
      { note: 'Careful: “ek-tola” is the ground floor, so “tin-tola” means the second floor.' },
    ],
    'delivery.5': ['লিফট চলছে না।', 'Lift cholchhe na.'],
    'delivery.6': ['আচ্ছা, দাঁড়ান। দু মিনিট।', 'Achha, daran. Du minute.'],
    'delivery.x1': ['দরজার সামনে রেখে দিন।', 'Dorjar shamne rekhe din.'],
    'delivery.x2': ['পৌঁছে ফোন করবেন।', 'Pounchhe phone korben.'],
    'delivery.x3': ['কে বলছেন?', 'Ke bolchhen?'],

    // festival
    'festival.1': [
      'শুভ পুজো! কাল বাড়িতে আসুন।',
      'Shubho Pujo! Kal barite ashun.',
      {
        note: 'Durga Puja is Kolkata’s biggest festival: say “Shubho Pujo”, and “Shubho Bijoya” after it.',
      },
    ],
    'festival.2': ['ধন্যবাদ! আপনাকেও শুভ পুজো।', 'Dhonnobad! Apnakeo shubho Pujo.'],
    'festival.3': [
      'আমরা মিষ্টি বানাচ্ছি। দুপুরের খাওয়া একটায়।',
      'Amra mishti banachhi. Dupurer khaoa ektay.',
    ],
    'festival.4': ['দারুণ! কিছু নিয়ে আসব?', 'Darun! Kichhu niye ashbo?'],
    'festival.5': [
      'কিছু লাগবে না, শুধু বাড়ির সবাইকে নিয়ে আসুন।',
      'Kichhu lagbe na, shudhu barir shobai-ke niye ashun.',
    ],
    'festival.6': [
      'আর না, আর না! পেট ভরে গেছে।',
      'Ar na, ar na! Pet bhore gechhe.',
      { note: 'Bengali hosts keep serving; a firm “ar na” (no more) is expected and polite.' },
    ],
    'festival.x1': [
      'এই উৎসবটাকে কী বলে?',
      'Ei utshob-ta-ke ki bole?',
      {
        note: 'Other big days: Kali Puja (Diwali night), Poila Boishakh (new year), Saraswati Puja.',
      },
    ],
    'festival.x2': [
      'এই মিষ্টিটা দারুণ!',
      'Ei mishti-ta darun!',
      { note: 'Try rosogolla, sandesh and mishti doi; praising the sweets always pleases.' },
    ],

    // wedding
    'wedding.1': ['এসে গেছ! বিয়েতে স্বাগত।', 'Eshe gechho! Biyete swagoto.'],
    'wedding.2': [
      'অভিনন্দন! বর-বউ কোথায়?',
      'Obhinondon! Bor-bou kothay?',
      { note: '“Bor” is the groom and “bou” (or “kone”) the bride.' },
    ],
    'wedding.3': ['স্টেজে আছে। খেয়েছ?', 'Stage-e achhe. Kheyechho?'],
    'wedding.4': ['এখনও না। আগে গিফটটা দিয়ে আসি।', 'Ekhono na. Age gift-ta diye ashi.'],
    'wedding.5': ['এসো, তারপর একসঙ্গে খাব।', 'Esho, tarpor ekshonge khabo.'],
    'wedding.6': ['ডেকোরেশনটা খুব সুন্দর হয়েছে!', 'Decoration-ta khub shundor hoyechhe!'],
    'wedding.x1': ['আপনাদের দুজনের জীবন সুখের হোক!', 'Apnader dujoner jibon shukher hok!'],
    'wedding.x2': ['খাবারটা দারুণ ছিল!', 'Khabar-ta darun chhilo!'],

    // cricket
    'cricket.1': ['কালকের ম্যাচটা দেখেছ?', 'Kalker match-ta dekhechho?'],
    'cricket.2': ['হ্যাঁ! কী লাস্ট ওভার!', 'Hyan! Ki last over!'],
    'cricket.3': ['তুমি কোন টিমকে সাপোর্ট করো?', 'Tumi kon team-ke support koro?'],
    'cricket.4': [
      'এখন থেকে আমাদের শহরের টিম!',
      'Ekhon theke amader shohorer team!',
      {
        note: 'Kolkata’s IPL team is KKR; in football the city splits into Mohun Bagan and East Bengal.',
      },
    ],
    'cricket.5': ['তাহলে পরের ম্যাচটা একসঙ্গে দেখব।', 'Tahole porer match-ta ekshonge dekhbo.'],
    'cricket.6': ['পাক্কা! স্ন্যাকস আমার তরফ থেকে।', 'Pakka! Snacks amar torof theke.'],
    'cricket.x1': ['স্কোর কত?', 'Score koto?'],
    'cricket.x2': ['কী শট!', 'Ki shot!'],

    // movies
    'movies.1': ['নতুন সিনেমা এসেছে। রবিবার যাবে?', 'Notun cinema eshechhe. Robibar jabe?'],
    'movies.2': ['হ্যাঁ! হিরো কে?', 'Hyan! Hero ke?'],
    'movies.3': [
      'বড় স্টার। সবাই বলছে ফাটাফাটি।',
      'Boro star. Shobai bolchhe fatafati.',
      { note: '“Fatafati” is Kolkata slang for superb: films, food, anything.' },
    ],
    'movies.4': ['সাবটাইটেল দেওয়া শো আছে?', 'Subtitle deoa show achhe?'],
    'movies.5': ['হ্যাঁ, সন্ধে ছটার শো।', 'Hyan, shondhe chhotar show.'],
    'movies.6': [
      'দুটো টিকিট বুক করো। পপকর্ন আমার তরফ থেকে!',
      'Duto ticket book koro. Popcorn amar torof theke!',
    ],
    'movies.x1': ['সিনেমাটা ফাটাফাটি ছিল!', 'Cinema-ta fatafati chhilo!'],
    'movies.x2': ['শেষটা বুঝতে পারলাম না।', 'Shesh-ta bujhte parlam na.'],

    // teacher
    'teacher.1': [
      'নমস্কার ম্যাডাম। আমার বাচ্চা ক্লাস থ্রি-তে পড়ে।',
      'Nomoshkar madam. Amar bachcha class three-te pore.',
      { note: 'Children call teachers “Miss” or “Ma’am”; the Bengali word is “Didimoni”.' },
    ],
    'teacher.2': ['নমস্কার। বাচ্চা এখানে খুশি তো?', 'Nomoshkar. Bachcha ekhane khushi to?'],
    'teacher.3': ['হ্যাঁ, তবে ভাষাটা নতুন।', 'Hyan, tobe bhasha-ta notun.'],
    'teacher.4': [
      'চিন্তা করবেন না, বাচ্চারা তাড়াতাড়ি শেখে।',
      'Chinta korben na, bachcha-ra taratari shekhe.',
    ],
    'teacher.5': ['স্কুল কটায় ছুটি হয়?', 'School kotay chhuti hoy?'],
    'teacher.6': ['সাড়ে তিনটেয়।', 'Share tintey.'],
    'teacher.x1': ['আজ হোমওয়ার্ক আছে?', 'Aj homework achhe?'],
    'teacher.x2': ['আজ আমার বাচ্চার শরীর ভালো নেই।', 'Aj amar bachchar shorir bhalo nei.'],
    'teacher.x3': ['পেরেন্টস মিটিং কবে?', 'Parents meeting kobe?'],

    // parents
    'parents.1': ['আপনার বাচ্চা কি এই ক্লাসে নতুন?', 'Apnar bachcha ki ei class-e notun?'],
    'parents.2': ['হ্যাঁ, আমরা অন্য শহর থেকে এসেছি।', 'Hyan, amra onno shohor theke eshechhi.'],
    'parents.3': ['আমার মেয়েও এই ক্লাসেই পড়ে।', 'Amar meye-o ei class-ei pore.'],
    'parents.4': ['বাহ, দারুণ! স্কুলটা ভালো?', 'Bah, darun! School-ta bhalo?'],
    'parents.5': [
      'খুব ভালো। রবিবার পার্কে আসুন, বাচ্চারা একসঙ্গে খেলবে।',
      'Khub bhalo. Robibar park-e ashun, bachcha-ra ekshonge khelbe.',
    ],
    'parents.6': [
      'নিশ্চয়ই! ফোন নম্বরটা দেওয়া-নেওয়া করি।',
      'Nishchoi! Phone number-ta deoa-neoa kori.',
    ],
    'parents.x1': ['স্কুল বাস কটায় আসে?', 'School bus kotay ashe?'],
    'parents.x2': ['ইউনিফর্মের দোকান কোথায়?', 'Uniform-er dokan kothay?'],

    // bank
    'bank.1': ['আমি একটা সেভিংস অ্যাকাউন্ট খুলতে চাই।', 'Ami ekta savings account khulte chai.'],
    'bank.2': ['আধার আর প্যান কার্ড আছে?', 'Aadhaar ar PAN card achhe?'],
    'bank.3': ['হ্যাঁ, দুটোই আছে।', 'Hyan, dutoi achhe.'],
    'bank.4': [
      'এই ফর্মটা ফিল-আপ করে এখানে সই করুন।',
      'Ei form-ta fill-up kore ekhane shoi korun.',
      {
        note: 'To sign is “shoi kora”; Kolkata offices say “form fill-up kora” for filling a form.',
      },
    ],
    'bank.5': ['ডেবিট কার্ড কবে পাব?', 'Debit card kobe pabo?'],
    'bank.6': ['এক সপ্তাহের মধ্যে, পোস্টে আসবে।', 'Ek shoptaher moddhe, post-e ashbe.'],
    'bank.x1': ['আমি টাকা তুলতে চাই।', 'Ami taka tulte chai.'],
    'bank.x2': ['এটিএম চলছে?', 'ATM cholchhe?'],

    // govtOffice
    'govtOffice.1': [
      'শুনছেন, ঠিকানা বদলের জন্য কোথায় আবেদন করতে হবে?',
      'Shunchhen, thikana bodoler jonno kothay abedon korte hobe?',
    ],
    'govtOffice.2': ['পাঁচ নম্বর কাউন্টার। আগে টোকেন নিন।', 'Panch number counter. Age token nin.'],
    'govtOffice.3': ['কী কী কাগজ লাগবে?', 'Ki ki kagoj lagbe?'],
    'govtOffice.4': ['ভাড়ার এগ্রিমেন্ট আর আধারের কপি।', 'Bharar agreement ar Aadhaar-er copy.'],
    'govtOffice.5': ['এই নিন। কবে হয়ে যাবে?', 'Ei nin. Kobe hoye jabe?'],
    'govtOffice.6': ['দশ দিন পরে আসুন।', 'Dosh din pore ashun.'],
    'govtOffice.x1': ['একটা রসিদ দিন।', 'Ekta roshid din.'],
    'govtOffice.x2': ['লাইনটা কোথায়?', 'Line-ta kothay?'],
    'govtOffice.x3': ['অফিস কটায় খোলে?', 'Office kotay khole?'],

    // newFriends
    'newFriends.1': ['হাই! এই সিটটা কি খালি?', 'Hi! Ei seat-ta ki khali?'],
    'newFriends.2': ['হ্যাঁ, বসুন! আপনি এখানে নতুন?', 'Hyan, boshun! Apni ekhane notun?'],
    'newFriends.3': ['হ্যাঁ। কাজের জন্য এখানে এসেছি।', 'Hyan. Kajer jonno ekhane eshechhi.'],
    'newFriends.4': ['বাহ! শহরটা কেমন লাগছে?', 'Bah! Shohor-ta kemon lagchhe?'],
    'newFriends.5': [
      'খুব ভালো লাগছে। খাওয়াদাওয়া দারুণ!',
      'Khub bhalo lagchhe. Khaoa-daoa darun!',
    ],
    'newFriends.6': ['আপনি তো এখনই আমাদের ভাষা বলছেন!', 'Apni to ekhoni amader bhasha bolchhen!'],
    'newFriends.7': ['একটু-আধটু! আরও শিখিয়ে দিন।', 'Ektu-adhtu! Aro shikhiye din.'],
    'newFriends.x1': ['আপনি কী করেন?', 'Apni ki koren?'],
    'newFriends.x2': ['আপনার নম্বরটা পেতে পারি?', 'Apnar number-ta pete pari?'],

    // weekend
    'weekend.1': ['এই উইকেন্ডে কী প্ল্যান?', 'Ei weekend-e ki plan?'],
    'weekend.2': ['এখনও কিছু না। কোনো আইডিয়া?', 'Ekhono kichhu na. Kono idea?'],
    'weekend.3': ['রবিবার বাইরে ব্রেকফাস্ট করতে চলো।', 'Robibar baire breakfast korte cholo.'],
    'weekend.4': ['দারুণ! কোথায় দেখা করব?', 'Darun! Kothay dekha korbo?'],
    'weekend.5': ['মেট্রো স্টেশনে, আটটায়।', 'Metro station-e, attay.'],
    'weekend.6': ['আটটা খুব তাড়াতাড়ি! নটা?', 'Atta khub taratari! Nota?'],
    'weekend.7': ['ঠিক আছে, নটা। দেরি কোরো না!', 'Thik achhe, nota. Deri koro na!'],
    'weekend.x1': ['আমি রাস্তায় আছি।', 'Ami rastay achhi.'],
    'weekend.x2': ['সরি, একটু দেরি হয়ে গেল।', 'Sorry, ektu deri hoye gelo.'],
  },
};
