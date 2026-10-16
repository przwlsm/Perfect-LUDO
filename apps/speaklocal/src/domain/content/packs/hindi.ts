import type { LanguagePack } from '../types';

/**
 * Hindi as spoken in Delhi: everyday colloquial Hindustani, the mix you hear in
 * markets, autos, offices and colonies, with the English words Delhi really uses
 * (left/right, meter, floor, veg, late, PTM). Polite lines use aap (often with the
 * Delhi "aap ... ho"), "-ji" and "bhaiya"; friends and peers get tum and "yaar".
 * First-person lines spoken by you avoid gendered verbs (no aaya/aayi, karta/karti).
 *
 * Romanisation: chat-style Hindi. aa, ee, oo for long vowels inside words; word-final
 * ई is written i as everyone types it (ji, bhi, paani); final ऊ stays oo (hoon, doon).
 * e/o for ए/ओ, ai/au for ऐ/औ. Nasal sounds are a plain n (haan, nahin, hain).
 * t/d cover both त/ट and द/ड; th, dh, kh, gh, bh, ph mark aspiration (theek, aath,
 * badhiya); ch for च, chh for छ (and च्छ: achha), chch for च्च (bachcha), sh for श/ष,
 * z for ज़, f for फ़. Silent final a is dropped (kitne ka hai). English loanwords keep
 * their English spelling (meter, floor, office).
 *
 * Needs native-speaker review before launch.
 */
