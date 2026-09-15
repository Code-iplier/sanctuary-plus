const EXPLICIT_UNKNOWN_OR_NONE = /^(?:no|none|nil|nothing|not applicable|n\/a|unknown|don't know|do not know|not sure|cannot remember|can't remember|not mentioned|not available|না|নেই|জানি না|কিছু নেই|नहीं|कुछ नहीं|पता नहीं|मालूम नहीं|ಇಲ್ಲ|ಗೊತ್ತಿಲ್ಲ|లేదు|తెలియదు|ಇಲ್ಲ|ಗೊತ್ತಿಲ್ಲ|नाही|माहित नाही|இல்லை|தெரியாது|இல்ல|తెలియదు|അറിയില്ല|ഇല്ല|ନାହିଁ|ଜାଣିନି|ਨਹੀਂ|ਪਤਾ ਨਹੀਂ|نہیں|معلوم نہیں)$/i;

const ONSET_PATTERNS = [
  /\b(?:since|for|from|started|starting|began|beginning)\b.{0,32}\b(?:today|yesterday|day before yesterday|last night|morning|evening|night|hour|hours|day|days|week|weeks|month|months|year|years|minute|minutes)\b/i,
  /\b(?:today|yesterday|day before yesterday|last night|this morning|since morning|since evening|since night)\b/i,
  /\b\d+(?:\.\d+)?\s*(?:minute|minutes|min|hour|hours|hr|day|days|week|weeks|month|months|year|years)\b/i,
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|couple of|few)\s+(?:minute|minutes|min|hour|hours|day|days|week|weeks|month|months|year|years)\b/i,
  /(?:গতকাল|আজ|পরশু|সকাল থেকে|গত রাত থেকে|দিন ধরে|দিন ধরে|সপ্তাহ ধরে|মাস ধরে|বছর ধরে|দিন আগে|সপ্তাহ আগে|মাস আগে)/i,
  /(?:कल से|आज से|परसों से|कल|आज|पिछली रात से|सुबह से|शाम से|रात से|दिन से|हफ्ते से|महीने से|साल से|दिन पहले|हफ्ते पहले|महीने पहले)/i,
  /(?:din se|dinon se|hafte se|hafton se|mahine se|mahino se|saal se|kal se|aaj se|parso se|pichle din se|subah se|raat se)/i,
  /(?:ನಿನ್ನೆ|ಇಂದು|ಮೊನ್ನೆಯಿಂದ|ದಿನಗಳಿಂದ|ವಾರಗಳಿಂದ|ತಿಂಗಳುಗಳಿಂದ|ವರ್ಷಗಳಿಂದ|ದಿನಗಳ ಹಿಂದೆ|ವಾರಗಳ ಹಿಂದೆ)/i,
  /(?:ನಿನ್ನೆ|ಇಂದು|ಮೊನ್ನೆಯಿಂದ|ದಿನಗಳಿಂದ|ವಾರಗಳಿಂದ|ತಿಂಗಳುಗಳಿಂದ|ವರ್ಷಗಳಿಂದ|ದಿನಗಳ ಹಿಂದೆ|ವಾರಗಳ ಹಿಂದೆ)/i,
  /(?:ഇന്നലെ|ഇന്ന്|മിനിറ്റ്|മണിക്കൂർ|ദിവസമായി|ആഴ്ചയായി|മാസമായി|വർഷമായി)/i,
  /(?:कालपासून|आजपासून|परवापासून|दिवसांपासून|आठवड्यांपासून|महिन्यांपासून|वर्षांपासून)/i,
  /(?:ଗତକାଲି|ଆଜି|ଦିନ ହେଲା|ସପ୍ତାହ ହେଲା|ମାସ ହେଲା|ବର୍ଷ ହେଲା)/i,
  /(?:ਕੱਲ੍ਹ ਤੋਂ|ਅੱਜ ਤੋਂ|ਪਰਸੋਂ ਤੋਂ|ਦਿਨਾਂ ਤੋਂ|ਹਫ਼ਤਿਆਂ ਤੋਂ|ਮਹੀਨਿਆਂ ਤੋਂ|ਸਾਲਾਂ ਤੋਂ)/i,
  /(?:நேற்று|இன்று|நாட்களாக|வாரங்களாக|மாதங்களாக|வருடங்களாக|முதல்)/i,
  /(?:నిన్నటి నుంచి|ఈ రోజు నుంచి|రోజులుగా|వారాలుగా|నెలలుగా|సంవత్సరాలుగా)/i,
  /(?:کل سے|آج سے|گزشتہ رات سے|دنوں سے|ہفتوں سے|مہینوں سے|سالوں سے)/i,
];

