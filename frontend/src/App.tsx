import { useState, useRef, useCallback } from 'react';
import { Sparkles, History } from 'lucide-react';
import Avatar from './components/Avatar';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import { useAudioManager } from './hooks/useAudioManager';
import { speakerGenderMap } from './types';
import type { Message, Language, Speaker, Personality } from './types';

import SettingsView from './components/SettingsView';
import { plugins } from './plugins/registry';

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function App() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [speaker, setSpeaker] = useState<Speaker>('baya');
  const [personality, setPersonality] = useState<Personality>('professional');
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [activePlugin, setActivePlugin] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateSessionId);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    isSpeaking, 
    isRecording, 
    mouthAlpha, 
    playAudio,
    unlockAudio,
    startRecording, 
    stopRecording 
  } = useAudioManager();

  const processResponse = useCallback(async (text: string, currentSessionId: string) => {
    setIsThinking(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          session_id: currentSessionId,
          language,
          speaker,
          personality
        })
      });

      if (!response.ok) throw new Error('Failed to fetch response');
      const data = await response.json();
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.text,
        id: (Date.now() + 1).toString()
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (data.audio_url) {
        playAudio(data.audio_url);
      }
    } catch (error) {
      console.error('Error in processing:', error);
    } finally {
      setIsThinking(false);
    }
  }, [language, speaker, personality, playAudio]);

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;

    // Unlock AudioContext within the user-gesture event (fixes browser autoplay block)
    unlockAudio();

    if (activePlugin) setActivePlugin(null);

    const userMsg: Message = {
      role: 'user',
      content: inputText,
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    await processResponse(userMsg.content, sessionId);
  };

  const handleMicClick = async () => {
    unlockAudio(); // Ensure audio can play when response arrives
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('language', language);
        
        setIsThinking(true);
        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              const userMsg: Message = {
                role: 'user',
                content: data.text,
                id: Date.now().toString()
              };
              setMessages(prev => [...prev, userMsg]);
              await processResponse(data.text, sessionId);
            }
          }
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setIsThinking(false);
        }
      }
    } else {
      startRecording();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const userMsg: Message = {
      role: 'user',
      content: `[Attached Document: ${file.name}]`,
      id: Date.now().toString()
    };
    setMessages(prev => [...prev, userMsg]);
    
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      const assistantMsg: Message = {
        role: 'assistant',
        content: `I have received your document: **${file.name}**. How can I help you with it?`,
        id: (Date.now() + 1).toString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 1500);
  };

  const handleNewChat = () => {
    // Save current session to history by refreshing sidebar
    if (messages.length > 0) {
      setHistoryRefreshKey(k => k + 1);
    }
    // Create fresh session
    setSessionId(generateSessionId());
    setActivePlugin(null);
    setMessages([]);
    setInputText('');
  };

  const handleLoadSession = async (sid: string) => {
    try {
      const response = await fetch(`/api/chat/history?session_id=${sid}`);
      if (!response.ok) return;
      const data = await response.json();
      const historyMessages: Message[] = data.history.map((m: any, index: number) => ({
        role: m.role,
        content: m.content,
        id: `hist-${sid}-${index}`
      }));
      setSessionId(sid);
      setMessages(historyMessages);
      setActivePlugin(null);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const renderPluginView = () => {
    if (activePlugin === 'settings') {
      return (
        <SettingsView 
          language={language} setLanguage={setLanguage}
          speaker={speaker} setSpeaker={setSpeaker}
          personality={personality} setPersonality={setPersonality}
        />
      );
    }

    const plugin = plugins.find(p => p.id === activePlugin);
    return plugin ? plugin.component : null;
  };

  return (
    <div className="h-screen bg-[#0b0e14] text-gray-300 flex font-sans overflow-hidden relative">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.txt,.doc,.docx"
      />

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        language={language}
        activePlugin={activePlugin}
        setActivePlugin={setActivePlugin}
        onNewChat={handleNewChat}
        onLoadSession={handleLoadSession}
        historyRefreshKey={historyRefreshKey}
      />

      <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        
        {/* Left Half: Chat Area or Plugin View */}
        <section className="flex-1 flex flex-col h-full border-r border-white/10 relative z-10">
           
           <Header 
              onOpenSidebar={() => setIsSidebarOpen(true)}
              language={language} setLanguage={setLanguage}
              speaker={speaker} setSpeaker={setSpeaker}
              personality={personality} setPersonality={setPersonality}
              isSettingsOpen={isSettingsDropdownOpen}
              setIsSettingsOpen={setIsSettingsDropdownOpen}
           />

           <div className="flex-1 flex flex-col overflow-hidden relative">
             {activePlugin ? (
               renderPluginView()
             ) : (
               <ChatArea 
                  messages={messages} 
                  isThinking={isThinking} 
                  language={language}
               />
             )}
           </div>

           <ChatInput 
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicClick={handleMicClick}
              onFileClick={handleFileClick}
              onNewChat={handleNewChat}
              isRecording={isRecording}
              isThinking={isThinking}
              language={language}
           />
        </section>

        {/* Right Half: Avatar Area */}
        <section className="flex-[0.8] lg:flex-1 relative bg-black/20 min-h-[400px] lg:min-h-0">
           
           {/* Top Right Buttons */}
           <div className="absolute top-6 right-6 flex space-x-2 z-20">
              <button className="w-10 h-10 flex items-center justify-center glass-card rounded-[4px] text-gray-400 hover:text-[#2979ff] transition-colors">
                 <Sparkles className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setActivePlugin(null)}
                className="w-10 h-10 flex items-center justify-center glass-card rounded-[4px] text-gray-400 hover:text-[#2979ff] transition-colors"
              >
                 <History className="w-4 h-4" />
              </button>
           </div>

           {/* Avatar Centered in this half */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-full">
                <Avatar 
                  isSpeaking={isSpeaking} 
                  mouthAlpha={mouthAlpha} 
                  gender={speakerGenderMap[speaker]}
                />
              </div>
           </div>

        </section>

      </main>

    </div>
  );
}

export default App;
