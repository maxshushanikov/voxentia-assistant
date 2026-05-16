import { History, Sparkles } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import Avatar from './components/Avatar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import Header from './components/Header';
import SettingsView from './components/SettingsView';
import Sidebar from './components/Sidebar';
import {
  useChatMutation,
  useLoadSessionMutation,
  useTranscribeMutation,
  useUploadDocumentMutation,
} from './hooks/useChatApi';
import { useAudioManager } from './hooks/useAudioManager';
import { plugins } from './plugins/registry';
import type { Language, Message, Personality, Speaker } from './types';
import { I18nProvider } from './i18n/context';
import { formatMessage, getTranslations } from './i18n';
import { speakerGenderMap } from './types';

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

  const chatMutation = useChatMutation();
  const transcribeMutation = useTranscribeMutation();
  const uploadMutation = useUploadDocumentMutation();
  const loadSessionMutation = useLoadSessionMutation();

  const {
    isSpeaking,
    isRecording,
    mouthAlpha,
    playAudio,
    unlockAudio,
    startRecording,
    stopRecording,
  } = useAudioManager();

  const processResponse = useCallback(
    async (text: string, currentSessionId: string) => {
      setIsThinking(true);
      try {
        const data = await chatMutation.mutateAsync({
          message: text,
          session_id: currentSessionId,
          language,
          speaker,
          personality,
        });

        const assistantMsg: Message = {
          role: 'assistant',
          content: data.text,
          id: (Date.now() + 1).toString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (data.audio_url) {
          await playAudio(data.audio_url);
        } else {
          console.warn('No audio_url in chat response — TTS may be unavailable');
        }
      } catch (error) {
        console.error('Error in processing:', error);
      } finally {
        setIsThinking(false);
      }
    },
    [chatMutation, language, speaker, personality, playAudio],
  );

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;

    unlockAudio();
    if (activePlugin) setActivePlugin(null);

    const userMsg: Message = {
      role: 'user',
      content: inputText,
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    await processResponse(userMsg.content, sessionId);
  };

  const handleMicClick = async () => {
    unlockAudio();
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        setIsThinking(true);
        try {
          const data = await transcribeMutation.mutateAsync({ blob, language });
          if (data.text) {
            const userMsg: Message = {
              role: 'user',
              content: data.text,
              id: Date.now().toString(),
            };
            setMessages((prev) => [...prev, userMsg]);
            await processResponse(data.text, sessionId);
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
    e.target.value = '';

    const t = getTranslations(language);
    const userMsg: Message = {
      role: 'user',
      content: formatMessage(t.chat_docUploadUser, { name: file.name }),
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const data = await uploadMutation.mutateAsync(file);
      const assistantMsg: Message = {
        role: 'assistant',
        content: formatMessage(t.chat_docUploaded, {
          name: file.name,
          chunks: data.chunks ?? 0,
        }),
        id: (Date.now() + 1).toString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Document upload error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: formatMessage(t.chat_docUploadError, { name: file.name }),
          id: (Date.now() + 1).toString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      setHistoryRefreshKey((k) => k + 1);
    }
    setSessionId(generateSessionId());
    setActivePlugin(null);
    setMessages([]);
    setInputText('');
  };

  const handleSessionDeleted = (deletedId: string) => {
    if (deletedId === '*' || deletedId === sessionId) {
      setSessionId(generateSessionId());
      setMessages([]);
      setInputText('');
      setActivePlugin(null);
    }
    setHistoryRefreshKey((k) => k + 1);
  };

  const handleLoadSession = async (sid: string) => {
    try {
      const data = await loadSessionMutation.mutateAsync(sid);
      const historyMessages: Message[] = data.history.map((m, index) => ({
        role: m.role as Message['role'],
        content: m.content,
        id: `hist-${sid}-${index}`,
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
          language={language}
          setLanguage={setLanguage}
          speaker={speaker}
          setSpeaker={setSpeaker}
          personality={personality}
          setPersonality={setPersonality}
        />
      );
    }

    const plugin = plugins.find((p) => p.id === activePlugin);
    if (!plugin) return null;
    const PluginComponent = plugin.component;
    return <PluginComponent />;
  };

  return (
    <I18nProvider language={language}>
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
        activePlugin={activePlugin}
        setActivePlugin={setActivePlugin}
        onNewChat={handleNewChat}
        onLoadSession={handleLoadSession}
        onSessionDeleted={handleSessionDeleted}
        activeSessionId={sessionId}
        historyRefreshKey={historyRefreshKey}
      />

      <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        <section className="flex-1 flex flex-col h-full min-w-0 border-r border-white/10 relative z-10 overflow-hidden">
          <Header
            onOpenSidebar={() => setIsSidebarOpen(true)}
            language={language}
            setLanguage={setLanguage}
            speaker={speaker}
            setSpeaker={setSpeaker}
            personality={personality}
            setPersonality={setPersonality}
            isSettingsOpen={isSettingsDropdownOpen}
            setIsSettingsOpen={setIsSettingsDropdownOpen}
          />

          <div className="flex-1 flex flex-col overflow-hidden relative [scrollbar-gutter:stable]">
            {activePlugin ? renderPluginView() : (
              <ChatArea messages={messages} isThinking={isThinking} />
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
          />
        </section>

        <section className="w-full lg:w-[48%] lg:flex-none lg:shrink-0 relative bg-black/20 min-h-[400px] lg:min-h-0 h-full">
          <div className="absolute top-6 right-6 flex space-x-2 z-20">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center glass-card rounded-[4px] text-gray-400 hover:text-[#2979ff] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActivePlugin(null)}
              className="w-10 h-10 flex items-center justify-center glass-card rounded-[4px] text-gray-400 hover:text-[#2979ff] transition-colors"
            >
              <History className="w-4 h-4" />
            </button>
          </div>

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
    </I18nProvider>
  );
}

export default App;
