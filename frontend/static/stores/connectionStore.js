import { atom, map } from 'nanostores';

// WebRTC connection state
export const connectionState = map({
    isConnected: false,
    isConnecting: false,
    roomId: null,
    peerId: null,
    connectionError: null,
    iceServers: [],
    signalingServer: 'ws://localhost:8000'
});

// Media streams
export const mediaStreams = map({
    localStream: null,
    remoteStream: null,
    audioEnabled: true,
    videoEnabled: true
});

// Methods for connectionState
export function setConnectionStatus(connected, connecting = false) {
    connectionState.setKey('isConnected', connected);
    connectionState.setKey('isConnecting', connecting);
}

export function setRoomId(roomId) {
    connectionState.setKey('roomId', roomId);
}

export function setPeerId(peerId) {
    connectionState.setKey('peerId', peerId);
}

export function setConnectionError(error) {
    connectionState.setKey('connectionError', error);
}

export function setIceServers(servers) {
    connectionState.setKey('iceServers', servers);
}

export function setSignalingServer(server) {
    connectionState.setKey('signalingServer', server);
}

// Methods for mediaStreams
export function setLocalStream(stream) {
    mediaStreams.setKey('localStream', stream);
}

export function setRemoteStream(stream) {
    mediaStreams.setKey('remoteStream', stream);
}

export function toggleAudio(enabled) {
    mediaStreams.setKey('audioEnabled', enabled);
    const stream = mediaStreams.get().localStream;
    if (stream) {
        stream.getAudioTracks().forEach(track => {
            track.enabled = enabled;
        });
    }
}

export function toggleVideo(enabled) {
    mediaStreams.setKey('videoEnabled', enabled);
    const stream = mediaStreams.get().localStream;
    if (stream) {
        stream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
        });
    }
}

// Reset connection state
export function resetConnection() {
    connectionState.set({
        isConnected: false,
        isConnecting: false,
        roomId: null,
        peerId: null,
        connectionError: null,
        iceServers: [],
        signalingServer: 'ws://localhost:8000'
    });
    
    mediaStreams.set({
        localStream: null,
        remoteStream: null,
        audioEnabled: true,
        videoEnabled: true
    });
}

// Helper functions
export function getConnectionStatus() {
    const state = connectionState.get();
    if (state.isConnected) return 'connected';
    if (state.isConnecting) return 'connecting';
    if (state.connectionError) return 'error';
    return 'disconnected';
}