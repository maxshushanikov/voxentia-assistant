import { atom, map } from 'nanostores';

// Chat messages
export const messages = atom([]);

// Chat state
export const chatState = map({
    isSending: false,
    isReceiving: false,
    lastMessageId: null,
    hasUnreadMessages: false
});

// Methods for messages
export function addMessage(message) {
    const currentMessages = messages.get();
    messages.set([...currentMessages, {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now()
    }]);
}

export function clearMessages() {
    messages.set([]);
}

export function getMessageById(id) {
    return messages.get().find(msg => msg.id === id);
}

export function getLastMessage() {
    const allMessages = messages.get();
    return allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
}

// Methods for chatState
export function setSending(sending) {
    chatState.setKey('isSending', sending);
}

export function setReceiving(receiving) {
    chatState.setKey('isReceiving', receiving);
}

export function setLastMessageId(id) {
    chatState.setKey('lastMessageId', id);
}

export function setUnreadStatus(hasUnread) {
    chatState.setKey('hasUnreadMessages', hasUnread);
}

// Helper functions
export function getMessagesBySession(sessionId) {
    return messages.get().filter(msg => msg.sessionId === sessionId);
}

export function getMessagesByType(type) {
    return messages.get().filter(msg => msg.type === type);
}

export function getUnreadMessages() {
    return messages.get().filter(msg => !msg.read);
}

export function markAllAsRead() {
    const updatedMessages = messages.get().map(msg => ({
        ...msg,
        read: true
    }));
    messages.set(updatedMessages);
    setUnreadStatus(false);
}