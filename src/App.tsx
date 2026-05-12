import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Settings as SettingsIcon, 
  Bell, 
  Trash2, 
  Globe, 
  Cpu,
  Zap,
  Flame,
  Plus,
  X,
  Volume2,
  Clock,
  MapPin
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { generateResponse } from './services/gemini';
import { useVoice } from './hooks/useVoice';
import { useMemory, useReminders } from './hooks/useMemory';
import { translations, Language } from './lib/i18n';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// --- Main App ---
export default function App() {
  const [lang, setLang] = useMemory<Language>('tf_lang', 'en');
  const [personality, setPersonality] = useMemory<string>('tf_personality', 'Professional and helpful AI assistant');
  const [messages, setMessages] = useMemory<Message[]>('tf_history', []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAutoSpeak, setIsAutoSpeak] = useMemory<boolean>('tf_auto_speak', false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationName, setLocationName] = useState<string>('');
  
  const { isListening, listen, speak } = useVoice();
  const { reminders, addReminder, removeReminder } = useReminders();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  // Request Geolocation and Timezone
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        // Approximate location via timezone
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setLocationName(tz.split('/').pop()?.replace('_', ' ') || 'Unknown');
      });
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request Notifications on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Call Gemini
    const history = messages.slice(-10).map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));
    
    const timeStr = currentTime.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    const responseText = await generateResponse(trimmed, history, personality, lang, timeStr);
    
    processCommands(responseText);
    
    const cleanResponse = responseText.replace(/\[CODE_START\].*?\[CODE_END\]/gs, '').replace(/\[COMMAND:.*?\]/gs, '').trim();

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: cleanResponse,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
    
    // Auto TTS if enabled
    if (isAutoSpeak && cleanResponse) {
      speak(cleanResponse, lang);
    }
  }, [messages, personality, lang, isAutoSpeak, speak, setMessages]);

  const processCommands = (text: string) => {
    if (text.includes('[COMMAND: OPEN_YOUTUBE]')) {
      window.open('https://youtube.com', '_blank');
    }
    const searchMatch = text.match(/\[COMMAND: SEARCH_GOOGLE: (.*?)\]/);
    if (searchMatch) {
      window.open(`https://google.com/search?q=${encodeURIComponent(searchMatch[1])}`, '_blank');
    }
  };

  const handleMicToggle = () => {
    if (!isListening) {
      listen(lang, (text) => handleSend(text));
    }
  };

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden", lang === 'ar' && "rtl")} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* --- Header --- */}
      <header className="h-20 flex items-center justify-between px-8 glass-morphism z-20 shrink-0 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-orange-600 p-[2px] flex items-center justify-center glow-blue rotate-3 transition-transform hover:rotate-0">
               <div className="w-full h-full bg-[#030303] rounded-[10px] flex items-center justify-center relative overflow-hidden group-hover:bg-transparent transition-colors">
                  <Zap className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                  <Flame className="w-3 h-3 text-orange-500 absolute bottom-1 right-1" />
               </div>
            </div>
          </div>
          <h1 className="thunder-text text-2xl tracking-widest uppercase">{t.title}</h1>
        </div>

        {/* Digital Clock */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-center gap-2 text-white/80 font-mono font-bold tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{currentTime.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour12: true })}</span>
          </div>
          {locationName && (
            <div className="flex items-center gap-1 text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">
              <MapPin className="w-3 h-3 text-orange-500" />
              {locationName}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setLang('en')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", lang === 'en' ? "bg-blue-600 text-white shadow-lg" : "text-white/40 hover:text-white")}
            >EN</button>
            <button 
              onClick={() => setLang('ar')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", lang === 'ar' ? "bg-orange-600 text-white shadow-lg" : "text-white/40 hover:text-white")}
            >AR</button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex overflow-hidden justify-center bg-[#030303] relative">
        {/* Animated Background Elements */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Chat Pane */}
        <section className="w-full max-w-5xl flex flex-col bg-transparent relative z-10">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-24 h-24 mb-6 relative">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-blue-600 rounded-full blur-2xl" 
                  />
                  <Zap className="w-full h-full text-blue-500 relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                </div>
                <h2 className="text-3xl font-black italic mb-2 uppercase tracking-tighter thunder-text">Ready for Impact</h2>
                <p className="text-white/30 text-sm max-w-sm font-medium">{t.chatPlaceholder}</p>
              </div>
            )}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.role === 'user' ? "ms-auto items-end" : "me-auto items-start"
                )}
              >
                <div className={cn(
                  "px-5 py-4 rounded-3xl text-sm leading-relaxed relative",
                  msg.role === 'user' 
                    ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-tr-none glow-blue" 
                    : "glass-morphism text-white/90 rounded-tl-none border border-white/10"
                )}>
                  {msg.role === 'model' && (
                    <div className="absolute -top-2 -left-2 bg-orange-600 p-1 rounded-lg">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <div className="flex items-center gap-3 mt-2 px-2">
                  <span className="text-[10px] text-white/20 font-bold tracking-widest">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'model' && (
                    <button 
                      onClick={() => speak(msg.content, lang)}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-orange-500 transition-colors"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl w-fit border border-white/5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-6 bg-gradient-to-t from-black to-transparent">
            <div className="relative glass-morphism rounded-3xl shadow-[0_-10px_50px_rgba(0,0,0,0.8)] border border-white/10 flex items-center p-2 group hover:border-blue-500/30 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder={t.chatPlaceholder}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-6 py-4 placeholder:text-white/10"
              />
              <button 
                onClick={() => handleSend(input)}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center hover:scale-105 transition-all active:scale-95 group-focus-within:glow-blue"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Listening Indicator */}
            {isListening && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-400"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {t.listening} - "Fire" Word Lock
              </motion.div>
            )}
          </div>
        </section>
      </main>

      {/* --- Footer Dashboard --- */}
      <footer className="h-24 shrink-0 glass-morphism flex items-center justify-center px-4 gap-4 md:gap-12 border-t border-white/10 relative z-20">
        <div className="flex items-center gap-4 md:gap-8 bg-black/60 px-8 py-3 rounded-3xl border border-white/5">
          {/* Action Buttons */}
          <button 
            onClick={() => setIsRemindersOpen(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center group-hover:bg-orange-600 transition-all border border-orange-600/30 group-hover:glow-orange">
              <Bell className="w-5 h-5 text-orange-500 group-hover:text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white/30 group-hover:text-white transition-colors">{t.reminders}</span>
          </button>

          {/* Center Mic Button */}
          <div className="relative">
            <button 
              onClick={handleMicToggle}
              className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center transition-all relative z-10 border-2 overflow-hidden",
                isListening 
                  ? "bg-red-600 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse" 
                  : "bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400/30 hover:scale-110 active:scale-95 glow-blue"
              )}
            >
              {isListening ? <Mic className="w-7 h-7 text-white" /> : <MicOff className="w-7 h-7 text-white/50" />}
            </button>
            {isListening && (
              <div className="absolute inset-0 bg-red-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
            )}
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center group-hover:bg-blue-600 transition-all border border-blue-600/30 group-hover:glow-blue">
              <SettingsIcon className="w-5 h-5 text-blue-500 group-hover:text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white/30 group-hover:text-white transition-colors">{t.settings}</span>
          </button>
          
          <button 
            onClick={() => setMessages([])}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center group-hover:bg-red-600 transition-all border border-red-600/30">
              <Trash2 className="w-5 h-5 text-red-500 group-hover:text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white/30 group-hover:text-white transition-colors">Reset</span>
          </button>
        </div>
      </footer>

      {/* --- Overlay Modals --- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#0a0a0a] p-8 rounded-[40px] w-full max-w-md border border-white/10 shadow-[0_0_100px_rgba(59,130,246,0.2)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="thunder-text text-2xl uppercase tracking-widest">{t.settings}</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="bg-white/5 p-2 rounded-xl border border-white/10"><X /></button>
              </div>
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-white/20 mb-3 uppercase tracking-[0.2em]">{t.personality}</label>
                  <textarea 
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm min-h-[120px] focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                   <div className="flex flex-col">
                     <span className="text-xs font-bold uppercase tracking-widest text-white/40">{t.autoSpeak}</span>
                     <span className="text-[10px] text-white/20">AI will voice responses</span>
                   </div>
                   <button 
                    onClick={() => setIsAutoSpeak(!isAutoSpeak)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all duration-300",
                      isAutoSpeak ? "bg-blue-600" : "bg-white/10"
                    )}
                   >
                     <div className={cn(
                       "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                       isAutoSpeak ? "left-7" : "left-1"
                     )} />
                   </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isRemindersOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
            onClick={() => setIsRemindersOpen(false)}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#0a0a0a] p-8 rounded-[40px] w-full max-w-md border border-white/10 h-[600px] flex flex-col shadow-[0_0_100px_rgba(249,115,22,0.2)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="thunder-text text-2xl uppercase tracking-widest text-orange-500">{t.reminders}</h3>
                <button onClick={() => setIsRemindersOpen(false)} className="bg-white/5 p-2 rounded-xl border border-white/10"><X /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                {reminders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Bell className="w-16 h-16" />
                    <p className="text-xs font-black uppercase mt-4">Empty Queue</p>
                  </div>
                )}
                {reminders.map(rem => (
                  <div key={rem.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5 hover:border-orange-500/30 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-white/90">{rem.text}</p>
                      <p className="text-[10px] font-bold text-orange-500/40 uppercase tracking-widest mt-1">{new Date(rem.time).toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeReminder(rem.id)} className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center text-red-500/50 hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <input 
                  id="rem-text"
                  type="text" 
                  placeholder={t.reminderText}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:border-orange-500/50 transition-colors"
                />
                <input 
                  id="rem-time"
                  type="datetime-local" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white/30 font-bold"
                />
                <button 
                  onClick={() => {
                    const textEl = document.getElementById('rem-text') as HTMLInputElement;
                    const timeEl = document.getElementById('rem-time') as HTMLInputElement;
                    if (textEl.value && timeEl.value) {
                      addReminder(textEl.value, timeEl.value);
                      textEl.value = '';
                    }
                  }}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all glow-orange"
                >
                  {t.addReminder}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
