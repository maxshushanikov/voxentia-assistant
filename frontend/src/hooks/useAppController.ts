import React, { useCallback, useRef, useEffect } from 'react';
import { postChatStream } from '../api/chatStream';
import {
  useChatMutation,
  useLoadSessionMutation,
  useTranscribeMutation,
  useUploadDocumentMutation,
} from './useChatApi';
import { useAudioManager } from './useAudioManager';
import type { Message } from '../types';
import { useAppStore } from '../store/appStore';
import { formatMessage, getTranslations } from '../i18n';

export function useAppController() {
  const sessionId = useAppStore((s) => s.sessionId);
  const messages = useAppStore((s) => s.messages);
  const inputText = useAppStore((s) => s.inputText);
  const language = useAppStore((s) => s.language);
  const speaker = useAppStore((s) => s.speaker);
  const personality = useAppStore((s) => s.personality);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const activePlugin = useAppStore((s) => s.activePlugin);
  const isThinking = useAppStore((s) => s.isThinking);
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const historyRefreshKey = useAppStore((s) => s.historyRefreshKey);
  const showAvatar = useAppStore((s) => s.showAvatar);
  const avatarEmotion = useAppStore((s) => s.avatarEmotion);
  const viewKey = useAppStore((s) => s.viewKey);
  const streamEnabled = useAppStore((s) => s.streamEnabled);

  const setInputText = useAppStore((s) => s.setInputText);
  const setMessages = useAppStore((s) => s.setMessages);
  const setSessionId = useAppStore((s) => s.setSessionId);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setSpeaker = useAppStore((s) => s.setSpeaker);
  const setPersonality = useAppStore((s) => s.setPersonality);
  const setActivePlugin = useAppStore((s) => s.setActivePlugin);
  const setIsThinking = useAppStore((s) => s.setIsThinking);
  const setIsSidebarOpen = useAppStore((s) => s.setIsSidebarOpen);
  const setIsSettingsOpen = useAppStore((s) => s.setIsSettingsOpen);
  const bumpHistoryRefresh = useAppStore((s) => s.bumpHistoryRefresh);
  const resetChat = useAppStore((s) => s.resetChat);
  const setVoiceState = useAppStore((s) => s.setVoiceState);

  const streamAbortRef = useRef<AbortController | null>(null);

  const chatMutation = useChatMutation();
  const transcribeMutation = useTranscribeMutation();
  const uploadMutation = useUploadDocumentMutation();
  const loadSessionMutation = useLoadSessionMutation();

  const {
    isSpeaking,
    isRecording,
    mouthAlpha,
    playAudio,
    queueAudio,
    clearAudioQueue,
    unlockAudio,
    startRecording,
    stopRecording,
  } = useAudioManager();

  useEffect(() => {
    setVoiceState(isSpeaking ? 'speaking' : 'idle');
  }, [isSpeaking, setVoiceState]);

  const computedViewKey = activePlugin
    ? `plugin-${activePlugin}`
    : messages.length > 0
      ? 'chat'
      : 'dashboard';

  const processResponse = useCallback(
    async (text: string, currentSessionId: string) => {
      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;
      clearAudioQueue();

      const requestBody = {
        message: text,
        session_id: currentSessionId,
        language,
        speaker,
        personality,
        model: selectedModel,
      };

      const playResponseAudio = async (audioUrl?: string | null) => {
        if (audioUrl) {
          await playAudio(audioUrl);
        }
      };

      if (streamEnabled) {
        const assistantId = `asst-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '', id: assistantId, streaming: true, timestamp: new Date().toISOString() },
        ]);

        let retryCount = 0;
        await new Promise<void>((resolve) => {
          const doStream = () => {
            void postChatStream(
              requestBody,
              {
                onToken: (token) => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: m.content + token } : m,
                    ),
                  );
                },
                onAudio: (audioUrl) => {
                  queueAudio(audioUrl);
                },
                onDone: (data) => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: data.text, streaming: false }
                        : m,
                    ),
                  );
                  if ((data as any).emotion) {
                    useAppStore.getState().setAvatarEmotion((data as any).emotion);
                  }
                  resolve();
                },
                onError: (error) => {
                  console.error('Stream error:', error);
                  if (retryCount < 3 && !abort.signal.aborted) {
                    retryCount++;
                    setTimeout(doStream, 1500);
                    return;
                  }
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: m.content || 'Sorry, streaming failed.',
                            streaming: false,
                          }
                        : m,
                    ),
                  );
                  resolve();
                },
              },
              abort.signal,
            );
          };
          doStream();
        });
        return;
      }

      setIsThinking(true);
      try {
        const data = await chatMutation.mutateAsync(requestBody);

        const assistantMsg: Message = {
          role: 'assistant',
          content: data.text,
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await playResponseAudio(data.audio_url);
      } catch (error) {
        console.error('Error in processing:', error);
      } finally {
        setIsThinking(false);
      }
    },
    [
      chatMutation,
      language,
      speaker,
      personality,
      selectedModel,
      streamEnabled,
      playAudio,
      queueAudio,
      clearAudioQueue,
      setMessages,
      setIsThinking,
    ],
  );

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;
    unlockAudio();
    if (activePlugin) setActivePlugin(null);

    const userMsg: Message = {
      role: 'user',
      content: inputText,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    await processResponse(userMsg.content, sessionId);
  };

  const handleMicClick = async () => {
    unlockAudio();
    if (isRecording) {
      setVoiceState('idle');
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
              timestamp: new Date().toISOString(),
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
      setVoiceState('recording');
      startRecording();
    }
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
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const data = await uploadMutation.mutateAsync(file);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: formatMessage(t.chat_docUploaded, {
            name: file.name,
            chunks: data.chunks ?? 0,
          }),
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: formatMessage(t.chat_docUploadError, { name: file.name }),
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0) bumpHistoryRefresh();
    resetChat();
  };

  const handleSessionDeleted = (deletedId: string) => {
    if (deletedId === '*' || deletedId === sessionId) resetChat();
    bumpHistoryRefresh();
  };

  const handleLoadSession = async (sid: string) => {
    try {
      const data = await loadSessionMutation.mutateAsync(sid);
      const historyMessages: Message[] = data.history.map((m, index) => ({
        role: m.role as Message['role'],
        content: m.content,
        id: `hist-${sid}-${index}`,
        timestamp: (m as any).timestamp,
      }));
      setSessionId(sid);
      setMessages(() => historyMessages);
      setActivePlugin(null);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleEditMessage = (_id: string, newText: string) => {
    setInputText(newText);
  };
  
  const handleRegenerate = async (id: string) => {
    if (isThinking) return;
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;
    let lastUserMsgContent = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsgContent = messages[i].content;
        break;
      }
    }
    if (!lastUserMsgContent) return;
    await processResponse(lastUserMsgContent, sessionId);
  };

  const openPlugin = (id: string) => {
    setActivePlugin(id);
  };

  return {
    sessionId,
    messages,
    inputText,
    language,
    speaker,
    personality,
    selectedModel,
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
  };
}
