import { useEffect, useRef, useState } from 'react';
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
import { listPlugins, type PluginListItem } from './api/chat';
import { getPluginDefinition } from './plugins/registry';
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
    handleDeleteMessage,
    openPlugin,
  } = useAppController();

  const [pluginMetadata, setPluginMetadata] = useState<Record<string, PluginListItem>>({});

  useEffect(() => {
    void (async () => {
      try {
        const data = await listPlugins();
        const metadata = data.plugins.reduce<Record<string, PluginListItem>>((acc, plugin) => {
          acc[plugin.id] = plugin;
          return acc;
        }, {});
        setPluginMetadata(metadata);
      } catch (error) {
        console.warn('Failed to load plugin metadata', error);
      }
    })();
  }, []);

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
      const plugin = getPluginDefinition(activePlugin);
      const metadata = pluginMetadata[activePlugin];
      if (!plugin) return null;
      if (metadata?.enabled === false) {
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="glass-card rounded-[28px] border border-[rgba(255,255,255,0.08)] p-8 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Plugin unavailable</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                The selected plugin is currently disabled on the backend. Enable it in the plugin management settings or open another plugin.
              </p>
            </div>
          </div>
        );
      }
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
      onDeleteMessage={handleDeleteMessage}
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
            <section className="hidden lg:flex w-[48%] shrink-0 relative min-h-0 h-full animate-fade-in">
              <div 
                className="glass-card absolute inset-4 overflow-hidden transition-all duration-500"
                style={{ 
                  boxShadow: `0 30px 100px -20px ${
                    personality === 'friendly' ? 'rgba(16, 185, 129, 0.35)' :
                    personality === 'teacher' ? 'rgba(16, 185, 129, 0.35)' :
                    personality === 'academic' ? 'rgba(59, 130, 246, 0.35)' :
                    personality === 'developer' ? 'rgba(245, 158, 11, 0.35)' :
                    personality === 'coach' ? 'rgba(236, 72, 153, 0.35)' :
                    personality === 'therapist' ? 'rgba(139, 92, 246, 0.35)' :
                    'rgba(41, 121, 255, 0.35)' // professional
                  }` 
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),transparent_45%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
                <div className="relative w-full h-full">
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
