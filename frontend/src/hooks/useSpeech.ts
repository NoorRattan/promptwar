import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpeechState } from '@/types/emergency';

interface UseSpeechReturn {
  speechState: SpeechState;
  speak: (text: string, lang?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useSpeech(): UseSpeechReturn {
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const workaroundIntervalRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
  const isSpeaking = speechState === 'speaking';

  const clearWorkaround = useCallback(() => {
    if (workaroundIntervalRef.current !== null) {
      clearInterval(workaroundIntervalRef.current);
      workaroundIntervalRef.current = null;
    }
  }, []);

  const startWorkaround = useCallback(() => {
    clearWorkaround();
    // Chrome bug workaround: pause and resume every 10 seconds
    workaroundIntervalRef.current = window.setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000) as unknown as number;
  }, [clearWorkaround]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    clearWorkaround();
    window.speechSynthesis.cancel();
    setSpeechState('idle');
  }, [isSupported, clearWorkaround]);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!isSupported) {
      setSpeechState('unsupported');
      return;
    }

    // Cancel any ongoing speech
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.volume = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setSpeechState('speaking');
      startWorkaround();
    };
    
    utterance.onend = () => {
      clearWorkaround();
      setSpeechState('idle');
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      clearWorkaround();
      setSpeechState('error');
    };
    
    utterance.onpause = () => {
      clearWorkaround();
      setSpeechState('paused');
    };
    
    utterance.onresume = () => {
      setSpeechState('speaking');
      startWorkaround();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, stop, startWorkaround, clearWorkaround]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    if (speechState === 'speaking') {
      window.speechSynthesis.pause();
    }
  }, [isSupported, speechState]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    if (speechState === 'paused') {
      window.speechSynthesis.resume();
    }
  }, [isSupported, speechState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    speechState,
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isSupported
  };
}
