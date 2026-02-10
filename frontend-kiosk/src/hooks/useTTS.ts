import { useState, useCallback, useEffect, useRef } from 'react';
import { Language } from '../types';

interface TTSOptions {
    lang: Language;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}

interface UseTTSReturn {
    speak: (text: string) => void;
    stop: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
    speakStep: (stepKey: string) => void;
}

// Step-by-step prompts for low-literacy mode
const STEP_PROMPTS: Record<string, Record<Language, string>> = {
    welcome: {
        en: "Welcome to CivicPulse. Let me help you file a complaint. First, choose your language.",
        hi: "सिविकपल्स में आपका स्वागत है। मैं आपकी शिकायत दर्ज करने में मदद करूँगा। पहले, अपनी भाषा चुनें।",
        ta: "சிவிக்பல்ஸ்க்கு வரவேற்கிறோம். உங்கள் புகாரை பதிவு செய்ய உதவுகிறேன். முதலில், உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்."
    },
    selectIssue: {
        en: "Now, tap on the type of problem you are facing. Is it about water, electricity, roads, or garbage?",
        hi: "अब, आप जिस समस्या का सामना कर रहे हैं उस पर टैप करें। क्या यह पानी, बिजली, सड़क या कचरे के बारे में है?",
        ta: "இப்போது, ​​நீங்கள் எதிர்கொள்ளும் பிரச்சனையின் வகையைத் தட்டவும். இது தண்ணீர், மின்சாரம், சாலைகள் அல்லது குப்பை பற்றியதா?"
    },
    uploadPhoto: {
        en: "Now you can upload a photo of the problem. Tap the camera button to take a picture, or tap upload to choose from your gallery.",
        hi: "अब आप समस्या की फोटो अपलोड कर सकते हैं। तस्वीर लेने के लिए कैमरा बटन पर टैप करें, या गैलरी से चुनने के लिए अपलोड पर टैप करें।",
        ta: "இப்போது பிரச்சனையின் புகைப்படத்தை பதிவேற்றலாம். படம் எடுக்க கேமரா பட்டனைத் தட்டவும், அல்லது உங்கள் கேலரியில் இருந்து தேர்வு செய்ய பதிவேற்றத்தைத் தட்டவும்."
    },
    ocrReview: {
        en: "I have read your document. Please check if the information is correct. You can tap any field to edit it.",
        hi: "मैंने आपका दस्तावेज़ पढ़ लिया है। कृपया जाँचें कि जानकारी सही है या नहीं। आप किसी भी फ़ील्ड को संपादित करने के लिए टैप कर सकते हैं।",
        ta: "உங்கள் ஆவணத்தைப் படித்தேன். தகவல் சரியாக உள்ளதா என்பதைச் சரிபார்க்கவும். திருத்த எந்த புலத்தையும் தட்டலாம்."
    },
    enterPhone: {
        en: "Please enter your phone number to receive updates about your complaint. We will mask your number to protect your privacy.",
        hi: "अपनी शिकायत के बारे में अपडेट प्राप्त करने के लिए कृपया अपना फ़ोन नंबर दर्ज करें। आपकी गोपनीयता की रक्षा के लिए हम आपका नंबर छिपा देंगे।",
        ta: "உங்கள் புகாரைப் பற்றிய புதுப்பிப்புகளைப் பெற உங்கள் தொலைபேசி எண்ணை உள்ளிடவும். உங்கள் தனியுரிமையைப் பாதுகாக்க உங்கள் எண்ணை மறைப்போம்."
    },
    enterOTP: {
        en: "Enter the 6-digit code we sent to your phone. If you are in demo mode, use zero zero zero zero zero zero.",
        hi: "हमने आपके फोन पर जो 6 अंकों का कोड भेजा है वह दर्ज करें। यदि आप डेमो मोड में हैं, तो शून्य शून्य शून्य शून्य शून्य शून्य का उपयोग करें।",
        ta: "உங்கள் தொலைபேசிக்கு அனுப்பிய 6 இலக்க குறியீட்டை உள்ளிடவும். நீங்கள் டெமோ பயன்முறையில் இருந்தால், பூஜ்ஜியம் பூஜ்ஜியம் பூஜ்ஜியம் பூஜ்ஜியம் பூஜ்ஜியம் பூஜ்ஜியம் பயன்படுத்தவும்."
    },
    submitComplete: {
        en: "Your complaint has been submitted successfully. Save this receipt or take a photo of the QR code to track your complaint.",
        hi: "आपकी शिकायत सफलतापूर्वक दर्ज कर दी गई है। अपनी शिकायत को ट्रैक करने के लिए इस रसीद को सहेजें या क्यूआर कोड की फोटो लें।",
        ta: "உங்கள் புகார் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது. உங்கள் புகாரைக் கண்காணிக்க இந்த ரசீதைச் சேமிக்கவும் அல்லது QR குறியீட்டின் புகைப்படத்தை எடுக்கவும்."
    },
    needHelp: {
        en: "Don't worry, I am here to help you. Let me explain again.",
        hi: "चिंता मत करें, मैं आपकी मदद करने के लिए यहां हूं। मुझे फिर से समझाने दीजिए।",
        ta: "கவலைப்பட வேண்டாம், நான் உங்களுக்கு உதவ இங்கே இருக்கிறேன். மீண்டும் விளக்குகிறேன்."
    }
};

