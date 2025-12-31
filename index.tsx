import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// --- Configuration & Types ---

const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "de", name: "Deutsch" },
    { code: "ja", name: "日本語" },
    { code: "it", name: "Italiano" },
    { code: "pt", name: "Português" }
];

const VOICES = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (US, Fem)", gender: "female" },
    { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew (US, Masc)", gender: "male" },
    // Domi removed
    { id: "ZQe5CZNOzWyzPSCn5a3c", name: "James (AU, Masc)", gender: "male" },
    { id: "D38z5RcWu1voky8WS1ja", name: "Fin (IE, Masc)", gender: "male" }
];

const DEFAULT_ELEVEN_KEY = "sk_de0e05e71cd65e02ff6d1fdefa3cd1a8fc20043036e8043b";
const ELEVEN_LABS_MODEL = "eleven_turbo_v2_5";

// --- Helper Functions ---

const getCardStyle = (tone) => {
  const base = "relative overflow-hidden transition-all duration-300 active:scale-95 shadow-lg flex flex-col justify-between p-3 min-h-[100px] border";
  switch (tone?.toLowerCase()) {
    case 'urgent':
    case 'angry': return `${base} bg-red-950/40 border-red-500/50 hover:bg-red-900/60 hover:border-red-400 rounded-lg rounded-tl-3xl`;
    case 'happy':
    case 'positive': return `${base} bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400 rounded-[2rem]`;
    case 'curious':
    case 'question': return `${base} bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/60 hover:border-amber-400 rounded-2xl rounded-tr-[3rem]`;
    case 'sad':
    case 'emotional': return `${base} bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-900/60 hover:border-indigo-400 rounded-3xl opacity-90`;
    case 'professional': return `${base} bg-slate-800/60 border-slate-600/50 hover:bg-slate-700 hover:border-slate-400 rounded-sm`;
    default: return `${base} bg-slate-800/40 border-white/10 hover:bg-slate-800 hover:border-indigo-400 rounded-2xl`;
  }
};

const getToneIcon = (tone) => {
    switch (tone?.toLowerCase()) {
        case 'urgent': return 'fa-bolt text-red-400';
        case 'happy': return 'fa-face-smile text-emerald-400';
        case 'curious': return 'fa-question text-amber-400';
        case 'professional': return 'fa-briefcase text-slate-400';
        default: return 'fa-comment-dots text-indigo-400';
    }
}

// --- Components ---

const Header = ({ onOpenSettings }) => (
  <header className="flex-none flex items-center justify-between p-3 px-4 glass-panel sticky top-0 z-50 border-b border-white/10">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <i className="fa-solid fa-bridge text-white text-sm"></i>
      </div>
      <div>
        <h1 className="font-display font-bold text-lg tracking-tight text-white leading-none">OmniBridge</h1>
      </div>
    </div>
    <button onClick={onOpenSettings} className="p-2 rounded-lg transition-colors text-indigo-400 hover:bg-white/5 active:text-white">
      <i className="fa-solid fa-sliders text-lg"></i>
    </button>
  </header>
);

const CaptureControls = ({ isAnalyzing, onCapture }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; 
  };

  return (
    <div className="mx-4 mt-3 mb-1 flex-none">
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileChange} />
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

        <div className="relative glass-panel rounded-2xl overflow-hidden p-1 transition-all">
            <div className="flex gap-2">
                <button onClick={() => cameraInputRef.current?.click()} className="flex-1 h-12 border border-white/10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 active:bg-indigo-500/30 flex items-center justify-center gap-2 text-indigo-300 transition-all">
                    <i className={`fa-solid ${isAnalyzing ? 'fa-circle-notch fa-spin' : 'fa-camera'}`}></i>
                    <span className="font-medium text-sm">Snap Context</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 border border-dashed border-white/20 rounded-xl hover:bg-white/5 active:bg-white/10 flex items-center justify-center text-slate-400 transition-colors">
                    <i className="fa-regular fa-image"></i>
                </button>
            </div>
        </div>
    </div>
  );
};