export const HINDI: LanguagePack = {
  lang: 'hi',
  lines: {
    // greetings
    'greetings.1': [
      'नमस्ते जी! कैसे हैं आप?',
      'Namaste ji! Kaise hain aap?',
      {
        note: 'Add “ji” to names and replies (“haan ji”) to sound polite; Delhi uses it everywhere.',
      },
    ],
    'greetings.2': [
      'मैं ठीक हूँ, शुक्रिया। आप सुनाइए?',
      'Main theek hoon, shukriya. Aap sunaaiye?',
      {
        note: 'Use aap with elders and strangers, tum with friends; tu only with very close friends.',
      },
    ],
    'greetings.3': [
      'मैं भी ठीक हूँ। दिल्ली में पहली बार?',
      'Main bhi theek hoon. Dilli mein pehli baar?',
    ],
    'greetings.4': ['हाँ जी, मेरे लिए ये शहर नया है।', 'Haan ji, mere liye ye shehar naya hai.'],
    'greetings.5': [
      'कोई बात नहीं! दिल्ली में आपका स्वागत है।',
      'Koi baat nahin! Dilli mein aapka swaagat hai.',
    ],
    'greetings.6': ['बहुत-बहुत शुक्रिया। फिर मिलते हैं!', 'Bahut-bahut shukriya. Phir milte hain!'],
    'greetings.x1': ['सॉरी, समझ नहीं आया।', 'Sorry, samajh nahin aaya.'],
    'greetings.x2': ['एक बार फिर से बोलिए, थोड़ा धीरे।', 'Ek baar phir se boliye, thoda dheere.'],
    'greetings.x3': ['इसे यहाँ क्या बोलते हैं?', 'Ise yahaan kya bolte hain?'],

    // numbers
    'numbers.1': [
      'ये कितने का है?',
      'Ye kitne ka hai?',
      { note: '“Kitne ka?” (for how much?) is the everyday way to ask any price.' },
    ],
    'numbers.2': ['पचास रुपये।', 'Pachaas rupaye.'],
    'numbers.3': ['और ये दो?', 'Aur ye do?'],
    'numbers.4': ['दोनों के सौ रुपये।', 'Donon ke sau rupaye.'],
    'numbers.5': [
      'ये लो भैया, दो सौ। छुट्टा है?',
      'Ye lo bhaiya, do sau. Chhutta hai?',
      { note: '“Chhutta” is loose change; ask for it before paying with a big note.' },
    ],
    'numbers.6': ['हाँ, ये लो सौ वापस।', 'Haan, ye lo sau vaapas.'],
    'numbers.x1': ['एक, दो, तीन, चार, पाँच।', 'Ek, do, teen, chaar, paanch.'],
    'numbers.x2': ['छह, सात, आठ, नौ, दस।', 'Chhe, saat, aath, nau, das.'],
    'numbers.x3': [
      'यूपीआई चलेगा?',
      'UPI chalega?',
      { note: '“Chalega?” (will it do?) is how Delhi asks if a payment or plan is fine.' },
    ],

    // auto
    'auto.1': [
      'भैया, रेलवे स्टेशन चलोगे?',
      'Bhaiya, railway station chaloge?',
      {
        note: 'Call auto drivers and shopkeepers “bhaiya” (brother); it is friendly and respectful.',
      },
    ],
    'auto.2': ['हाँ जी, बैठिए। दो सौ लगेंगे।', 'Haan ji, baithiye. Do sau lagenge.'],
    'auto.3': [
      'भैया, मीटर से चलो ना।',
      'Bhaiya, meter se chalo na.',
      { note: 'Delhi autos often quote a fixed fare; asking for the meter is normal.' },
    ],
    'auto.4': ['मीटर से पचास ऊपर, सर।', 'Meter se pachaas upar, sir.'],
    'auto.5': [
      'ठीक है। सीधे चलो, फिर लेफ़्ट ले लेना।',
      'Theek hai. Seedhe chalo, phir left le lena.',
    ],
    'auto.6': ['बस भैया, यहीं रोक दो।', 'Bas bhaiya, yahin rok do.'],
    'auto.x1': ['भैया, थोड़ा धीरे चलाओ।', 'Bhaiya, thoda dheere chalaao.'],
    'auto.x2': ['कितना टाइम लगेगा?', 'Kitna time lagega?'],
    'auto.x3': ['यहाँ से राइट ले लो।', 'Yahaan se right le lo.'],

    // shopping
    'shopping.1': [
      'भैया, टमाटर कैसे दिए?',
      'Bhaiya, tamaatar kaise diye?',
      { note: '“Kaise diye?” (how are you selling them?) is the Delhi market way to ask a price.' },
    ],
    'shopping.2': ['साठ रुपये किलो।', 'Saath rupaye kilo.'],
    'shopping.3': [
      'बहुत महँगा है! पचास का लगा दो।',
      'Bahut mehenga hai! Pachaas ka laga do.',
      { note: '“Laga do” is the bargaining phrase: “pachaas ka laga do” means make it fifty.' },
    ],
    'shopping.4': ['पचपन लगेंगे, फ़ाइनल।', 'Pachpan lagenge, final.'],
    'shopping.5': [
      'ठीक है, एक किलो दे दो। और थोड़ा धनिया भी।',
      'Theek hai, ek kilo de do. Aur thoda dhaniya bhi.',
      { note: 'A little free dhaniya (coriander) with your vegetables is a Delhi market habit.' },
    ],
    'shopping.6': ['धनिया आपके लिए फ़्री!', 'Dhaniya aapke liye free!'],
    'shopping.x1': ['ताज़ा है ना?', 'Taaza hai na?'],
    'shopping.x2': ['आधा किलो दे दो।', 'Aadha kilo de do.'],
    'shopping.x3': ['वो वाला दिखाना।', 'Vo vaala dikhaana.'],

    // landlord
    'landlord.1': [
      'नमस्ते जी, ये मकान किराए पर है?',
      'Namaste ji, ye makaan kiraaye par hai?',
      { note: 'Landlords are often called “uncle-ji” or “aunty-ji” in Delhi.' },
    ],
    'landlord.2': [
      'हाँ जी। दो बेडरूम हैं। किराया बीस हज़ार है।',
      'Haan ji. Do bedroom hain. Kiraaya bees hazaar hai.',
    ],
    'landlord.3': ['एडवांस कितना देना होगा?', 'Advance kitna dena hoga?'],
    'landlord.4': ['तीन महीने का किराया।', 'Teen maheene ka kiraaya.'],
    'landlord.5': ['पानी पूरे दिन आता है?', 'Paani poore din aata hai?'],
    'landlord.6': ['हाँ, और पार्किंग भी है।', 'Haan, aur parking bhi hai.'],
    'landlord.7': ['एक बार घर देख सकते हैं?', 'Ek baar ghar dekh sakte hain?'],
    'landlord.x1': ['नल टपक रहा है।', 'Nal tapak raha hai.'],
    'landlord.x2': ['किराया कब तक देना है?', 'Kiraaya kab tak dena hai?'],
    'landlord.x3': [
      'लाइट चली गई है।',
      'Light chali gayi hai.',
      { note: 'Delhi usually says “light chali gayi” for a power cut; “bijli” is understood too.' },
    ],

    // office
    'office.1': ['गुड मॉर्निंग! नाश्ता हो गया?', 'Good morning! Naashta ho gaya?'],
    'office.2': ['हाँ, हो गया। और तुम्हारा?', 'Haan, ho gaya. Aur tumhaara?'],
    'office.3': ['हो गया। आज काम बहुत है क्या?', 'Ho gaya. Aaj kaam bahut hai kya?'],
    'office.4': [
      'हाँ यार, ग्यारह बजे मीटिंग है।',
      'Haan yaar, gyaarah baje meeting hai.',
      { note: '“Yaar” (mate) is fine with peers, not with your boss or elders.' },
    ],
    'office.5': ['चार बजे चाय पीने चलते हैं।', 'Chaar baje chai peene chalte hain.'],
    'office.6': ['पक्का, तब मिलते हैं।', 'Pakka, tab milte hain.'],
    'office.x1': ['चलो, बाय! कल मिलते हैं।', 'Chalo, bye! Kal milte hain.'],
    'office.x2': [
      'आप कहाँ से हो?',
      'Aap kahaan se ho?',
      { note: 'Delhi often pairs aap with “ho” (aap kahaan se ho?): polite but relaxed.' },
    ],
    'office.x3': ['वीकेंड पे क्या प्लान है?', 'Weekend pe kya plan hai?'],

    // neighbours
    'neighbours.1': [
      'बगल वाले घर में नई फ़ैमिली आई है ना?',
      'Bagal vaale ghar mein nayi family aayi hai na?',
    ],
    'neighbours.2': [
      'हाँ जी, हम पिछले हफ़्ते ही शिफ़्ट हुए हैं।',
      'Haan ji, hum pichhle hafte hi shift hue hain.',
    ],
    'neighbours.3': [
      'स्वागत है जी! कुछ भी चाहिए तो बता देना।',
      'Swaagat hai ji! Kuchh bhi chaahiye to bata dena.',
    ],
    'neighbours.4': [
      'शुक्रिया। कूड़े वाला कब आता है?',
      'Shukriya. Koode vaala kab aata hai?',
      { note: 'The garbage collector is just the “kooda wala”; many colonies pay him monthly.' },
    ],
    'neighbours.5': ['रोज़ सुबह सात बजे।', 'Roz subah saat baje.'],
    'neighbours.6': ['थैंक यू! कभी चाय पर घर आइए।', 'Thank you! Kabhi chai par ghar aaiye.'],
    'neighbours.x1': ['आज दूध का पैकेट नहीं आया।', 'Aaj doodh ka packet nahin aaya.'],
    'neighbours.x2': ['पास में कोई दुकान है?', 'Paas mein koi dukaan hai?'],

    // directions
    'directions.1': [
      'सुनिए भैया, मेट्रो स्टेशन किधर है?',
      'Suniye bhaiya, metro station kidhar hai?',
      { note: 'Delhi says “kidhar” as often as “kahaan” for where; “suniye” is excuse me.' },
    ],
    'directions.2': ['सीधे जाओ और राइट ले लेना।', 'Seedhe jaao aur right le lena.'],
    'directions.3': ['ज़्यादा दूर तो नहीं?', 'Zyaada door to nahin?'],
    'directions.4': [
      'नहीं, पास में ही है। पाँच मिनट पैदल।',
      'Nahin, paas mein hi hai. Paanch minute paidal.',
    ],
    'directions.5': ['बस स्टॉप के पास है?', 'Bus stop ke paas hai?'],
    'directions.6': ['हाँ, बिल्कुल सामने।', 'Haan, bilkul saamne.'],
    'directions.7': ['बहुत शुक्रिया!', 'Bahut shukriya!'],
    'directions.x1': ['वॉशरूम किधर है?', 'Washroom kidhar hai?'],
    'directions.x2': ['मुझे रास्ता नहीं पता।', 'Mujhe raasta nahin pata.'],
    'directions.x3': ['वहाँ कौन सी बस जाती है?', 'Vahaan kaun si bus jaati hai?'],

    // restaurant (a Delhi dhaba / tea stall)
    'restaurant.1': ['भैया, एक कॉफ़ी और एक चाय देना।', 'Bhaiya, ek coffee aur ek chai dena.'],
    'restaurant.2': ['खाने में कुछ चाहिए?', 'Khaane mein kuchh chaahiye?'],
    'restaurant.3': ['क्या-क्या है?', 'Kya-kya hai?'],
    'restaurant.4': [
      'पराठे, छोले भटूरे और समोसे तैयार हैं।',
      'Paraathe, chhole bhature aur samose taiyaar hain.',
      {
        en: 'Parathas, chhole bhature and samosas are ready.',
        hi: 'पराठे, छोले भटूरे और समोसे तैयार हैं।',
        note: 'Chhole bhature (spicy chickpeas with puffed fried bread) is Delhi’s favourite breakfast.',
      },
    ],
    'restaurant.5': [
      'एक प्लेट छोले भटूरे। ज़्यादा तीखा नहीं।',
      'Ek plate chhole bhature. Zyaada teekha nahin.',
      {
        en: 'One plate of chhole bhature. Not too spicy.',
        hi: 'एक प्लेट छोले भटूरे। ज़्यादा तीखा नहीं।',
      },
    ],
    'restaurant.6': ['भैया, बिल ले आना।', 'Bhaiya, bill le aana.'],
    'restaurant.7': ['नब्बे रुपये।', 'Nabbe rupaye.'],
    'restaurant.x1': [
      'ये वेज है ना?',
      'Ye veg hai na?',
      { note: '“Veg” and “non-veg” are the everyday words; “shaakaahaari” sounds bookish.' },
    ],
    'restaurant.x2': ['थोड़ा पानी देना।', 'Thoda paani dena.'],
    'restaurant.x3': ['पैक कर दो।', 'Pack kar do.'],

    // doctor
    'doctor.1': ['क्या तकलीफ़ है?', 'Kya takleef hai?'],
    'doctor.2': ['बुखार है और सिर में दर्द है।', 'Bukhaar hai aur sir mein dard hai.'],
    'doctor.3': ['कब से?', 'Kab se?'],
    'doctor.4': ['कल रात से।', 'Kal raat se.'],
    'doctor.5': [
      'ये गोली दिन में दो बार, खाने के बाद लीजिए।',
      'Ye goli din mein do baar, khaane ke baad leejiye.',
    ],
    'doctor.6': ['भैया, ये दवाई है?', 'Bhaiya, ye davaai hai?'],
    'doctor.7': ['हाँ जी। सत्तर रुपये।', 'Haan ji. Sattar rupaye.'],
    'doctor.x1': ['पेट में दर्द है।', 'Pet mein dard hai.'],
    'doctor.x2': ['खाँसी-ज़ुकाम है।', 'Khaansi-zukaam hai.'],
    'doctor.x3': ['पास में कोई हॉस्पिटल है?', 'Paas mein koi hospital hai?'],

    // emergency
    'emergency.1': [
      'बचाओ! कोई मदद करो!',
      'Bachaao! Koi madad karo!',
      { note: 'Dial 112 for any emergency in India: police, fire or ambulance.' },
    ],
    'emergency.2': ['क्या हुआ?', 'Kya hua?'],
    'emergency.3': [
      'एक्सीडेंट हो गया है। एम्बुलेंस बुलाओ!',
      'Accident ho gaya hai. Ambulance bulaao!',
    ],
    'emergency.4': [
      'मैं अभी फ़ोन करता हूँ। घबराओ मत।',
      'Main abhi phone karta hoon. Ghabraao mat.',
    ],
    'emergency.5': [
      'थाना किधर है?',
      'Thaana kidhar hai?',
      { note: 'In everyday Delhi speech a police station is the “thaana”.' },
    ],
    'emergency.6': ['मेन रोड के पास।', 'Main road ke paas.'],
    'emergency.7': ['मेरा फ़ोन चोरी हो गया।', 'Mera phone chori ho gaya.'],
    'emergency.x1': ['आग लग गई!', 'Aag lag gayi!'],
    'emergency.x2': ['पुलिस बुलाओ!', 'Police bulaao!'],
    'emergency.x3': ['मुझे जल्दी डॉक्टर चाहिए।', 'Mujhe jaldi doctor chaahiye.'],

    // delivery
    'delivery.1': ['हैलो, आपका खाने का ऑर्डर आया है।', 'Hello, aapka khaane ka order aaya hai.'],
    'delivery.2': ['हाँ भैया, कहाँ हो?', 'Haan bhaiya, kahaan ho?'],
    'delivery.3': ['गेट पे खड़ा हूँ। कौन सा फ़्लोर?', 'Gate pe khada hoon. Kaun sa floor?'],
    'delivery.4': ['तीसरा फ़्लोर। ऊपर आ जाइए।', 'Teesra floor. Upar aa jaaiye.'],
    'delivery.5': ['लिफ़्ट नहीं चल रही।', 'Lift nahin chal rahi.'],
    'delivery.6': ['अच्छा, रुको। दो मिनट।', 'Achha, ruko. Do minute.'],
    'delivery.x1': ['दरवाज़े पे रख दो।', 'Darvaaze pe rakh do.'],
    'delivery.x2': ['पहुँच के फ़ोन कर देना।', 'Pahunch ke phone kar dena.'],
    'delivery.x3': ['कौन बोल रहा है?', 'Kaun bol raha hai?'],

    // festival
    'festival.1': [
      'त्योहार की बहुत-बहुत बधाई! कल घर आइए।',
      'Tyohaar ki bahut-bahut badhaai! Kal ghar aaiye.',
      {
        note: 'Delhi’s big ones: Diwali, Holi, Lohri, Eid and Gurpurab; say the name (“Happy Diwali!”).',
      },
    ],
    'festival.2': ['शुक्रिया! आपको भी बहुत-बहुत बधाई।', 'Shukriya! Aapko bhi bahut-bahut badhaai.'],
    'festival.3': [
      'हम मिठाई बना रहे हैं। एक बजे खाना है।',
      'Hum mithaai bana rahe hain. Ek baje khaana hai.',
    ],
    'festival.4': ['वाह! कुछ लाना है?', 'Vaah! Kuchh laana hai?'],
    'festival.5': [
      'कुछ नहीं, बस फ़ैमिली के साथ आ जाइए।',
      'Kuchh nahin, bas family ke saath aa jaaiye.',
    ],
    'festival.6': [
      'बस, बस! पेट भर गया।',
      'Bas, bas! Pet bhar gaya.',
      {
        note: 'Delhi hosts keep refilling your plate; “bas, bas” (enough) is the polite way to stop.',
      },
    ],
    'festival.x1': ['इस त्योहार को क्या कहते हैं?', 'Is tyohaar ko kya kehte hain?'],
    'festival.x2': ['ये मिठाई तो कमाल की है!', 'Ye mithaai to kamaal ki hai!'],

    // wedding
    'wedding.1': [
      'अरे, आइए आइए! शादी में स्वागत है।',
      'Arre, aaiye aaiye! Shaadi mein swaagat hai.',
    ],
    'wedding.2': ['बधाई हो! दूल्हा-दुल्हन कहाँ हैं?', 'Badhaai ho! Doolha-dulhan kahaan hain?'],
    'wedding.3': ['स्टेज पे हैं। खाना खाया?', 'Stage pe hain. Khaana khaaya?'],
    'wedding.4': [
      'अभी नहीं। पहले शगुन दे दूँ।',
      'Abhi nahin. Pehle shagun de doon.',
      {
        note: 'The usual Delhi wedding gift is “shagun”: cash in an envelope, ending in one (101, 501).',
      },
    ],
    'wedding.5': ['चलो, उसके बाद साथ में खाते हैं।', 'Chalo, uske baad saath mein khaate hain.'],
    'wedding.6': ['डेकोरेशन तो एकदम शानदार है!', 'Decoration to ekdam shaandaar hai!'],
    'wedding.x1': ['आप दोनों हमेशा खुश रहो!', 'Aap donon hamesha khush raho!'],
    'wedding.x2': ['खाना बहुत बढ़िया था!', 'Khaana bahut badhiya tha!'],

    // cricket
    'cricket.1': ['कल का मैच देखा?', 'Kal ka match dekha?'],
    'cricket.2': ['हाँ! क्या लास्ट ओवर था यार!', 'Haan! Kya last over tha yaar!'],
    'cricket.3': ['तुम्हारी टीम कौन सी है?', 'Tumhaari team kaun si hai?'],
    'cricket.4': ['अब से, अपनी दिल्ली की टीम!', 'Ab se, apni Dilli ki team!'],
    'cricket.5': ['तो अगला मैच साथ में देखते हैं।', 'To agla match saath mein dekhte hain.'],
    'cricket.6': ['डन! स्नैक्स मेरी तरफ़ से।', 'Done! Snacks meri taraf se.'],
    'cricket.x1': ['स्कोर क्या हुआ?', 'Score kya hua?'],
    'cricket.x2': ['क्या शॉट मारा है!', 'Kya shot maara hai!'],

    // movies
    'movies.1': [
      'नई पिक्चर आई है। संडे को चलें?',
      'Nayi picture aayi hai. Sunday ko chalen?',
      { note: 'Delhi often says “picture” for a film, and “Sunday” more than “ravivaar”.' },
    ],
    'movies.2': ['हाँ! हीरो कौन है?', 'Haan! Hero kaun hai?'],
    'movies.3': [
      'बड़ा स्टार है। सब बोल रहे हैं एकदम मस्त है।',
      'Bada star hai. Sab bol rahe hain ekdam mast hai.',
      { note: '“Mast” and “zabardast” are the everyday Delhi words for great.' },
    ],
    'movies.4': ['सबटाइटल वाला शो है?', 'Subtitle vaala show hai?'],
    'movies.5': ['हाँ, शाम छह बजे वाला शो।', 'Haan, shaam chhe baje vaala show.'],
    'movies.6': [
      'दो टिकट बुक कर लो। पॉपकॉर्न मेरी तरफ़ से!',
      'Do ticket book kar lo. Popcorn meri taraf se!',
    ],
    'movies.x1': ['पिक्चर ज़बरदस्त थी!', 'Picture zabardast thi!'],
    'movies.x2': ['मुझे एंड समझ नहीं आया।', 'Mujhe end samajh nahin aaya.'],

    // teacher
    'teacher.1': [
      'नमस्ते मैम। मेरा बच्चा तीसरी क्लास में है।',
      "Namaste ma'am. Mera bachcha teesri class mein hai.",
      { note: 'Teachers are “ma’am” or “sir” in Delhi schools; always use aap with them.' },
    ],
    'teacher.2': ['नमस्ते। बच्चा यहाँ खुश है?', 'Namaste. Bachcha yahaan khush hai?'],
    'teacher.3': ['हाँ जी, पर हिंदी अभी नई है।', 'Haan ji, par Hindi abhi nayi hai.'],
    'teacher.4': [
      'चिंता मत कीजिए, बच्चे जल्दी सीख जाते हैं।',
      'Chinta mat keejiye, bachche jaldi seekh jaate hain.',
    ],
    'teacher.5': ['स्कूल की छुट्टी कितने बजे होती है?', 'School ki chhutti kitne baje hoti hai?'],
    'teacher.6': ['साढ़े तीन बजे।', 'Saadhe teen baje.'],
    'teacher.x1': ['आज होमवर्क है?', 'Aaj homework hai?'],
    'teacher.x2': [
      'आज मेरे बच्चे की तबीयत ठीक नहीं है।',
      'Aaj mere bachche ki tabiyat theek nahin hai.',
    ],
    'teacher.x3': [
      'पीटीएम कब है?',
      'PTM kab hai?',
      { note: 'Delhi schools call the parents’ meeting the “PTM” (parent-teacher meeting).' },
    ],

    // parents
    'parents.1': ['आपका बच्चा इस क्लास में नया है?', 'Aapka bachcha is class mein naya hai?'],
    'parents.2': ['हाँ जी, हम दूसरे शहर से आए हैं।', 'Haan ji, hum doosre shehar se aaye hain.'],
    'parents.3': ['मेरी बेटी भी इसी क्लास में है।', 'Meri beti bhi isi class mein hai.'],
    'parents.4': ['अरे वाह! स्कूल अच्छा है?', 'Arre vaah! School achha hai?'],
    'parents.5': [
      'बहुत अच्छा। संडे को पार्क आइए, बच्चे साथ खेल लेंगे।',
      'Bahut achha. Sunday ko park aaiye, bachche saath khel lenge.',
    ],
    'parents.6': ['ज़रूर! नंबर एक्सचेंज कर लेते हैं।', 'Zaroor! Number exchange kar lete hain.'],
    'parents.x1': ['स्कूल बस कितने बजे आती है?', 'School bus kitne baje aati hai?'],
    'parents.x2': ['यूनिफ़ॉर्म की दुकान किधर है?', 'Uniform ki dukaan kidhar hai?'],

    // bank
    'bank.1': ['मुझे सेविंग्स अकाउंट खोलना है।', 'Mujhe savings account kholna hai.'],
    'bank.2': ['आधार और पैन कार्ड है?', 'Aadhaar aur PAN card hai?'],
    'bank.3': ['हाँ जी, दोनों हैं।', 'Haan ji, donon hain.'],
    'bank.4': ['ये फ़ॉर्म भरिए और यहाँ साइन कीजिए।', 'Ye form bhariye aur yahaan sign keejiye.'],
    'bank.5': ['डेबिट कार्ड कब तक मिलेगा?', 'Debit card kab tak milega?'],
    'bank.6': ['एक हफ़्ते में, पोस्ट से आ जाएगा।', 'Ek hafte mein, post se aa jaayega.'],
    'bank.x1': ['मुझे पैसे निकालने हैं।', 'Mujhe paise nikaalne hain.'],
    'bank.x2': ['एटीएम चल रहा है?', 'ATM chal raha hai?'],

    // government office
    'govtOffice.1': [
      'सुनिए, एड्रेस चेंज करवाने के लिए कहाँ अप्लाई करना है?',
      'Suniye, address change karvaane ke liye kahaan apply karna hai?',
    ],
    'govtOffice.2': [
      'काउंटर नंबर पाँच। पहले टोकन ले लो।',
      'Counter number paanch. Pehle token le lo.',
    ],
    'govtOffice.3': ['कौन-कौन से डॉक्यूमेंट चाहिए?', 'Kaun-kaun se document chaahiye?'],
    'govtOffice.4': ['रेंट एग्रीमेंट और आधार की कॉपी।', 'Rent agreement aur Aadhaar ki copy.'],
    'govtOffice.5': ['ये लीजिए। कब तक हो जाएगा?', 'Ye leejiye. Kab tak ho jaayega?'],
    'govtOffice.6': ['दस दिन बाद आना।', 'Das din baad aana.'],
    'govtOffice.x1': ['इसकी रसीद दे दीजिए।', 'Iski raseed de deejiye.'],
    'govtOffice.x2': ['लाइन कहाँ लगी है?', 'Line kahaan lagi hai?'],
    'govtOffice.x3': ['ऑफ़िस कितने बजे खुलता है?', 'Office kitne baje khulta hai?'],

    // new friends
    'newFriends.1': ['हाय! ये सीट खाली है?', 'Hi! Ye seat khaali hai?'],
    'newFriends.2': ['हाँ, बैठो! दिल्ली में पहली बार?', 'Haan, baitho! Dilli mein pehli baar?'],
    'newFriends.3': ['हाँ। काम के सिलसिले में आना हुआ।', 'Haan. Kaam ke silsile mein aana hua.'],
    'newFriends.4': ['बढ़िया! दिल्ली कैसी लगी?', 'Badhiya! Dilli kaisi lagi?'],
    'newFriends.5': ['बहुत अच्छी लगी। खाना तो कमाल है!', 'Bahut achhi lagi. Khaana to kamaal hai!'],
    'newFriends.6': ['तुम्हें तो अभी से हिंदी आ गई!', 'Tumhen to abhi se Hindi aa gayi!'],
    'newFriends.7': ['बस थोड़ी-सी! और सिखाओ ना।', 'Bas thodi-si! Aur sikhaao na.'],
    'newFriends.x1': ['किस फ़ील्ड में हो?', 'Kis field mein ho?'],
    'newFriends.x2': ['तुम्हारा नंबर मिलेगा?', 'Tumhaara number milega?'],

    // weekend
    'weekend.1': [
      'इस वीकेंड का क्या सीन है?',
      'Is weekend ka kya scene hai?',
      { note: '“Kya scene hai?” is Delhi slang among friends for “what’s the plan?”.' },
    ],
    'weekend.2': ['अभी तक कुछ नहीं। कोई आइडिया?', 'Abhi tak kuchh nahin. Koi idea?'],
    'weekend.3': [
      'संडे को नाश्ते के लिए बाहर चलते हैं।',
      'Sunday ko naashte ke liye baahar chalte hain.',
    ],
    'weekend.4': ['सही है! कहाँ मिलें?', 'Sahi hai! Kahaan milen?'],
    'weekend.5': ['मेट्रो स्टेशन पे, आठ बजे।', 'Metro station pe, aath baje.'],
    'weekend.6': ['आठ बहुत जल्दी है यार! नौ?', 'Aath bahut jaldi hai yaar! Nau?'],
    'weekend.7': ['ठीक है, नौ। लेट मत होना!', 'Theek hai, nau. Late mat hona!'],
    'weekend.x1': [
      'बस रास्ते में हूँ।',
      'Bas raaste mein hoon.',
      {
        note: 'Delhi classic: “bas raaste mein hoon” (on my way) sometimes means just leaving home.',
      },
    ],
    'weekend.x2': ['सॉरी यार, थोड़ी देर हो गई।', 'Sorry yaar, thodi der ho gayi.'],
  },
};