// Language code mapping for speech synthesis
const LANG_CODES: Record<Language, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    ta: 'ta-IN'
};

export function useTTS(options: TTSOptions): UseTTSReturn {
    const { lang, rate = 0.9, pitch = 1.0, volume = 1.0, onStart, onEnd, onError } = options;
    const [isSpeaking, setIsSpeaking] = useState(false);
    // const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Load available voices
    useEffect(() => {
        if (!isSupported) return;

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            // setAvailableVoices(voices);
            console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        };

        loadVoices();

        // Some browsers load voices asynchronously
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, [isSupported]);

    const stop = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isSupported]);

    const speak = useCallback((text: string) => {
        if (!isSupported) {
            console.warn('Speech synthesis not supported');
            onError?.(new Error('Speech synthesis not supported'));
            return;
        }

        // Cancel any ongoing speech
        stop();

        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = LANG_CODES[lang] || 'en-US';
        utterance.lang = targetLang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        // Find the best voice for the selected language
        const voices = window.speechSynthesis.getVoices();

        // Try to find a voice that matches the language exactly
        let selectedVoice = voices.find(voice => voice.lang === targetLang);

        // If no exact match, try to find a voice for the language family (e.g., 'ta' for 'ta-IN')
        if (!selectedVoice) {
            const langPrefix = targetLang.split('-')[0];
            selectedVoice = voices.find(voice => voice.lang.startsWith(langPrefix));
        }

        // If still no match, try to find any voice that contains the language code
        if (!selectedVoice) {
            const langPrefix = targetLang.split('-')[0];
            selectedVoice = voices.find(voice => voice.lang.toLowerCase().includes(langPrefix));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
            console.warn(`No voice found for language: ${targetLang}. Available voices:`, voices.map(v => `${v.name} (${v.lang})`));

            // Show user-friendly error for Tamil
            if (lang === 'ta') {
                const errorMsg = 'Tamil voice not available on this device. Please install Tamil language support in your system settings.';
                console.error(errorMsg);
                onError?.(new Error(errorMsg));
                alert(errorMsg + '\n\nFor Windows: Settings > Time & Language > Language > Add Tamil language\nFor Android/Chrome: Settings > Accessibility > Text-to-speech > Install voice data');
                return;
            }
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            onStart?.();
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            onEnd?.();
        };

        utterance.onerror = (event) => {
            setIsSpeaking(false);
            console.error('Speech synthesis error:', event.error);
            onError?.(new Error(event.error));
        };

        utteranceRef.current = utterance;

        // Small delay to ensure cancel completes
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    }, [isSupported, lang, rate, pitch, volume, onStart, onEnd, onError, stop]);

    const speakStep = useCallback((stepKey: string) => {
        const prompts = STEP_PROMPTS[stepKey];
        if (prompts && prompts[lang]) {
            speak(prompts[lang]);
        } else {
            console.warn(`No prompt found for step: ${stepKey} in language: ${lang}`);
        }
    }, [lang, speak]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    return {
        speak,
        stop,
        isSpeaking,
        isSupported,
        speakStep
    };
}

// Standalone speak function for simpler usage
export function speak(text: string, lang: Language = 'en'): void {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = LANG_CODES[lang] || 'en-US';
        utterance.lang = targetLang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find the best voice for the selected language
        const voices = window.speechSynthesis.getVoices();

        // Try to find a voice that matches the language exactly
        let selectedVoice = voices.find(voice => voice.lang === targetLang);

        // If no exact match, try to find a voice for the language family
        if (!selectedVoice) {
            const langPrefix = targetLang.split('-')[0];
            selectedVoice = voices.find(voice => voice.lang.startsWith(langPrefix));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
            console.warn(`No voice found for language: ${targetLang}`);
            if (lang === 'ta') {
                console.error('Tamil voice not available. Please install Tamil language support.');
            }
        }

        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    }
}

// Get step prompts for external use
export function getStepPrompt(stepKey: string, lang: Language): string {
    return STEP_PROMPTS[stepKey]?.[lang] || '';
}

export { STEP_PROMPTS };
