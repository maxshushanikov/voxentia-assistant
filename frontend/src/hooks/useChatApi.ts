import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getChatHistory, postChat, postTranscribe, uploadDocument } from '../api/chat';
import type { ChatRequestBody, ChatResponseBody } from '../api/types';
import type { Language } from '../types';

export const chatKeys = {
  history: (sessionId: string) => ['chat', 'history', sessionId] as const,
};

export function useChatMutation() {
  return useMutation({
    mutationFn: (body: ChatRequestBody) => postChat(body),
  });
}

export function useTranscribeMutation() {
  return useMutation({
    mutationFn: ({ blob, language }: { blob: Blob; language: Language }) => {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('language', language);
      return postTranscribe(formData);
    },
  });
}

export function useUploadDocumentMutation() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return uploadDocument(formData);
    },
  });
}

export function useLoadSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => getChatHistory(sessionId),
    onSuccess: (data, sessionId) => {
      queryClient.setQueryData(chatKeys.history(sessionId), data);
    },
  });
}

export type { ChatRequestBody, ChatResponseBody };
