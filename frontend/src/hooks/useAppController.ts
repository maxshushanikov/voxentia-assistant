import React, { useCallback, useRef, useEffect } from 'react';
import { forkSession, getChatHistory } from '../api/chat';
import { postChatStream } from '../api/chatStream';
import {
  useChatMutation,
  useLoadSessionMutation,
  useTranscribeMutation,
  useUploadDocumentMutation,
} from './useChatApi';
import { useAudioManager } from './useAudioManager';
import type { Message, AvatarEmotion } from '../types';
import { useAppStore } from '../store/appStore';
import { formatMessage, getTranslations } from '../i18n';
import { parseEmotionFromToken, stripEmotionTags } from '../utils/parseEmotion';

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
  const avatarSource = useAppStore((s) => s.avatarSource);
  const compareMode = useAppStore((s) => s.compareMode);
  const selectedModelB = useAppStore((s) => s.selectedModelB);

  const setInputText = useAppStore((s) => s.setInputText);
  const setMessages = useAppStore((s) => s.setMessages);
  const setSessionId = useAppStore((s) => s.setSessionId);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setSpeaker = useAppStore((s) => s.setSpeaker);
  const setPersonality = useAppStore((s) => s.setPersonality);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const setActivePlugin = useAppStore((s) => s.setActivePlugin);
  const setIsThinking = useAppStore((s) => s.setIsThinking);
  const setIsSidebarOpen = useAppStore((s) => s.setIsSidebarOpen);
  const setIsSettingsOpen = useAppStore((s) => s.setIsSettingsOpen);
  const bumpHistoryRefresh = useAppStore((s) => s.bumpHistoryRefresh);
  const resetChat = useAppStore((s) => s.resetChat);
  const setVoiceState = useAppStore((s) => s.setVoiceState);
  const setAvatarSource = useAppStore((s) => s.setAvatarSource);
  const setCompareMode = useAppStore((s) => s.setCompareMode);
  const setSelectedModelB = useAppStore((s) => s.setSelectedModelB);

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

      if (compareMode && selectedModelB) {
        const assistantId = `asst-comp-${Date.now()}`;
        const tStartA = performance.now();
        const tStartB = performance.now();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '',
            id: assistantId,
            timestamp: new Date().toISOString(),
            comparison: {
              modelA: selectedModel || 'Default Model',
              contentA: '',
              modelB: selectedModelB,
              contentB: '',
              streamingA: true,
              streamingB: true,
            },
          },
        ]);

        if (streamEnabled) {
          const streamA = new Promise<void>((resolve) => {
            void postChatStream(
              { ...requestBody, model: selectedModel },
              {
                onToken: (token) => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.comparison
                        ? {
                            ...m,
                            comparison: {
                              ...m.comparison,
                              contentA: m.comparison.contentA + token,
                            },
                          }
                        : m,
                    ),
                  );
                },
                onAudio: (audioUrl) => {
                  queueAudio(audioUrl);
                },
                onDone: (data) => {
                  const latencyA = Math.round(performance.now() - tStartA);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.comparison
                        ? {
                            ...m,
                            comparison: {
                              ...m.comparison,
                              contentA: data.text,
                              streamingA: false,
                              latencyA,
                            },
                          }
                        : m,
                    ),
                  );
                  const emotion = (data as unknown as Record<string, unknown>).emotion;
                  if (emotion) {
                    useAppStore.getState().setAvatarEmotion(emotion as AvatarEmotion);
                  }
                  resolve();
                },
                onError: (error) => {
                  console.error('Stream A error:', error);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.comparison
                        ? {
                            ...m,
                            comparison: {
                              ...m.comparison,
                              contentA: m.comparison.contentA || 'Failed to stream from Model A',
                              streamingA: false,
                            },
                          }
                        : m,
                    ),
                  );
                  resolve();
                },
              },
              abort.signal,
            );
          });

          const streamB = new Promise<void>((resolve) => {
            void postChatStream(
              { ...requestBody, model: selectedModelB },
              {
                onToken: (token) => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.comparison
                        ? {
                            ...m,
                            comparison: {
                              ...m.comparison,
                              contentB: m.comparison.contentB + token,
                            },
                          }
                        : m,
                    ),
                  );
                },
                onAudio: () => {},
                onDone: (data) => {
                  const latencyB = Math.round(performance.now() - tStartB);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.comparison
                        ? {
                            ...m,
                            comparison: {
                              ...m.comparison,
                              contentB: data.text,
                              streamingB: false,
                              latencyB,
                            },
                          }
                        : m,
                    ),
                  );
                  resolve();
                },
                onError: (error) => {
                  console.error('Stream B error:', error);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.comparison
                        ? {
                            ...m,
                            comparison: {
                              ...m.comparison,
                              contentB: m.comparison.contentB || 'Failed to stream from Model B',
                              streamingB: false,
                            },
                          }
                        : m,
                    ),
                  );
                  resolve();
                },
              },
              abort.signal,
            );
          });

          await Promise.all([streamA, streamB]);
          return;
        } else {
          setIsThinking(true);
          try {
            const t0 = performance.now();
            const t1 = performance.now();
            const [dataA, dataB] = await Promise.all([
              chatMutation.mutateAsync({ ...requestBody, model: selectedModel }).then((d) => ({
                data: d,
                ms: Math.round(performance.now() - t0),
              })),
              chatMutation.mutateAsync({ ...requestBody, model: selectedModelB }).then((d) => ({
                data: d,
                ms: Math.round(performance.now() - t1),
              })),
            ]);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.comparison
                  ? {
                      ...m,
                      comparison: {
                        ...m.comparison,
                        contentA: dataA.data.text,
                        contentB: dataB.data.text,
                        streamingA: false,
                        streamingB: false,
                        latencyA: dataA.ms,
                        latencyB: dataB.ms,
                      },
                    }
                  : m,
              ),
            );
            await playResponseAudio(dataA.data.audio_url);
          } catch (error) {
            console.error('Non-stream comparison error:', error);
          } finally {
            setIsThinking(false);
          }
          return;
        }
      }

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
                  const emotion = parseEmotionFromToken(token);
                  if (emotion) {
                    useAppStore.getState().setAvatarEmotion(emotion);
                  }
                  const displayToken = stripEmotionTags(token);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + displayToken }
                        : m,
                    ),
                  );
                },
                onAudio: (audioUrl) => {
                  queueAudio(audioUrl);
                },
                onDone: (data) => {
                  const ragSources = (data as { rag_sources?: Message['ragSources'] }).rag_sources;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: data.text,
                            streaming: false,
                            ...(ragSources?.length ? { ragSources } : {}),
                          }
                        : m,
                    ),
                  );
                  const emotion = (data as unknown as Record<string, unknown>).emotion;
                  if (emotion) {
                    useAppStore.getState().setAvatarEmotion(emotion as AvatarEmotion);
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
        if (data.session_id && data.session_id !== currentSessionId) {
          setSessionId(data.session_id);
        }

        const assistantMsg: Message = {
          role: 'assistant',
          content: data.text,
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toISOString(),
          ...(data.rag_sources?.length ? { ragSources: data.rag_sources } : {}),
          ...(data.intent_confidence != null
            ? { intentConfidence: data.intent_confidence, intentSource: data.intent_source ?? undefined }
            : {}),
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
      compareMode,
      selectedModelB,
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
        dbId: m.id,
        timestamp: m.timestamp,
        model: m.model,
      }));
      setSessionId(sid);
      setMessages(() => historyMessages);
      setActivePlugin(null);

      // Extract last used model from history to support Hot-Swap model persistence!
      let lastModel: string | null = null;
      for (let i = data.history.length - 1; i >= 0; i--) {
        if (data.history[i].model) {
          lastModel = data.history[i].model ?? null;
          break;
        }
      }
      if (lastModel) {
        setSelectedModel(lastModel);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleEditMessage = (_id: string, newText: string) => {
    setInputText(newText);
  };
  
  const handleRegenerate = async (id: string) => {
    if (isThinking) return;
    const msgIndex = messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;
    const target = messages[msgIndex];
    let lastUserMsgContent = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsgContent = messages[i].content;
        break;
      }
    }
    if (!lastUserMsgContent) return;

    let activeSessionId = sessionId;
    if (target.dbId) {
      try {
        const fork = await forkSession(sessionId, target.dbId);
        activeSessionId = fork.session_id;
        setSessionId(fork.session_id);
        const data = await getChatHistory(fork.session_id);
        const historyMessages: Message[] = data.history.map((m, index) => ({
          role: m.role as Message['role'],
          content: m.content,
          id: `hist-${fork.session_id}-${index}`,
          dbId: m.id,
          timestamp: m.timestamp,
          model: m.model,
        }));
        setMessages(() => historyMessages);
        bumpHistoryRefresh();
      } catch (error) {
        console.error('Fork failed:', error);
        setMessages((prev) => prev.slice(0, msgIndex));
      }
    } else {
      setMessages((prev) => prev.slice(0, msgIndex));
    }

    await processResponse(lastUserMsgContent, activeSessionId);
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
    avatarSource,
    compareMode,
    selectedModelB,
    setInputText,
    setLanguage,
    setSpeaker,
    setPersonality,
    setIsSidebarOpen,
    setIsSettingsOpen,
    setActivePlugin,
    setAvatarSource,
    setCompareMode,
    setSelectedModelB,
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
