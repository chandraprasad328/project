import { SupportedLanguage } from '../shared/types';

const LANG_CODES: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
};

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakText(text: string, lang: SupportedLanguage = 'en', onEnd?: () => void): boolean {
  if (!isSpeechSupported()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_CODES[lang] || 'en-IN';
    utterance.rate = 0.95;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}
