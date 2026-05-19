import { connectionState, mediaStreams, setConnectionStatus, setLocalStream, setRemoteStream } from '../stores/connectionStore.js';

export class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.signalingSocket = null;
        this.roomId = null;
        this.peerId = null;
        this.isInitiator = false;
    }

    async initialize(roomId, peerId, isInitiator = false) {
        this.roomId = roomId;
        this.peerId = peerId;
        this.isInitiator = isInitiator;

        await this.createPeerConnection();
        await this.setupSignaling();
        
        if (isInitiator) {
            await this.createDataChannel();
            await this.createOffer();
        }
    }

    async createPeerConnection() {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        };

        this.peerConnection = new RTCPeerConnection(config);

        // Set up event handlers
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice_candidate',
                    candidate: event.candidate,
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            setConnectionStatus(state === 'connected', state === 'connecting');
            
            if (state === 'connected') {
                console.log('WebRTC connection established');
            } else if (state === 'disconnected' || state === 'failed') {
                console.log('WebRTC connection failed');
                this.cleanup();
            }
        };

        this.peerConnection.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        // Add local stream if available
        const localStream = mediaStreams.get().localStream;
        if (localStream) {
            localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, localStream);
            });
        }
    }

    async createDataChannel() {
        this.dataChannel = this.peerConnection.createDataChannel('chat', {
            ordered: true,
        });

        this.setupDataChannelHandlers();
    }

    setupDataChannelHandlers() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };

        this.dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleDataChannelMessage(message);
            } catch (error) {
                console.error('Failed to parse data channel message:', error);
            }
        };
    }

    handleDataChannelMessage(message) {
        // Handle different message types
        switch (message.type) {
            case 'chat':
                // Handle chat message
                break;
            case 'emoji':
                // Handle emoji
                break;
            case 'command':
                // Handle command
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    async setupSignaling() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const signalingUrl = `${protocol}//${window.location.host}/api/ws/${this.roomId}/${this.peerId}`;
        
        this.signalingSocket = new WebSocket(signalingUrl);

        this.signalingSocket.onopen = () => {
            console.log('Signaling connection established');
        };

        this.signalingSocket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                await this.handleSignalingMessage(message);
            } catch (error) {
                console.error('Failed to parse signaling message:', error);
            }
        };

        this.signalingSocket.onclose = () => {
            console.log('Signaling connection closed');
            this.cleanup();
        };

        this.signalingSocket.onerror = (error) => {
            console.error('Signaling connection error:', error);
            this.cleanup();
        };
    }

    async handleSignalingMessage(message) {
        switch (message.type) {
            case 'offer':
                await this.handleOffer(message.offer);
                break;
            case 'answer':
                await this.handleAnswer(message.answer);
                break;
            case 'ice_candidate':
                await this.handleIceCandidate(message.candidate);
                break;
            case 'user_joined':
                console.log('User joined:', message.user_id);
                break;
            case 'user_left':
                console.log('User left:', message.user_id);
                break;
            default:
                console.warn('Unknown signaling message type:', message.type);
        }
    }

    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.sendSignalingMessage({
                type: 'offer',
                offer: offer,
            });
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    }

    async handleOffer(offer) {
        try {
            if (!this.isInitiator) {
                await this.peerConnection.setRemoteDescription(offer);
                
                // Create data channel if not initiator
                this.peerConnection.ondatachannel = (event) => {
                    this.dataChannel = event.channel;
                    this.setupDataChannelHandlers();
                };
                
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                
                this.sendSignalingMessage({
                    type: 'answer',
                    answer: answer,
                });
            }
        } catch (error) {
            console.error('Failed to handle offer:', error);
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Failed to handle answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Failed to handle ICE candidate:', error);
        }
    }

    sendSignalingMessage(message) {
        if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
            this.signalingSocket.send(JSON.stringify(message));
        }
    }

    sendDataChannelMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }

    async addStream(stream) {
        if (!this.peerConnection) return;
        
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });
    }

    async removeStream(stream) {
        if (!this.peerConnection) return;
        
        const senders = this.peerConnection.getSenders();
        senders.forEach(sender => {
            if (sender.track && stream.getTracks().includes(sender.track)) {
                this.peerConnection.removeTrack(sender);
            }
        });
    }

    cleanup() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.signalingSocket) {
            this.signalingSocket.close();
            this.signalingSocket = null;
        }

        setConnectionStatus(false, false);
        setRemoteStream(null);
    }
}

export function createWebRTCManager() {
    return new WebRTCManager();
}

// Utility functions for media devices
export async function getMediaDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInput: devices.filter(device => device.kind === 'audioinput'),
            videoInput: devices.filter(device => device.kind === 'videoinput'),
            audioOutput: devices.filter(device => device.kind === 'audiooutput'),
        };
    } catch (error) {
        console.error('Failed to get media devices:', error);
        return { audioInput: [], videoInput: [], audioOutput: [] };
    }
}

export async function getUserMedia(constraints = { audio: true, video: false }) {
    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        console.error('Failed to get user media:', error);
        throw error;
    }
}

export async function getDisplayMedia() {
    try {
        return await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });
    } catch (error) {
        console.error('Failed to get display media:', error);
        throw error;
    }
}

export function stopMediaStream(stream) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}