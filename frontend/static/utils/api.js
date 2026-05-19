import { appState, setAppStatus, setConnectionError } from '../stores/appStore.js';

const API_BASE_URL = window.location.origin;

// Generic API request function
export async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    try {
        setAppStatus('connecting');
        
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    } catch (error) {
        console.error('API request failed:', error);
        setConnectionError(error.message);
        setAppStatus('error', error.message);
        throw error;
    } finally {
        if (appState.get().status !== 'error') {
            setAppStatus('connected');
        }
    }
}

// Chat API methods
export async function sendChatMessage(message, sessionId = 'default', model = 'llama3') {
    return apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
            session_id: sessionId,
            message,
            model,
        }),
    });
}

export async function getChatHistory(sessionId = 'default', limit = 20) {
    return apiRequest(`/api/chat/history?session_id=${sessionId}&limit=${limit}`);
}

export async function clearChatHistory(sessionId = 'default') {
    return apiRequest(`/api/chat/history?session_id=${sessionId}`, {
        method: 'DELETE',
    });
}

// TTS API methods
export async function generateTTS(text) {
    return apiRequest('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
}

export async function getTTSAudio(audioId) {
    return apiRequest(`/api/tts-audio/${audioId}`);
}

// WebRTC signaling API methods
export async function createRoom() {
    return apiRequest('/api/webrtc/room', {
        method: 'POST',
    });
}

export async function getIceServers() {
    return apiRequest('/api/webrtc/ice-servers');
}

// Health check
export async function healthCheck() {
    return apiRequest('/health');
}

// File upload
export async function uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary
        onUploadProgress: onProgress,
    });
}

// Error handling wrapper
export function withRetry(fn, retries = 3, delay = 1000) {
    return async function(...args) {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                }
            }
        }
        throw lastError;
    };
}

// Batch requests
export function batchRequests(requests, maxConcurrent = 5) {
    return new Promise((resolve, reject) => {
        const results = [];
        let index = 0;
        let completed = 0;
        let hasError = false;
        
        function runNext() {
            if (hasError) return;
            
            const currentIndex = index++;
            if (currentIndex >= requests.length) {
                if (completed === requests.length) resolve(results);
                return;
            }
            
            const request = requests[currentIndex];
            request()
                .then(result => {
                    results[currentIndex] = result;
                    completed++;
                    if (completed === requests.length) {
                        resolve(results);
                    } else {
                        runNext();
                    }
                })
                .catch(error => {
                    hasError = true;
                    reject(error);
                });
        }
        
        for (let i = 0; i < Math.min(maxConcurrent, requests.length); i++) {
            runNext();
        }
    });
}