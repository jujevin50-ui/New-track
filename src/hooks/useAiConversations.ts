import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ai-assistant-conversations';
const MAX_CONVERSATIONS = 5;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AiConversation {
  id: string;
  accountId: string;
  accountLabel: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

function loadFromStorage(): AiConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useAiConversations() {
  const [conversations, setConversations] = useState<AiConversation[]>(loadFromStorage);

  const saveConversation = useCallback((conv: AiConversation) => {
    setConversations(prev => {
      const updated = [conv, ...prev.filter(c => c.id !== conv.id)]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, MAX_CONVERSATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { conversations, saveConversation, deleteConversation };
}
