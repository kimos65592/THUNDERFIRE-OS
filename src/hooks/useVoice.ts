import { useState, useEffect, useCallback } from 'react';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const speak = useCallback((text: string, lang: 'en' | 'ar') => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'ar-SA';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  const listen = useCallback((appLang: 'en' | 'ar', onResult: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = appLang === 'en' ? 'en-US' : 'ar-SA'; 

    let lastProcessed = '';
    let isWaitingForCommand = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).toLowerCase();
      
      // Wake word logic: "fire"
      if (!isWaitingForCommand) {
        if (text.includes('fire') || text.includes('فاير')) {
          isWaitingForCommand = true;
          // Extract everything after fire
          const trigger = text.includes('fire') ? 'fire' : 'فاير';
          const parts = text.split(trigger);
          if (parts.length > 1 && parts[1].trim()) {
            setTranscript(parts[1].trim());
            onResult(parts[1].trim());
            isWaitingForCommand = false; // Reset for next time
          }
        }
      } else {
        // If we are already waiting for command, just update
        if (finalTranscript) {
          setTranscript(finalTranscript.trim());
          onResult(finalTranscript.trim());
          isWaitingForCommand = false;
        }
      }
    };

    recognition.onend = () => {
      // If we want it to never stop, we restart it here
      if (setIsListening) {
        try { recognition.start(); } catch(e) {}
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech Error", event.error);
      if (event.error === 'no-speech') return;
      setIsListening(false);
    };

    recognition.start();
  }, []);

  return { isListening, transcript, listen, speak, setTranscript };
}