function valuesFor(state: Record<string, unknown>, keys: string[]): unknown[] {
  return keys.flatMap((key) => {
    const value = state[key];
    return Array.isArray(value) ? value : value === undefined ? [] : [value];
  });
}

export function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 && (EXPLICIT_UNKNOWN_OR_NONE.test(normalized) || normalized.length > 0);
  }
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue);
  return true;
}

export function hasOnsetEvidence(text: string): boolean {
  return ONSET_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

export function isLanguagePreferenceRequest(text: string): boolean {
  const normalized = text.trim().toLocaleLowerCase();
  if (!normalized) return false;
  return /(?:english|हिंदी|hindi|हिन्दी|বাংলা|bangla|bengali|অসমীয়া|assamese|ગુજરાતી|gujarati|ಕನ್ನಡ|kannada|മലയാളം|malayalam|मराठी|marathi|ଓଡ଼ିଆ|odia|ਪੰਜਾਬੀ|punjabi|தமிழ்|tamil|తెలుగు|telugu|اردو|urdu)/u.test(normalized)
    && /(?:language|भाषा|भाषेत|भाषায়|ভাষা|में|में बोल|mein|bhasha|samajh|समझ|understand|बोल|বলুন|বল|speak|say|saying|talk|कह|কথা|ಮಾತನಾಡಿ|ಹೇಳಿ|చెప్ప|మాట్లాడు|बोला|बोलता|பேச|பேசுங்கள்|സംസാര|പറയൂ|କୁହ|କହ|ਬੋਲ|ਕਹੋ|بات|بتائیں|بولیں)/u.test(normalized);
}

function hasAny(state: Record<string, unknown>, keys: string[]): boolean {
  return valuesFor(state, keys).some(hasMeaningfulValue);
}

function hasMedicalHistory(state: Record<string, unknown>): boolean {
  if (hasAny(state, ['medicalHistory', 'medicalConditions', 'pastMedicalHistory', 'pastHistory', 'hospitalizations', 'surgeries', 'majorIllnesses'])) return true;
  const history = state.history;
  if (history && typeof history === 'object' && !Array.isArray(history)) {
    return hasAny(history as Record<string, unknown>, ['medical', 'medicalHistory', 'conditions', 'past', 'hospitalizations', 'surgeries']);
  }
  return hasMeaningfulValue(history);
}

export function missingCoreDetail(questionIndex: number, state: Record<string, unknown>): string | null {
  switch (questionIndex) {
    case 0:
      return hasAny(state, ['symptoms', 'chiefComplaint', 'presentingComplaint', 'complaints', 'problem'])
        ? null
        : 'the main problem or symptom';
    case 1:
      return hasAny(state, ['problemStarted', 'onsetOrDuration', 'duration', 'onset', 'startedWhen', 'symptomDuration'])
        ? null
        : 'when the problem started or how long it has been present';
    case 2:
      return hasMedicalHistory(state)
        ? null
        : 'known medical conditions, hospitalizations, or surgeries';
    case 3: {
      const medicines = hasAny(state, ['currentMedications', 'medications', 'medicines', 'recentMedications', 'drugs']);
      const allergies = hasAny(state, ['allergies', 'medicationAllergies', 'foodAllergies', 'reactions']);
      if (!medicines && !allergies) return 'current or recently taken medicines, and medicine or food allergies or reactions';
      if (!medicines) return 'current or recently taken medicines';
      if (!allergies) return 'medicine or food allergies or reactions';
      return null;
    }
    case 4: {
      const family = hasAny(state, ['familyHistory', 'familyMedicalHistory', 'family']);
      const lifestyle = hasAny(state, ['lifestyle', 'socialHistory', 'occupation', 'diet', 'activity', 'smoking', 'tobacco', 'alcohol']);
      if (!family && !lifestyle) return 'family medical history or lifestyle information';
      if (!family) return 'relevant family medical history';
      if (!lifestyle) return 'relevant lifestyle information';
      return null;
    }
    case 5:
      return hasAny(state, ['otherImportantInformation', 'additionalInformation', 'otherInformation', 'other', 'notes'])
        ? null
        : 'any other important medical information';
    default:
      return null;
  }
}

export function coreAnswerComplete(questionIndex: number, state: Record<string, unknown>, latestPatientText = ''): boolean {
  if (questionIndex === 1 && hasOnsetEvidence(latestPatientText)) return true;
  return missingCoreDetail(questionIndex, state) === null;
}

export function onsetStateFromPatientText(state: Record<string, unknown>, latestPatientText: string): Record<string, unknown> {
  if (!latestPatientText.trim() || !hasOnsetEvidence(latestPatientText) || hasAny(state, ['problemStarted', 'onsetOrDuration', 'duration', 'onset', 'startedWhen', 'symptomDuration'])) return state;
  return { ...state, problemStarted: [latestPatientText.trim()] };
}

export function supplementStateFromPatientText(state: Record<string, unknown>, questionIndex: number, latestPatientText: string): Record<string, unknown> {
  const text = latestPatientText.trim();
  if (!text) return state;
  let supplemented = onsetStateFromPatientText(state, text);
  const noOrUnknown = /\b(?:no|none|nil|nothing|not taking|do not take|don't take|not on|not applicable|unknown|don't know|do not know|not sure)\b|(?:नहीं|कोई नहीं|कुछ नहीं|पता नहीं|नहीं लेता|नहीं लेती|नहीं है)|(?:না|নেই|কিছু নেই|জানি না|নেই না)|(?:ಇಲ್ಲ|ಯಾವುದೂ ಇಲ್ಲ|ಗೊತ್ತಿಲ್ಲ)|(?:లేదు|ఏమీ లేదు|తెలియదు)|(?:नाही|काही नाही|माहित नाही)|(?:இல்லை|எதுவும் இல்லை|தெரியாது)|(?:ഇല്ല|ഒന്നുമില്ല|അറിയില്ല)|(?:ନାହିଁ|କିଛି ନାହିଁ|ଜାଣିନି)|(?:ਨਹੀਂ|ਕੁਝ ਨਹੀਂ|ਪਤਾ ਨਹੀਂ)|(?:نہیں|کچھ نہیں|معلوم نہیں)/i;
  if (!noOrUnknown.test(text)) return supplemented;

  if (questionIndex === 2 && !hasMedicalHistory(supplemented) && /(?:medical|condition|illness|hospital|surgery|operation|history|बीमारी|इलाज|अस्पताल|सर्जरी|রোগ|হাসপাতাল|অপারেশন|ಅನಾರೋಗ್ಯ|ಆಸ್ಪತ್ರೆ|ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ|వ్యాధి|ఆసుపత్రి|శస్త్రచికిత్స|आजार|रुग्णालय|शस्त्रक्रिया|நோய்|மருத்துவமனை|அறுவை|രോഗം|ആശുപത്രി|ശസ്ത്രക്രിയ|ରୋଗ|ହସ୍ପିଟାଲ|ଅପରେସନ|ਬਿਮਾਰੀ|ਹਸਪਤਾਲ|سرجری|بیماری)/i.test(text)) {
    supplemented = { ...supplemented, medicalHistory: [text] };
  }
  if (questionIndex === 3) {
    if (!hasAny(supplemented, ['currentMedications', 'medications', 'medicines', 'recentMedications', 'drugs']) && /(?:medic|tablet|ยา|drug|दवा|दवाई|गोली|ঔষধ|ওষুধ|ট্যাবলেট|ಔಷಧ|ಮಾತ್ರೆ|మందు|టాబ్లెట్|औषध|गोळी|மருந்து|மாத்திரை|മരുന്ന്|ഗുളിക|ଔଷଧ|ଟାବଲେଟ|ਦਵਾਈ|ਗੋਲੀ|دوائی|گولی)/i.test(text)) {
      supplemented = { ...supplemented, currentMedications: [text] };
    }
    if (!hasAny(supplemented, ['allergies', 'medicationAllergies', 'foodAllergies', 'reactions']) && /(?:allerg|reaction|एलर्जी|प्रतिक्रिया|অ্যালার্জি|প্রতিক্রিয়া|ಅಲರ್ಜಿ|ಪ್ರತಿಕ್ರಿಯೆ|అలెర్జీ|ప్రతిచర్య|ऍलर्जी|प्रतिक्रिया|ஒவ்வாமை|எதிர்வினை|അലർജി|പ്രതികരണം|ଆଲର୍ଜି|ପ୍ରତିକ୍ରିୟା|ਐਲਰਜੀ|ਪ੍ਰਤੀਕਿਰਿਆ|الرجی|ردعمل)/i.test(text)) {
      supplemented = { ...supplemented, allergies: [text] };
    }
  }
  if (questionIndex === 4) {
    if (!hasAny(supplemented, ['familyHistory', 'familyMedicalHistory', 'family']) && /(?:family|परिवार|वंश|পরিবার|পারিবারিক|ಕುಟುಂಬ|కుటుంబ|कुटुंब|குடும்ப|കുടുംബം|ପରିବାର|ਪਰਿਵਾਰ|خاندان)/i.test(text)) {
      supplemented = { ...supplemented, familyHistory: [text] };
    }
    if (!hasAny(supplemented, ['lifestyle', 'socialHistory', 'occupation', 'diet', 'activity', 'smoking', 'tobacco', 'alcohol']) && /(?:lifestyle|smok|tobacco|alcohol|occupation|work|diet|exercise|जीवनशैली|धूम्रपान|तंबाकू|शराब|काम|খাদ্য|ধূমপান|তামাক|মদ|কাজ|জীবনযাপন|ಜೀವನಶೈಲಿ|ಧೂಮಪಾನ|ತಂಬಾಕು|ಮದ್ಯ|ಕೆಲಸ|ఆహారం|ధూమపానం|పొగాకు|మద్యం|పని|जीवनशैली|धूम्रपान|तंबाखू|दारू|काम|வாழ்க்கைமுறை|புகை|மது|வேலை|ജീവിതശൈലി|പുകവലി|മദ്യം|ജോലി|ଜୀବନଶୈଳୀ|ଧୂମପାନ|ତମାଖୁ|ମଦ|କାମ|ਜੀਵਨਸ਼ੈਲੀ|ਸਿਗਰਟ|ਤੰਬਾਕੂ|ਸ਼ਰਾਬ|ਕੰਮ|طرز زندگی|تمباکو|شراب|کام)/i.test(text)) {
      supplemented = { ...supplemented, lifestyle: [text] };
    }
  }
  if (questionIndex === 5 && /(?:nothing else|nothing more|no other|none|no|not applicable|unknown|don't know|do not know|कुछ नहीं|और कुछ नहीं|कुछ भी नहीं|কিছু নেই|আর কিছু নেই|ಇನ್ನೇನೂ ಇಲ್ಲ|ఏమీ లేదు|काही नाही|வேறெதுவும் இல்லை|ഒന്നുമില്ല|ଆଉ କିଛି ନାହିଁ|ਹੋਰ ਕੁਝ ਨਹੀਂ|کچھ نہیں)/i.test(text)) {
    if (!hasAny(supplemented, ['otherImportantInformation', 'additionalInformation', 'otherInformation', 'other', 'notes'])) {
      supplemented = { ...supplemented, otherImportantInformation: [text] };
    }
  }
  return supplemented;
}
