import { useRef } from 'react';
import Avatar from './components/Avatar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import Dashboard from './components/Dashboard';
import CommandBar from './components/CommandBar/CommandBar';
import Header from './components/Header';
import ShortcutsHelp from './components/ShortcutsHelp';
import SettingsView from './components/SettingsView';
import Sidebar from './components/Sidebar';
import ViewTransition from './components/ViewTransition';
import { useAppController } from './hooks/useAppController';
import { useShortcuts } from './hooks/useShortcuts';
import { plugins } from './plugins/registry';
import { I18nProvider } from './i18n/context';
import { speakerGenderMap } from './types';

function estimateTokenCount(messages: { content: string }[]) {
  return messages.reduce((sum, message) => {
    const length = message.content.trim().length;
    return sum + Math.max(1, Math.round(length / 4));
  }, 0);
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sessionId,
    messages,
    inputText,
    language,
    speaker,
    personality,
    activePlugin,
    isThinking,
    isSidebarOpen,
    isSettingsOpen,
    historyRefreshKey,
    showAvatar,
    avatarEmotion,
    viewKey,
    isSpeaking,
    isRecording,
    mouthAlpha,
    computedViewKey,
    avatarSource,
    setInputText,
    setLanguage,
    setSpeaker,
    setPersonality,
    setIsSidebarOpen,
    setIsSettingsOpen,
    setActivePlugin,
    handleSend,
    handleMicClick,
    handleFileChange,
    handleNewChat,
    handleSessionDeleted,
    handleLoadSession,
    handleEditMessage,
    handleRegenerate,
    openPlugin,
  } = useAppController();

  useShortcuts();

  const tokenCount = messages.length > 0 ? estimateTokenCount(messages) : null;

  const renderMainView = () => {
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
    if (activePlugin) {
      const plugin = plugins.find((p) => p.id === activePlugin);
      if (!plugin) return null;
      const PluginComponent = plugin.component;
      return <PluginComponent />;
    }
    if (messages.length === 0) {
      return (
        <Dashboard
          onContinueSession={() => setActivePlugin(null)}
          onOpenPlugin={openPlugin}
        />
      );
    }
    return <ChatArea 
      sessionId={sessionId}
      messages={messages} 
      isThinking={isThinking} 
      onTileClick={setInputText} 
      onEditMessage={handleEditMessage}
      onRegenerate={handleRegenerate}
    />;
  };

  return (
    <I18nProvider language={language}>
      <div className="app-shell h-screen flex font-sans overflow-hidden relative">
        <CommandBar />
        <ShortcutsHelp />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,application/pdf"
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

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header
            onOpenSidebar={() => setIsSidebarOpen(true)}
            language={language}
            setLanguage={setLanguage}
            speaker={speaker}
            setSpeaker={setSpeaker}
            personality={personality}
            setPersonality={setPersonality}
            isSettingsOpen={isSettingsOpen}
            setIsSettingsOpen={setIsSettingsOpen}
          />

          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            <section
              className={`flex-1 flex flex-col h-full min-w-0 relative z-10 overflow-hidden transition-all duration-300 ${
                showAvatar ? 'border-r border-white/10 lg:max-w-[52%]' : 'max-w-full'
              }`}
            >
              <ViewTransition viewKey={computedViewKey || viewKey}>
                {renderMainView()}
              </ViewTransition>

              <ChatInput
                inputText={inputText}
                setInputText={setInputText}
                onSend={handleSend}
                onMicClick={handleMicClick}
                onFileClick={() => fileInputRef.current?.click()}
                onNewChat={handleNewChat}
                isRecording={isRecording}
                isThinking={isThinking}
                tokenCount={tokenCount}
              />
            </section>

          {showAvatar && (
            <section className="hidden lg:flex w-[48%] shrink-0 relative bg-[var(--bg-tertiary)]/20 border-l border-black/5 dark:border-white/5 min-h-0 h-full animate-fade-in">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Avatar
                  isSpeaking={isSpeaking}
                  isListening={isRecording}
                  isThinking={isThinking}
                  mouthAlpha={mouthAlpha}
                  gender={speakerGenderMap[speaker]}
                  emotion={avatarEmotion}
                  avatarSource={avatarSource}
                />
              </div>
            </section>
          )}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}

export default App;
