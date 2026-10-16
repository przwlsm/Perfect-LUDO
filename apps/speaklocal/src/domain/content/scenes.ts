import type { LineTemplate, PackId, Register, Role, SceneId, SceneTemplate } from './types';

/** Shorthand for writing lines compactly below. */
function L(id: string, speaker: Role, en: string, hi: string, register?: Register): LineTemplate {
  return register ? { id, speaker, en, hi, register } : { id, speaker, en, hi };
}

function scene(
  id: SceneId,
  pack: PackId,
  icon: string,
  lines: readonly [Role, string, string, Register?][],
  extras: readonly [string, string, Register?][],
): SceneTemplate {
  return {
    id,
    pack,
    icon,
    lines: lines.map(([who, en, hi, reg], i) => L(`${id}.${i + 1}`, who, en, hi, reg)),
    extras: extras.map(([en, hi, reg], i) => L(`${id}.x${i + 1}`, 'you', en, hi, reg)),
  };
}

/**
 * Every scene, in the order the scenes list shows them. The lines avoid
 * first-person forms that change with the speaker's gender (Hindi and
 * Marathi verbs do), so one line works for every learner.
 */
export const SCENES: readonly SceneTemplate[] = [
  scene(
    'greetings',
    'core',
    'hand-left-outline',
    [
      ['neighbour', 'Hello! How are you?', 'नमस्ते! आप कैसे हैं?', 'polite'],
      ['you', 'I’m fine, thank you. And you?', 'मैं ठीक हूँ, धन्यवाद। और आप?', 'polite'],
      ['neighbour', 'I’m fine too. Are you new here?', 'मैं भी ठीक हूँ। आप यहाँ नए हैं?'],
      ['you', 'Yes, this city is new for me.', 'हाँ, मेरे लिए यह शहर नया है।'],
      ['neighbour', 'No problem! Welcome.', 'कोई बात नहीं! आपका स्वागत है।'],
      ['you', 'Thank you very much. See you later!', 'बहुत धन्यवाद। फिर मिलते हैं!'],
    ],
    [
      ['Sorry, I didn’t understand.', 'माफ़ कीजिए, मुझे समझ नहीं आया।'],
      ['Please say it again, slowly.', 'फिर से बोलिए, धीरे-धीरे।', 'polite'],
      ['What do you call this here?', 'इसे यहाँ क्या कहते हैं?'],
    ],
  ),
  scene(
    'numbers',
    'core',
    'cash-outline',
    [
      ['you', 'How much is this?', 'यह कितने का है?'],
      ['vendor', 'Fifty rupees.', 'पचास रुपये।'],
      ['you', 'And these two?', 'और ये दो?'],
      ['vendor', 'One hundred for both.', 'दोनों के सौ रुपये।'],
      ['you', 'Here’s two hundred. Do you have change?', 'ये लीजिए दो सौ। छुट्टा है?'],
      ['vendor', 'Yes, here’s one hundred back.', 'हाँ, ये लीजिए सौ वापस।'],
    ],
    [
      ['One, two, three, four, five.', 'एक, दो, तीन, चार, पाँच।'],
      ['Six, seven, eight, nine, ten.', 'छह, सात, आठ, नौ, दस।'],
      ['Can I pay by UPI?', 'यूपीआई से दे सकते हैं?'],
    ],
  ),
  scene(
    'auto',
    'core',
    'car-outline',
    [
      [
        'you',
        'Brother, will you come to the railway station?',
        'भैया, रेलवे स्टेशन चलोगे?',
        'casual',
      ],
      ['driver', 'Yes, get in. Two hundred rupees.', 'हाँ, बैठिए। दो सौ रुपये।'],
      ['you', 'Please go by the meter.', 'मीटर से चलिए।'],
      ['driver', 'Meter plus fifty, sir.', 'मीटर से पचास ज़्यादा, सर।'],
      ['you', 'Okay. Go straight, then turn left.', 'ठीक है। सीधे चलिए, फिर बाएँ मुड़िए।'],
      ['you', 'Stop here, please.', 'यहीं रोक दीजिए।'],
    ],
    [
      ['Go slowly, please.', 'धीरे चलिए।'],
      ['How long will it take?', 'कितना समय लगेगा?'],
      ['Turn right here.', 'यहाँ दाएँ मुड़िए।'],
    ],
  ),
  scene(
    'shopping',
    'core',
    'basket-outline',
    [
      ['you', 'How much are the tomatoes?', 'टमाटर कितने के हैं?'],
      ['vendor', 'Sixty rupees a kilo.', 'साठ रुपये किलो।'],
      ['you', 'That’s too much! Give it for fifty.', 'बहुत ज़्यादा है! पचास में दे दो।', 'casual'],
      ['vendor', 'Fifty-five, final price.', 'पचपन, आख़िरी दाम।'],
      [
        'you',
        'Okay, give me one kilo. And a little coriander.',
        'ठीक है, एक किलो दे दो। और थोड़ा धनिया।',
      ],
      ['vendor', 'Coriander is free for you!', 'धनिया आपके लिए मुफ़्त!'],
    ],
    [
      ['Is it fresh?', 'ताज़ा है?'],
      ['Give me half a kilo.', 'आधा किलो दीजिए।'],
      ['Show me that one.', 'वो वाला दिखाइए।'],
    ],
  ),
  scene(
    'landlord',
    'core',
    'home-outline',
    [
      ['you', 'Is this house for rent?', 'यह घर किराए पर है?', 'polite'],
      [
        'owner',
        'Yes. Two bedrooms. The rent is twenty thousand.',
        'हाँ। दो बेडरूम। किराया बीस हज़ार है।',
      ],
      ['you', 'How much is the advance?', 'एडवांस कितना है?'],
      ['owner', 'Three months’ rent.', 'तीन महीने का किराया।'],
      ['you', 'Does water come all day?', 'पानी पूरे दिन आता है?'],
      ['owner', 'Yes, and there is parking too.', 'हाँ, और पार्किंग भी है।'],
      ['you', 'Can we see the house?', 'घर देख सकते हैं?', 'polite'],
    ],
    [
      ['The tap is leaking.', 'नल टपक रहा है।'],
      ['When should I pay the rent?', 'किराया कब देना है?'],
      ['The power has gone.', 'बिजली चली गई है।'],
    ],
  ),
  scene(
    'office',
    'core',
    'briefcase-outline',
    [
      ['colleague', 'Good morning! Had breakfast?', 'गुड मॉर्निंग! नाश्ता हुआ?', 'casual'],
      ['you', 'Yes, done. What about you?', 'हाँ, हो गया। आपका?'],
      ['colleague', 'Done. Lots of work today?', 'हो गया। आज बहुत काम है?'],
      ['you', 'Yes, there’s a meeting at eleven.', 'हाँ, ग्यारह बजे मीटिंग है।'],
      ['colleague', 'Let’s go for tea at four.', 'चार बजे चाय पीने चलते हैं।'],
      ['you', 'Sure, see you then.', 'ज़रूर, तब मिलते हैं।'],
    ],
    [
      ['Okay, bye! See you tomorrow.', 'अच्छा, बाय! कल मिलते हैं।'],
      ['Where are you from?', 'आप कहाँ से हैं?'],
      ['What’s the plan for the weekend?', 'वीकेंड का क्या प्लान है?'],
    ],
  ),
  scene(
    'neighbours',
    'core',
    'people-outline',
    [
      ['neighbour', 'You’re new next door, right?', 'आप बगल में नए आए हैं, ना?'],
      ['you', 'Yes, we moved in last week.', 'हाँ, हम पिछले हफ़्ते आए।'],
      [
        'neighbour',
        'Welcome! If you need anything, just ask.',
        'स्वागत है! कुछ भी चाहिए तो बताइए।',
      ],
      ['you', 'Thank you. When does the garbage van come?', 'शुक्रिया। कचरे की गाड़ी कब आती है?'],
      ['neighbour', 'Every morning at seven.', 'रोज़ सुबह सात बजे।'],
      [
        'you',
        'Thanks! Please come home for tea sometime.',
        'धन्यवाद! कभी चाय पर घर आइए।',
        'polite',
      ],
    ],
    [
      ['The milk packet hasn’t come today.', 'आज दूध का पैकेट नहीं आया।'],
      ['Is there a shop nearby?', 'पास में कोई दुकान है?'],
    ],
  ),
  scene(
    'directions',
    'core',
    'navigate-outline',
    [
      ['you', 'Excuse me, where is the metro station?', 'सुनिए, मेट्रो स्टेशन कहाँ है?', 'polite'],
      ['passerby', 'Go straight and turn right.', 'सीधे जाइए और दाएँ मुड़िए।'],
      ['you', 'Is it far?', 'दूर है?'],
      ['passerby', 'No, it’s close. Five minutes on foot.', 'नहीं, पास में है। पाँच मिनट पैदल।'],
      ['you', 'Is it near the bus stop?', 'बस स्टॉप के पास है?'],
      ['passerby', 'Yes, right opposite.', 'हाँ, बिल्कुल सामने।'],
      ['you', 'Thank you!', 'धन्यवाद!'],
    ],
    [
      ['Where is the toilet?', 'टॉयलेट कहाँ है?'],
      ['I don’t know the way.', 'मुझे रास्ता नहीं पता।'],
      ['Which bus goes there?', 'वहाँ कौन सी बस जाती है?'],
    ],
  ),
  scene(
    'restaurant',
    'core',
    'cafe-outline',
    [
      ['you', 'One coffee and one tea, please.', 'एक कॉफ़ी और एक चाय दीजिए।'],
      ['waiter', 'Anything to eat?', 'खाने के लिए कुछ?'],
      ['you', 'What do you have?', 'क्या है?'],
      ['waiter', 'Idli, dosa and vada are ready.', 'इडली, डोसा और वड़ा तैयार है।'],
      ['you', 'One plate of idli. Not too spicy.', 'एक प्लेट इडली। ज़्यादा तीखा नहीं।'],
      ['you', 'The bill, please.', 'बिल दीजिए।'],
      ['waiter', 'Ninety rupees.', 'नब्बे रुपये।'],
    ],
    [
      ['Is it vegetarian?', 'यह शाकाहारी है?'],
      ['Some water, please.', 'थोड़ा पानी दीजिए।'],
      ['Pack it to take away, please.', 'पार्सल कर दीजिए।'],
    ],
  ),
  scene(
    'doctor',
    'core',
    'medkit-outline',
    [
      ['doctor', 'What’s the problem?', 'क्या तकलीफ़ है?'],
      ['you', 'I have a fever and a headache.', 'मुझे बुखार और सिरदर्द है।'],
      ['doctor', 'Since when?', 'कब से?'],
      ['you', 'Since last night.', 'कल रात से।'],
      [
        'doctor',
        'Take this tablet twice a day, after food.',
        'यह गोली दिन में दो बार, खाने के बाद लीजिए।',
      ],
      ['you', 'Do you have this medicine?', 'यह दवाई है?'],
      ['chemist', 'Yes. Seventy rupees.', 'हाँ। सत्तर रुपये।'],
    ],
    [
      ['I have a stomach ache.', 'मेरे पेट में दर्द है।'],
      ['I have a cough and a cold.', 'मुझे खाँसी और ज़ुकाम है।'],
      ['Is there a hospital nearby?', 'पास में अस्पताल है?'],
    ],
  ),
  scene(
    'emergency',
    'core',
    'alert-circle-outline',
    [
      ['you', 'Help! Please help!', 'बचाओ! मदद कीजिए!'],
      ['passerby', 'What happened?', 'क्या हुआ?'],
      [
        'you',
        'There’s been an accident. Call an ambulance!',
        'एक्सीडेंट हो गया है। एम्बुलेंस बुलाइए!',
      ],
      ['passerby', 'I’m calling now. Don’t worry.', 'मैं अभी फ़ोन करता हूँ। चिंता मत कीजिए।'],
      ['you', 'Where is the police station?', 'पुलिस स्टेशन कहाँ है?'],
      ['passerby', 'Near the main road.', 'मेन रोड के पास।'],
      ['you', 'My phone has been stolen.', 'मेरा फ़ोन चोरी हो गया है।'],
    ],
    [
      ['Fire!', 'आग लगी है!'],
      ['Call the police!', 'पुलिस को बुलाइए!'],
      ['I need a doctor urgently.', 'मुझे तुरंत डॉक्टर चाहिए।'],
    ],
  ),
  scene(
    'delivery',
    'core',
    'call-outline',
    [
      ['rider', 'Hello, I have your food order.', 'हैलो, आपका खाने का ऑर्डर है।'],
      ['you', 'Hello. Where are you?', 'हैलो। आप कहाँ हैं?'],
      ['rider', 'Near the gate. Which floor?', 'गेट के पास। कौन सी मंज़िल?'],
      ['you', 'Third floor. Please come up.', 'तीसरी मंज़िल। ऊपर आ जाइए।'],
      ['rider', 'The lift isn’t working.', 'लिफ़्ट नहीं चल रही।'],
      ['you', 'Okay, wait. Two minutes.', 'ठीक है, रुकिए। दो मिनट।'],
    ],
    [
      ['Leave it at the door.', 'दरवाज़े पर रख दीजिए।'],
      ['Please call when you arrive.', 'पहुँचकर फ़ोन कीजिए।'],
      ['Who is speaking?', 'कौन बोल रहा है?'],
    ],
  ),

  // Bonus packs: Plus, or one pack for a day after a video the learner chose to watch.
  scene(
    'festival',
    'festivals',
    'sparkles-outline',
    [
      ['neighbour', 'Happy festival! Come home tomorrow.', 'त्योहार की शुभकामनाएँ! कल घर आइए।'],
      ['you', 'Thank you! Happy festival to you too.', 'धन्यवाद! आपको भी शुभकामनाएँ।'],
      [
        'neighbour',
        'We’re making sweets. Lunch is at one.',
        'हम मिठाई बना रहे हैं। एक बजे खाना है।',
      ],
      ['you', 'Lovely! Should I bring anything?', 'बढ़िया! कुछ लाना है?'],
      ['neighbour', 'Nothing, just come with your family.', 'कुछ नहीं, बस परिवार के साथ आइए।'],
      ['you', 'Enough, enough! I’m full.', 'बस, बस! पेट भर गया।'],
    ],
    [
      ['What is this festival called?', 'इस त्योहार को क्या कहते हैं?'],
      ['This sweet is lovely!', 'यह मिठाई बहुत अच्छी है!'],
    ],
  ),
  scene(
    'wedding',
    'festivals',
    'heart-outline',
    [
      ['friend', 'You came! Welcome to the wedding.', 'आप आ गए! शादी में आपका स्वागत है।'],
      [
        'you',
        'Congratulations! Where are the bride and groom?',
        'बधाई हो! दूल्हा-दुल्हन कहाँ हैं?',
      ],
      ['friend', 'On the stage. Have you eaten?', 'स्टेज पर हैं। खाना खाया?'],
      ['you', 'Not yet. Let me give the gift first.', 'अभी नहीं। पहले तोहफ़ा दे दूँ।'],
      ['friend', 'Come, let’s eat together after that.', 'आइए, उसके बाद साथ में खाते हैं।'],
      ['you', 'The decorations are beautiful!', 'सजावट बहुत सुंदर है!'],
    ],
    [
      ['Wishing you both a happy life!', 'आप दोनों की ज़िंदगी खुशहाल रहे!'],
      ['The food was delicious!', 'खाना बहुत स्वादिष्ट था!'],
    ],
  ),
  scene(
    'cricket',
    'cricketMovies',
    'trophy-outline',
    [
      ['colleague', 'Did you see yesterday’s match?', 'कल का मैच देखा?', 'casual'],
      ['you', 'Yes! What a last over!', 'हाँ! क्या आख़िरी ओवर था!'],
      ['colleague', 'Which team do you support?', 'आप किस टीम को सपोर्ट करते हैं?'],
      ['you', 'From now on, our city’s team!', 'अब से, अपने शहर की टीम!'],
      ['colleague', 'Then let’s watch the next match together.', 'तो अगला मैच साथ में देखते हैं।'],
      ['you', 'Done! Snacks are on me.', 'पक्का! स्नैक्स मेरी तरफ़ से।'],
    ],
    [
      ['What’s the score?', 'स्कोर क्या है?'],
      ['What a shot!', 'क्या शॉट है!'],
    ],
  ),
  scene(
    'movies',
    'cricketMovies',
    'film-outline',
    [
      [
        'friend',
        'A new movie is out. Shall we go on Sunday?',
        'नई फ़िल्म आई है। रविवार को चलें?',
        'casual',
      ],
      ['you', 'Yes! Who is the hero?', 'हाँ! हीरो कौन है?'],
      [
        'friend',
        'A big star. Everyone says it’s superb.',
        'बड़ा स्टार है। सब कह रहे हैं ज़बरदस्त है।',
      ],
      ['you', 'Is there a show with subtitles?', 'सबटाइटल वाला शो है?'],
      ['friend', 'Yes, the evening show at six.', 'हाँ, शाम छह बजे का शो।'],
      ['you', 'Book two tickets. Popcorn is on me!', 'दो टिकट बुक करो। पॉपकॉर्न मेरी तरफ़ से!'],
    ],
    [
      ['The movie was superb!', 'फ़िल्म ज़बरदस्त थी!'],
      ['I didn’t understand the ending.', 'मुझे अंत समझ नहीं आया।'],
    ],
  ),
  scene(
    'teacher',
    'school',
    'school-outline',
    [
      [
        'you',
        'Good morning, ma’am. My child is in class three.',
        'नमस्ते मैडम। मेरा बच्चा तीसरी कक्षा में है।',
        'polite',
      ],
      ['teacher', 'Good morning. Is the child happy here?', 'नमस्ते। बच्चा यहाँ खुश है?'],
      ['you', 'Yes, but the language is new.', 'हाँ, पर भाषा नई है।'],
      ['teacher', 'Don’t worry, children learn fast.', 'चिंता मत कीजिए, बच्चे जल्दी सीखते हैं।'],
      ['you', 'What time does school finish?', 'स्कूल की छुट्टी कितने बजे होती है?'],
      ['teacher', 'At half past three.', 'साढ़े तीन बजे।'],
    ],
    [
      ['Is there homework today?', 'आज होमवर्क है?'],
      ['My child is unwell today.', 'आज मेरा बच्चा बीमार है।'],
      ['When is the parents’ meeting?', 'पेरेंट्स मीटिंग कब है?'],
    ],
  ),
  scene(
    'parents',
    'school',
    'happy-outline',
    [
      ['parent', 'Is your child new in this class?', 'आपका बच्चा इस क्लास में नया है?'],
      ['you', 'Yes, we came from another city.', 'हाँ, हम दूसरे शहर से आए हैं।'],
      ['parent', 'My daughter is in the same class.', 'मेरी बेटी भी इसी क्लास में है।'],
      ['you', 'Oh, nice! Is the school good?', 'अरे वाह! स्कूल अच्छा है?'],
      [
        'parent',
        'Very good. Come to the park on Sunday; the children can play.',
        'बहुत अच्छा। रविवार को पार्क आइए, बच्चे साथ खेलेंगे।',
      ],
      ['you', 'Sure! Let’s share phone numbers.', 'ज़रूर! फ़ोन नंबर ले लेते हैं।'],
    ],
    [
      ['What time does the school bus come?', 'स्कूल बस कितने बजे आती है?'],
      ['Where is the uniform shop?', 'यूनिफ़ॉर्म की दुकान कहाँ है?'],
    ],
  ),
  scene(
    'bank',
    'bankGov',
    'card-outline',
    [
      ['you', 'I want to open a savings account.', 'मुझे सेविंग्स खाता खोलना है।', 'polite'],
      ['clerk', 'Do you have Aadhaar and a PAN card?', 'आधार और पैन कार्ड है?'],
      ['you', 'Yes, I have both.', 'हाँ, दोनों हैं।'],
      ['clerk', 'Fill this form and sign here.', 'यह फ़ॉर्म भरिए और यहाँ साइन कीजिए।'],
      ['you', 'When will I get the debit card?', 'डेबिट कार्ड कब मिलेगा?'],
      ['clerk', 'In a week, by post.', 'एक हफ़्ते में, डाक से।'],
    ],
    [
      ['I want to withdraw money.', 'मुझे पैसे निकालने हैं।'],
      ['Is the ATM working?', 'एटीएम चल रहा है?'],
    ],
  ),
  scene(
    'govtOffice',
    'bankGov',
    'document-text-outline',
    [
      [
        'you',
        'Excuse me, where do I apply for a change of address?',
        'सुनिए, पता बदलवाने के लिए कहाँ आवेदन करना है?',
        'polite',
      ],
      ['clerk', 'Counter five. Take a token first.', 'काउंटर पाँच। पहले टोकन लीजिए।'],
      ['you', 'Which documents are needed?', 'कौन से कागज़ चाहिए?'],
      [
        'clerk',
        'The rent agreement and a copy of your Aadhaar.',
        'रेंट एग्रीमेंट और आधार की कॉपी।',
      ],
      ['you', 'Here they are. When will it be done?', 'ये लीजिए। कब तक हो जाएगा?'],
      ['clerk', 'Come back after ten days.', 'दस दिन बाद आइए।'],
    ],
    [
      ['Please give me a receipt.', 'रसीद दे दीजिए।'],
      ['Where is the queue?', 'लाइन कहाँ है?'],
      ['When does the office open?', 'ऑफ़िस कब खुलता है?'],
    ],
  ),
  scene(
    'newFriends',
    'friends',
    'chatbubbles-outline',
    [
      ['you', 'Hi! Is this seat free?', 'हाय! यह सीट खाली है?'],
      ['friend', 'Yes, sit! Are you new here?', 'हाँ, बैठिए! आप यहाँ नए हैं?'],
      ['you', 'Yes. Work brought me here.', 'हाँ। काम के लिए यहाँ आना हुआ।'],
      ['friend', 'Nice! How do you like the city?', 'बढ़िया! शहर कैसा लगा?'],
      ['you', 'I like it a lot. The food is great!', 'बहुत अच्छा लगा। खाना बढ़िया है!'],
      ['friend', 'You’re already speaking our language!', 'आप तो अभी से हमारी भाषा बोल रहे हैं!'],
      ['you', 'Just a little! Please teach me more.', 'बस थोड़ी-सी! और सिखाइए।'],
    ],
    [
      ['What do you do?', 'आप क्या करते हैं?'],
      ['Can I have your number?', 'आपका नंबर मिलेगा?'],
    ],
  ),
  scene(
    'weekend',
    'friends',
    'sunny-outline',
    [
      ['friend', 'What’s the plan this weekend?', 'इस वीकेंड का क्या प्लान है?', 'casual'],
      ['you', 'Nothing yet. Any ideas?', 'अभी कुछ नहीं। कोई आइडिया?'],
      ['friend', 'Let’s go out for breakfast on Sunday.', 'रविवार को नाश्ते के लिए बाहर चलते हैं।'],
      ['you', 'Great! Where shall we meet?', 'बढ़िया! कहाँ मिलें?'],
      ['friend', 'At the metro station, at eight.', 'मेट्रो स्टेशन पर, आठ बजे।'],
      ['you', 'Eight is too early! Nine?', 'आठ बहुत जल्दी है! नौ?'],
      ['friend', 'Okay, nine. Don’t be late!', 'ठीक है, नौ। देर मत करना!'],
    ],
    [
      ['I’m on my way.', 'मैं रास्ते में हूँ।'],
      ['Sorry, I’m a little late.', 'सॉरी, थोड़ी देर हो गई।'],
    ],
  ),
];

export const PACKS: readonly PackId[] = [
  'core',
  'festivals',
  'cricketMovies',
  'school',
  'bankGov',
  'friends',
];

export const BONUS_PACKS: readonly PackId[] = PACKS.filter((p) => p !== 'core');

const BY_ID = new Map(SCENES.map((s) => [s.id, s]));

export function sceneById(id: SceneId): SceneTemplate {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`Unknown scene ${id}`);
  return s;
}

export function isSceneId(v: unknown): v is SceneId {
  return typeof v === 'string' && BY_ID.has(v as SceneId);
}

export function scenesInPack(pack: PackId): readonly SceneTemplate[] {
  return SCENES.filter((s) => s.pack === pack);
}

/** Every line id in every scene: dialogue first, then extras. */
export function allLineTemplates(): readonly LineTemplate[] {
  return SCENES.flatMap((s) => [...s.lines, ...s.extras]);
}