const LiveEar = ({ isListening, transcript, conversationState, onToggleListening }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex-1 flex flex-col relative mx-4 my-2 glass-panel rounded-3xl overflow-hidden min-h-0">
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900/90 to-transparent z-10 pointer-events-none"></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 scrollbar-hide">
        {transcript.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
             <i className="fa-solid fa-ear-listen text-3xl mb-3"></i>
             <p className="text-center text-xs">Tap mic to start listening</p>
           </div>
        ) : (
            <div className="space-y-4">
                {transcript.map((t, i) => (
                    <div key={i} className={`flex flex-col ${t.isUser ? 'items-end' : 'items-start'}`}>
                        {t.image && (
                            <div className="mb-2 max-w-[70%] rounded-xl overflow-hidden border border-white/10">
                                <img src={t.image} alt="Context" className="w-full h-auto" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl p-3 ${t.isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                            {t.text && <p className="text-sm md:text-base leading-relaxed">{t.text}</p>}
                        </div>
                    </div>
                ))}
                 <div ref={bottomRef} />
            </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 border-t border-white/5 p-2 px-4 flex items-center justify-between backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
            <button onClick={onToggleListening} className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' : 'bg-slate-700 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}>
                <i className={`fa-solid ${isListening ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
            </button>
             <div className="flex flex-col">
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">State</p>
                <p className="text-xs text-indigo-300 font-bold truncate max-w-[120px]">{conversationState || "WAITING..."}</p>
             </div>
        </div>
        {isListening && (
            <div className="flex items-end gap-1 h-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 bg-gradient-to-t from-red-500 to-orange-400 rounded-full wave-bar" style={{ animationDelay: `${i * 0.1}s`, height: '40%' }}></div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

const CustomInputModal = ({ isOpen, onClose, onSubmit }) => {
    const [text, setText] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => { if(isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);
    const handleSubmit = (e) => { e.preventDefault(); if (text.trim()) { onSubmit(text.trim()); setText(""); onClose(); } };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
            <div className="bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-t sm:border border-white/10 p-4 shadow-2xl animate-slide-up">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-lg">Custom Response</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2"><i className="fa-solid fa-xmark"></i></button>
                 </div>
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what you want to say..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"></textarea>
                     <button type="submit" disabled={!text.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                        <i className="fa-solid fa-play"></i> Speak Now
                     </button>
                 </form>
            </div>
        </div>
    );
}

const MediaContextModal = ({ isOpen, imagePreview, onCancel, onAnalyze }) => {
    const [contextText, setContextText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => { 
        if(isOpen) {
            setContextText(""); 
            setTimeout(() => inputRef.current?.focus(), 100); 
        }
    }, [isOpen]);

    if (!isOpen || !imagePreview) return null;

    return (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="relative h-64 bg-black flex items-center justify-center">
                    <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                    <button onClick={onCancel} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <h3 className="text-white font-bold text-lg">Add Context</h3>
                        <p className="text-slate-400 text-xs">Help the AI understand what to look for (optional).</p>
                    </div>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={contextText} 
                        onChange={e => setContextText(e.target.value)}
                        placeholder="e.g. 'Translate menu', 'Describe scene'" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                        onClick={() => onAnalyze(contextText)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles"></i> Analyze & Send
                    </button>
                </div>
            </div>
         </div>
    );
};

const AdaptiveCanvas = ({ cards, onPlay, isLoading, onCustomClick }) => {
  return (
    <div className="flex-none p-4 bg-slate-950 pb-6 border-t border-white/5">
      {isLoading ? (
         <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-800/50 animate-pulse border border-white/5"></div>
            ))}
         </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
            <button key={card.id} onClick={() => onPlay(card)} className={getCardStyle(card.tone)}>
                <div className={`absolute -right-4 -top-4 w-16 h-16 bg-white/5 blur-xl rounded-full`}></div>
                <div className="relative z-10 w-full flex justify-between items-start mb-2">
                    <span className="text-2xl filter drop-shadow-lg">{card.emoji}</span>
                    <i className={`fa-solid ${getToneIcon(card.tone)} opacity-50`}></i>
                </div>
                <div className="relative z-10 mt-auto">
                    <span className="text-[9px] font-mono opacity-60 uppercase tracking-widest block mb-0.5">{card.tone}</span>
                    <h3 className="text-sm font-bold text-white leading-tight pr-1 drop-shadow-md text-left line-clamp-2">{card.label}</h3>
                </div>
            </button>
            ))}
            <button onClick={onCustomClick} className="col-span-2 mt-1 py-3 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group active:scale-[0.98]">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors"><i className="fa-solid fa-plus text-xs"></i></div>
                <span className="font-medium text-xs uppercase tracking-wider">Custom Response</span>
            </button>
        </div>
      )}
    </div>
  );
};

// Settings Modal with Close Button
const SettingsModal = ({ isOpen, onClose, voiceId, setVoiceId, stability, setStability, language, setLanguage, interlocutorLang, setInterlocutorLang, onRefresh }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
        </button>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><i className="fa-solid fa-sliders text-indigo-400"></i> Settings</h2>
        <div className="space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
              {/* User Language */}
              <div>
                <label className="block text-sm font-medium text-indigo-300 mb-2">My Language</label>
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <p className="text-[9px] text-slate-500 mt-1">Interface & Labels</p>
              </div>

               {/* Interlocutor Language */}
               <div>
                <label className="block text-sm font-medium text-emerald-300 mb-2">They Speak</label>
                <select 
                    value={interlocutorLang} 
                    onChange={(e) => setInterlocutorLang(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <p className="text-[9px] text-slate-500 mt-1">Spoken Audio (TTS)</p>
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Synthetic Voice</label>
            <div className="grid grid-cols-1 gap-2">
                {VOICES.map(v => (
                    <button key={v.id} onClick={() => setVoiceId(v.id)} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${voiceId === v.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${voiceId === v.id ? 'bg-white/20' : 'bg-slate-700'}`}><i className={`fa-solid ${v.gender === 'female' ? 'fa-venus' : 'fa-mars'}`}></i></div>
                            <span className="font-medium text-sm">{v.name}</span>
                        </div>
                        {voiceId === v.id && <i className="fa-solid fa-check text-indigo-200"></i>}
                    </button>
                ))}
            </div>
          </div>

          <div>
             <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-slate-400">Emotion & Stability</label>
                <span className="text-xs text-indigo-400 font-mono">{Math.round(stability * 100)}%</span>
             </div>
             <input type="range" min="0.3" max="0.8" step="0.1" value={stability} onChange={(e) => setStability(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
             <div className="flex justify-between mt-1 text-[10px] text-slate-500 uppercase font-bold tracking-wider"><span>Expressive</span><span>Stable</span></div>
          </div>

          <button onClick={() => { onRefresh(); onClose(); }} className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-colors mt-2">Save & Refresh Cards</button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const OmniBridge = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
  
  // Settings
  const [voiceId, setVoiceId] = useState(localStorage.getItem("voiceId") || VOICES[0].id);
  const [stability, setStability] = useState(parseFloat(localStorage.getItem("stability") || "0.5"));
  const [language, setLanguage] = useState(localStorage.getItem("language") || "en");
  const [interlocutorLang, setInterlocutorLang] = useState(localStorage.getItem("interlocutorLang") || "en");
  
  const [transcriptLines, setTranscriptLines] = useState<{text?: string, image?: string, isUser: boolean}[]>([]);
  const [currentBuffer, setCurrentBuffer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [conversationState, setConversationState] = useState("Ready");
  const [suggestedCards, setSuggestedCards] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Visual Context State
  const [visualDescription, setVisualDescription] = useState("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isMediaContextModalOpen, setIsMediaContextModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    localStorage.setItem("voiceId", voiceId);
    localStorage.setItem("stability", stability.toString());
    localStorage.setItem("language", language);
    localStorage.setItem("interlocutorLang", interlocutorLang);

    if (process.env.API_KEY) {
       aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    
    // Initial cards
    if (suggestedCards.length === 0) {
        const welcome = language === 'fr' ? "Bonjour" : language === 'es' ? "Hola" : "Hello";
        setSuggestedCards([
            { id: '1', label: welcome, emoji: "👋", tts: `Hello`, tone: "happy" },
            { id: '2', label: "Listening...", emoji: "👂", tts: "I'm listening.", tone: "neutral" }
        ]);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
        .then(registration => console.log('SW Registered'))
        .catch(err => console.log('SW Failed', err));
    }

  }, [voiceId, stability, language, interlocutorLang]);

  // --- REFACTORED SPEECH RECOGNITION LOGIC ---
  // Strategy: Create a FRESH instance every time we start listening. 
  // Destroy it completely when we stop. 
  // This prevents the "zombie" instance bug where it works once and dies.

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Speech API not supported");
        return;
    }

    try {
        // Stop any existing instance just in case
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        // Set language based on current Interlocutor Language setting
        recognition.lang = interlocutorLang === 'ja' ? 'ja-JP' : interlocutorLang === 'fr' ? 'fr-FR' : interlocutorLang === 'es' ? 'es-ES' : interlocutorLang === 'de' ? 'de-DE' : 'en-US';

        recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            if (final) handleFinalTranscript(final);
            if (interim) setCurrentBuffer(interim);
        };

        recognition.onerror = (event: any) => {
            console.warn("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // If the user INTENDS to be listening, we must restart.
            // But we must check the LATEST intent. We can't rely on stale closure variables.
            // We use the functional update of state check or a ref, but here we simply
            // rely on the fact that if we are here, the browser stopped it. 
            // We need a ref to know if "we" stopped it or the "browser" stopped it.
            // See stopListening function below.
            
            // Actually, with the "Fresh Instance" strategy, we can check a Ref
            // But to be simple: We will only restart if we didn't explicitly kill it.
            // To do this, we attach the onend ONLY if we want auto-restart.
            // When we want to stop, we set onend = null.
            
            // However, inside startListening, we want it to keep going.
            // So if it ends here, it means it died unexpectedly (silence).
            // We restart it.
            try {
                recognition.start();
            } catch(e) {
                console.log("Restart failed", e);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setConversationState("Listening");

    } catch (e) {
        console.error("Failed to start recognition", e);
        setIsListening(false);
    }
  }, [interlocutorLang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        // CRITICAL: Prevent auto-restart by nullifying the handler
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    setIsListening(false);
    setConversationState("Paused");
    setCurrentBuffer("");
  }, []);

  const toggleListening = () => {
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (recognitionRef.current) {
              recognitionRef.current.onend = null;
              recognitionRef.current.stop();
          }
      };
  }, []);


  const handleFinalTranscript = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    
    // Append to transcript
    setTranscriptLines(prev => [...prev, { text: cleanText, isUser: false }]);
    setCurrentBuffer("");
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => generateCards(cleanText), 800);
  };

  const generateCards = async (lastSpokenText: string, explicitVisualContext?: string) => {
    if (!aiRef.current) return;
    setIsGenerating(true);

    try {
        const fullTranscript = transcriptLines.slice(-5).map(l => (l.isUser ? 'User: ' : 'Interlocutor: ') + (l.text || '[Image]')).join('\n') + `\nInterlocutor just said: "${lastSpokenText}"`;
        const contextToUse = explicitVisualContext !== undefined ? explicitVisualContext : visualDescription;
        
        const prompt = `
            ROLE: Bridge for Deaf user.
            CONFIG:
            - User Language (Display): ${language}
            - Interlocutor Language (TTS): ${interlocutorLang}
            
            VISUAL CONTEXT: ${contextToUse || "None"}
            TRANSCRIPT:
            ${fullTranscript}
            
            INSTRUCTIONS:
            1. Analyze transcript & visuals.
            2. Generate 4 JSON cards.
            3. "label": text in ${language} (User reads this).
            4. "tts": text in ${interlocutorLang} (Spoken to Interlocutor).
            5. Act as a translator if languages differ.
            6. Tone: Helpful, Human.
        `;

        const response = await aiRef.current.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: {
                systemInstruction: "You are an AI communication bridge. Return ONLY JSON.",
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    conversation_state: { type: Type.STRING },
                    suggested_cards: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING },
                          emoji: { type: Type.STRING },
                          tts: { type: Type.STRING },
                          tone: { type: Type.STRING }
                        },
                        required: ["id", "label", "emoji", "tts", "tone"]
                      }
                    }
                  }
                }
            }
        });

        const json = JSON.parse(response.text);
        if (json.suggested_cards) {
            setSuggestedCards(json.suggested_cards);
            setConversationState(json.conversation_state);
        }
    } catch (error) {
        console.error("GenUI Error:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleFileSelect = (base64: string) => {
      setTempImage(base64);
      setIsMediaContextModalOpen(true);
  };

  const handleAnalyzeMedia = async (userContextText: string) => {
      setIsMediaContextModalOpen(false);
      const imageToAnalyze = tempImage;
      setTempImage(null);
      
      if (!imageToAnalyze || !aiRef.current) return;

      setTranscriptLines(prev => [...prev, { image: imageToAnalyze, text: userContextText ? `(Context: ${userContextText})` : undefined, isUser: true }]);
      setIsAnalyzingImage(true);
      setIsGenerating(true);

      try {
          const base64Data = imageToAnalyze.split(',')[1];
          const response = await aiRef.current.models.generateContent({
              model: 'gemini-3-flash-preview', 
              contents: {
                  parts: [
                      { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                      { text: `Analyze this image. User Context: "${userContextText}". Describe the situation relevant to a conversation. Max 30 words.` }
                  ]
              }
          });

          const description = response.text;
          setVisualDescription(description);
          await generateCards(
              `[User showed an image. AI Analysis: ${description}]`,
              description
          );
      } catch (error) {
          console.error("Vision Error:", error);
          setIsGenerating(false);
      } finally {
          setIsAnalyzingImage(false);
      }
  };

  const playResponse = async (card: any) => {
      setTranscriptLines(prev => [...prev, { text: card.tts, isUser: true }]);
      const apiKey = DEFAULT_ELEVEN_KEY;

      if (!apiKey) {
          const u = new SpeechSynthesisUtterance(card.tts);
          window.speechSynthesis.speak(u);
          return;
      }

      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: card.tts,
                model_id: ELEVEN_LABS_MODEL,
                voice_settings: { stability: stability, similarity_boost: 0.75 }
            })
        });
        if (!response.ok) throw new Error("TTS Error");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();

      } catch (e) {
          console.error(e);
          const u = new SpeechSynthesisUtterance(card.tts);
          window.speechSynthesis.speak(u);
      }
  };

  const handleCustomSubmit = (text) => {
      playResponse({ id: 'custom-' + Date.now(), label: text, emoji: "💬", tts: text, tone: "neutral" });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white max-w-md mx-auto shadow-2xl overflow-hidden md:border-x md:border-white/10">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <CaptureControls 
            isAnalyzing={isAnalyzingImage} 
            onCapture={handleFileSelect} 
        />
        <LiveEar 
            isListening={isListening} 
            transcript={[...transcriptLines, ...(currentBuffer ? [{text: currentBuffer, isUser: false}] : [])]} 
            conversationState={conversationState}
            onToggleListening={toggleListening}
        />
      </div>

      <div className="flex-none bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-20">
            <AdaptiveCanvas 
            cards={suggestedCards} 
            onPlay={playResponse} 
            isLoading={isGenerating}
            onCustomClick={() => setIsCustomInputOpen(true)}
        />
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        voiceId={voiceId} setVoiceId={setVoiceId}
        stability={stability} setStability={setStability}
        language={language} setLanguage={setLanguage}
        interlocutorLang={interlocutorLang} setInterlocutorLang={setInterlocutorLang}
        onRefresh={() => generateCards("Language settings changed.")}
      />
      <CustomInputModal isOpen={isCustomInputOpen} onClose={() => setIsCustomInputOpen(false)} onSubmit={handleCustomSubmit} />
      <MediaContextModal 
        isOpen={isMediaContextModalOpen} 
        imagePreview={tempImage} 
        onCancel={() => { setIsMediaContextModalOpen(false); setTempImage(null); }} 
        onAnalyze={handleAnalyzeMedia}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<OmniBridge />);