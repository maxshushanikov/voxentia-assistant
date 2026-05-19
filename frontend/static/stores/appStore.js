import { atom, map } from 'nanostores';

// Application state
export const appState = map({
    status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
    error: null,
    isLoading: false,
    isInitialized: false
});

// UI state
export const uiState = map({
    isMicActive: false,
    isCallActive: false,
    isWebcamActive: false,
    selectedEmoji: '',
    isSidebarOpen: false
});

// Session state
export const sessionState = map({
    sessionId: null,
    userId: null,
    connectionType: null // 'webrtc', 'chat'
});

// Methods for appState
export function setAppStatus(status, error = null) {
    appState.setKey('status', status);
    if (error) {
        appState.setKey('error', error);
    }
}

export function setLoading(loading) {
    appState.setKey('isLoading', loading);
}

export function setInitialized(initialized) {
    appState.setKey('isInitialized', initialized);
}

// Methods for uiState
export function toggleMic(active) {
    uiState.setKey('isMicActive', active);
}

export function toggleCall(active) {
    uiState.setKey('isCallActive', active);
}

export function toggleWebcam(active) {
    uiState.setKey('isWebcamActive', active);
}

export function selectEmoji(emoji) {
    uiState.setKey('selectedEmoji', emoji);
}

export function toggleSidebar(open) {
    uiState.setKey('isSidebarOpen', open);
}

// Methods for sessionState
export function setSessionId(sessionId) {
    sessionState.setKey('sessionId', sessionId);
}

export function setUserId(userId) {
    sessionState.setKey('userId', userId);
}

export function setConnectionType(type) {
    sessionState.setKey('connectionType', type);
}

// Reset all states
export function resetAllStates() {
    appState.set({
        status: 'disconnected',
        error: null,
        isLoading: false,
        isInitialized: false
    });
    
    uiState.set({
        isMicActive: false,
        isCallActive: false,
        isWebcamActive: false,
        selectedEmoji: '',
        isSidebarOpen: false
    });
    
    sessionState.set({
        sessionId: null,
        userId: null,
        connectionType: null
    });
}